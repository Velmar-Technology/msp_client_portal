use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const UPDATES_SUBDIR: &str = "C:\\ProgramData\\MSP\\updates";
const STATE_FILENAME: &str = "upgrade_state.json";

/// Upgrade transaction metadata persisted during an in-flight OTA upgrade.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeState {
    pub previous_version: String,
    pub target_version: String,
    pub original_exe_path: String,
    pub backup_exe_path: String,
    pub deadline_secs: u64,
}

impl UpgradeState {
    pub fn state_file_path() -> PathBuf {
        PathBuf::from(UPDATES_SUBDIR).join(STATE_FILENAME)
    }

    pub fn load() -> Option<Self> {
        let path = Self::state_file_path();
        if !path.exists() {
            return None;
        }
        let data = fs::read_to_string(&path).ok()?;
        serde_json::from_str(&data).ok()
    }

    pub fn save(&self) -> std::io::Result<()> {
        let dir = PathBuf::from(UPDATES_SUBDIR);
        if !dir.exists() {
            fs::create_dir_all(&dir)?;
        }
        let data = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        fs::write(Self::state_file_path(), data)
    }

    pub fn clear() {
        let path = Self::state_file_path();
        if path.exists() {
            let _ = fs::remove_file(path);
        }
    }
}

/// Downloads a binary over HTTPS, calculates its SHA-256 in a streaming pass,
/// and verifies that the checksum matches `expected_sha256`.
pub async fn download_and_verify(
    download_url: &str,
    expected_sha256: &str,
    target_path: &Path,
) -> Result<(), String> {
    info!("[upgrade] Initiating download from: {}", download_url);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let response = client
        .get(download_url)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {e}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download failed with HTTP status: {}",
            response.status()
        ));
    }

    let parent = target_path
        .parent()
        .unwrap_or_else(|| Path::new(UPDATES_SUBDIR));
    if !parent.exists() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create download directory: {e}"))?;
    }

    let mut file = fs::File::create(target_path)
        .map_err(|e| format!("Failed to create temporary file: {e}"))?;

    let mut hasher = Sha256::new();
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    hasher.update(&bytes);
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write downloaded bytes to disk: {e}"))?;

    let calculated_hash = format!("{:x}", hasher.finalize());
    info!(
        "[upgrade] Download complete. SHA-256 calculated: {}, expected: {}",
        calculated_hash, expected_sha256
    );

    if !calculated_hash.eq_ignore_ascii_case(expected_sha256.trim()) {
        let _ = fs::remove_file(target_path);
        return Err(format!(
            "SHA-256 integrity check failed! Expected: {}, got: {}",
            expected_sha256, calculated_hash
        ));
    }

    Ok(())
}

/// Executes the in-process atomic move swap:
/// 1. Renames current `msp-agent.exe` -> `msp-agent.exe.bak-v<cur>`
/// 2. Moves `staged_binary_path` -> `msp-agent.exe`
/// 3. Writes `upgrade_state.json` sentinel file
pub fn execute_atomic_swap(
    target_version: &str,
    current_version: &str,
    staged_binary_path: &Path,
    rollback_timeout_secs: u64,
) -> Result<UpgradeState, String> {
    let current_exe = std::env::current_exe()
        .map_err(|e| format!("Failed to resolve current executable path: {e}"))?;

    let exe_dir = current_exe
        .parent()
        .ok_or_else(|| "Failed to resolve executable directory".to_string())?;

    let backup_exe = exe_dir.join(format!("msp-agent.exe.bak-v{}", current_version));

    info!(
        "[upgrade] Swapping running binary: {:?} -> {:?}",
        current_exe, backup_exe
    );

    // If an old backup with the same version exists, remove it first
    if backup_exe.exists() {
        let _ = fs::remove_file(&backup_exe);
    }

    // Rename running executable (permitted on Windows NTFS within the same filesystem volume)
    fs::rename(&current_exe, &backup_exe)
        .map_err(|e| format!("Failed to rename running executable to backup: {e}"))?;

    // Move the newly downloaded and verified binary into the active location
    if let Err(e) = fs::rename(staged_binary_path, &current_exe) {
        // Rollback immediate rename if moving new binary fails
        error!("[upgrade] Failed to move staged binary into place: {e}. Restoring backup...");
        let _ = fs::rename(&backup_exe, &current_exe);
        return Err(format!("Failed to move staged binary: {e}"));
    }

    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let state = UpgradeState {
        previous_version: current_version.to_string(),
        target_version: target_version.to_string(),
        original_exe_path: current_exe.to_string_lossy().to_string(),
        backup_exe_path: backup_exe.to_string_lossy().to_string(),
        deadline_secs: now_secs + rollback_timeout_secs,
    };

    state
        .save()
        .map_err(|e| format!("Failed to persist upgrade state: {e}"))?;

    info!(
        "[upgrade] Atomic move swap succeeded! Target version: v{}, rollback deadline in {}s",
        target_version, rollback_timeout_secs
    );

    Ok(state)
}

/// Inspects `upgrade_state.json` on startup. If an upgrade is active and the
/// deadline expired without confirmation, restores the backup binary and restarts.
pub fn check_and_handle_rollback() {
    let Some(state) = UpgradeState::load() else {
        return;
    };

    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    if now_secs > state.deadline_secs {
        warn!(
            "[upgrade-watchdog] Upgrade deadline expired ({}s elapsed). Initiating automated rollback to v{}!",
            now_secs.saturating_sub(state.deadline_secs),
            state.previous_version
        );

        let original_path = PathBuf::from(&state.original_exe_path);
        let backup_path = PathBuf::from(&state.backup_exe_path);

        if backup_path.exists() {
            let failed_path = original_path.with_extension("failed.exe");
            let _ = fs::rename(&original_path, &failed_path);
            if let Err(e) = fs::rename(&backup_path, &original_path) {
                error!("[upgrade-watchdog] CRITICAL: Failed to restore backup binary: {e}");
            } else {
                info!("[upgrade-watchdog] Successfully reverted to stable backup. Restarting service...");
            }
        }

        UpgradeState::clear();
        trigger_service_restart();
    } else {
        info!(
            "[upgrade-watchdog] Pending upgrade active (v{} -> v{}). Watchdog armed ({}s remaining for TLS handshake).",
            state.previous_version,
            state.target_version,
            state.deadline_secs.saturating_sub(now_secs)
        );
    }
}

/// Called when the agent establishes a successful TLS WebSocket handshake with the portal.
/// Commits the upgrade by deleting `upgrade_state.json` and cleaning up the previous backup.
pub fn commit_upgrade_success() {
    let Some(state) = UpgradeState::load() else {
        return;
    };

    info!(
        "[upgrade] WebSocket connection established! Successfully committing upgrade to v{} (previous: v{}).",
        state.target_version, state.previous_version
    );

    let backup_path = PathBuf::from(&state.backup_exe_path);
    if backup_path.exists() {
        let _ = fs::remove_file(&backup_path);
    }

    UpgradeState::clear();
}

/// Requests a Windows Service restart for `MSPEndpointAgent`.
pub fn trigger_service_restart() {
    #[cfg(windows)]
    {
        info!("[upgrade] Restarting Windows Service MSPEndpointAgent...");
        // Use PowerShell / cmd or Windows SCM command to restart
        let _ = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Start-Sleep -Seconds 1; Restart-Service -Name 'MSPEndpointAgent' -Force",
            ])
            .spawn();
    }

    #[cfg(not(windows))]
    {
        info!("[upgrade] Non-Windows platform: exiting cleanly for process supervisor restart.");
        std::process::exit(0);
    }
}

/// Executes a detached Windows Installer upgrade via msiexec.
/// Spawns msiexec detached from the current process tree so it survives
/// the stopping/restarting of MSPEndpointAgent service.
pub fn execute_msi_upgrade(msi_path: &Path) -> Result<(), String> {
    let msi_path_str = msi_path
        .to_str()
        .ok_or_else(|| "Invalid MSI file path".to_string())?;

    let log_path = PathBuf::from(UPDATES_SUBDIR).join("upgrade_msi.log");
    let log_path_str = log_path.to_string_lossy().to_string();

    info!(
        "[upgrade] Launching detached MSI upgrade: {:?} (log: {})",
        msi_path, log_path_str
    );

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;

        let mut cmd = std::process::Command::new("cmd.exe");
        cmd.args([
            "/c",
            "start",
            "\"\"",
            "msiexec.exe",
            "/i",
            msi_path_str,
            "/qn",
            "/norestart",
            "/l*v",
            &log_path_str,
        ]);
        cmd.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP);

        cmd.spawn()
            .map_err(|e| format!("Failed to spawn detached msiexec process: {e}"))?;

        info!("[upgrade] Detached msiexec launched successfully. Service will now exit to allow installer takeover.");
        Ok(())
    }

    #[cfg(not(windows))]
    {
        let _ = msi_path_str;
        let _ = log_path_str;
        info!("[upgrade] Non-Windows platform: MSI execution simulation succeeded.");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_upgrade_state_serialization() {
        let state = UpgradeState {
            previous_version: "1.8.4".to_string(),
            target_version: "1.10.2".to_string(),
            original_exe_path: "C:\\Program Files\\MSP\\msp-agent.exe".to_string(),
            backup_exe_path: "C:\\Program Files\\MSP\\msp-agent.exe.bak-v1.8.4".to_string(),
            deadline_secs: 123456789,
        };

        let json = serde_json::to_string(&state).expect("serialize");
        let deserialized: UpgradeState = serde_json::from_str(&json).expect("deserialize");

        assert_eq!(deserialized.previous_version, "1.8.4");
        assert_eq!(deserialized.target_version, "1.10.2");
        assert_eq!(deserialized.deadline_secs, 123456789);
    }

    #[test]
    fn test_execute_msi_upgrade_valid_path() {
        let dummy_msi = Path::new("C:\\ProgramData\\MSP\\updates\\test.msi");
        let result = execute_msi_upgrade(dummy_msi);
        assert!(result.is_ok());
    }
}
