use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub const DEFAULT_MAX_LOG_BYTES: u64 = 5 * 1024 * 1024; // 5 MB
pub const DEFAULT_MAX_BACKUPS: usize = 3;

/// Returns the path to the persistent log file for msp-tray.
/// Resolution priority:
/// 1. `MSP_TRAY_LOG` environment variable (if specified).
/// 2. `%LOCALAPPDATA%\MSP\logs\msp-tray.log` on Windows.
/// 3. Fallback to `<current_dir>/logs/msp-tray.log`.
pub fn log_file_path() -> PathBuf {
    if let Ok(over) = std::env::var("MSP_TRAY_LOG") {
        if !over.trim().is_empty() {
            let pb = PathBuf::from(over.trim());
            if let Some(parent) = pb.parent() {
                let _ = fs::create_dir_all(parent);
            }
            return pb;
        }
    }

    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        if !local_app_data.trim().is_empty() {
            let log_dir = PathBuf::from(local_app_data.trim()).join("MSP").join("logs");
            let _ = fs::create_dir_all(&log_dir);
            return log_dir.join("msp-tray.log");
        }
    }

    let fallback_dir = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("logs");
    let _ = fs::create_dir_all(&fallback_dir);
    fallback_dir.join("msp-tray.log")
}

/// Redacts sensitive information like pairing codes, bearer tokens, and passwords
/// before writing to persistent log files.
pub fn redact_sensitive_content(text: &str) -> String {
    let mut sanitized = text.to_string();

    // Redact Bearer / JWT tokens
    if sanitized.contains("Bearer ") {
        let parts: Vec<&str> = sanitized.split("Bearer ").collect();
        let mut reconstructed = parts[0].to_string();
        for part in &parts[1..] {
            reconstructed.push_str("Bearer ");
            // Skip until next whitespace or quote or comma
            let end_idx = part
                .find(|c: char| c.is_whitespace() || c == '"' || c == '\'' || c == ',')
                .unwrap_or(part.len());
            reconstructed.push_str("[REDACTED]");
            reconstructed.push_str(&part[end_idx..]);
        }
        sanitized = reconstructed;
    }

    // Redact pairing codes: e.g. "pairingCode": "ABC123" or "pairing_code": "ABC123"
    let pairing_keys = ["\"pairingCode\":", "\"pairing_code\":", "pairingCode:", "pairing_code:"];
    for key in &pairing_keys {
        if let Some(mut pos) = sanitized.find(key) {
            while pos < sanitized.len() {
                if let Some(kpos) = sanitized[pos..].find(key) {
                    let start = pos + kpos + key.len();
                    let rest = &sanitized[start..];
                    // Skip spaces and quotes
                    let val_start = rest.find(|c: char| c.is_alphanumeric()).unwrap_or(0);
                    let val_end = rest[val_start..]
                        .find(|c: char| !c.is_alphanumeric())
                        .unwrap_or(rest.len() - val_start);
                    let code_len = val_end;
                    if code_len >= 4 && code_len <= 10 {
                        let before = &sanitized[..start + val_start];
                        let after = &sanitized[start + val_start + code_len..];
                        sanitized = format!("{}{}{}", before, "[REDACTED]", after);
                    }
                    pos = start + val_start + 10;
                } else {
                    break;
                }
            }
        }
    }

    // Redact password fields in json
    let password_keys = ["\"password\":", "\"secret\":", "password:", "secret:"];
    for key in &password_keys {
        if sanitized.contains(key) {
            let mut result = String::with_capacity(sanitized.len());
            let mut last_idx = 0;
            while let Some(kpos) = sanitized[last_idx..].find(key) {
                let key_start = last_idx + kpos;
                let key_end = key_start + key.len();
                result.push_str(&sanitized[last_idx..key_end]);

                let rest = &sanitized[key_end..];
                if let Some(first_quote) = rest.find('"') {
                    let after_first = &rest[first_quote + 1..];
                    if let Some(second_quote) = after_first.find('"') {
                        result.push_str(" \"[REDACTED]\"");
                        last_idx = key_end + first_quote + 1 + second_quote + 1;
                        continue;
                    }
                }
                last_idx = key_end;
            }
            result.push_str(&sanitized[last_idx..]);
            sanitized = result;
        }
    }

    sanitized
}

/// Rolling file writer with configurable size threshold and backup generation count.
pub struct RollingFileWriter {
    pub file_path: PathBuf,
    pub max_bytes: u64,
    pub max_backups: usize,
    inner: Mutex<RollingInner>,
}

struct RollingInner {
    file: Option<File>,
    current_size: u64,
}

impl RollingFileWriter {
    pub fn new(file_path: PathBuf, max_bytes: u64, max_backups: usize) -> Self {
        if let Some(parent) = file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let (file, size) = Self::open_file_and_get_size(&file_path);

        Self {
            file_path,
            max_bytes,
            max_backups,
            inner: Mutex::new(RollingInner {
                file,
                current_size: size,
            }),
        }
    }

    fn open_file_and_get_size(path: &Path) -> (Option<File>, u64) {
        match OpenOptions::new().create(true).append(true).open(path) {
            Ok(f) => {
                let size = f.metadata().map(|m| m.len()).unwrap_or(0);
                (Some(f), size)
            }
            Err(_) => (None, 0),
        }
    }

    /// Performs log file rotation:
    /// log.N -> removed
    /// log.(N-1) -> log.N
    /// log -> log.1
    /// new log opened
    pub fn rotate(path: &Path, max_backups: usize) -> (Option<File>, u64) {
        let path_str = path.to_string_lossy().to_string();

        for i in (1..=max_backups).rev() {
            let current = format!("{}.{}", path_str, i);
            if i == max_backups {
                if Path::new(&current).exists() {
                    let _ = fs::remove_file(&current);
                }
            } else {
                let next = format!("{}.{}", path_str, i + 1);
                if Path::new(&current).exists() {
                    let _ = fs::rename(&current, &next);
                }
            }
        }

        let first_backup = format!("{}.1", path_str);
        if path.exists() {
            let _ = fs::rename(path, &first_backup);
        }

        Self::open_file_and_get_size(path)
    }

    pub fn write_formatted(&self, raw_bytes: &[u8]) -> io::Result<usize> {
        // Output to stdout for development / console view
        let _ = io::stdout().write_all(raw_bytes);

        let sanitized_str = match std::str::from_utf8(raw_bytes) {
            Ok(s) => redact_sensitive_content(s),
            Err(_) => String::from_utf8_lossy(raw_bytes).to_string(),
        };
        let bytes_to_write = sanitized_str.as_bytes();

        let mut inner = self.inner.lock().unwrap();

        if inner.current_size + (bytes_to_write.len() as u64) > self.max_bytes {
            // Drop existing file handle before renaming on Windows
            inner.file = None;
            let (new_file, new_size) = Self::rotate(&self.file_path, self.max_backups);
            inner.file = new_file;
            inner.current_size = new_size;
        }

        if let Some(ref mut f) = inner.file {
            f.write_all(bytes_to_write)?;
            let _ = f.flush();
            inner.current_size += bytes_to_write.len() as u64;
        }

        Ok(raw_bytes.len())
    }
}

impl io::Write for RollingFileWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        self.write_formatted(buf)
    }

    fn flush(&mut self) -> io::Result<()> {
        let mut inner = self.inner.lock().unwrap();
        if let Some(ref mut f) = inner.file {
            let _ = f.flush();
        }
        let _ = io::stdout().flush();
        Ok(())
    }
}

/// Initializes global logging for msp-tray.
pub fn init_logger() {
    let log_path = log_file_path();
    let writer = RollingFileWriter::new(log_path, DEFAULT_MAX_LOG_BYTES, DEFAULT_MAX_BACKUPS);

    let _ = env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format(|buf, record| {
            let local_time = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S%:z");
            writeln!(
                buf,
                "[{} {:5} {}] {}",
                local_time,
                record.level(),
                record.target(),
                record.args()
            )
        })
        .target(env_logger::Target::Pipe(Box::new(writer)))
        .try_init();

    log::info!(
        "[MSP-TRAY] Initialized persistent rolling logger at: {:?}",
        log_file_path()
    );
}

/// Metadata information about the current msp-tray log file.
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct TrayLogInfo {
    pub path: String,
    pub exists: bool,
    pub size_bytes: u64,
    pub directory: String,
}

pub fn get_tray_log_info() -> TrayLogInfo {
    let path = log_file_path();
    let exists = path.exists();
    let size_bytes = if exists {
        fs::metadata(&path).map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };
    let directory = path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    TrayLogInfo {
        path: path.to_string_lossy().to_string(),
        exists,
        size_bytes,
        directory,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redact_sensitive_content() {
        let raw = r#"{"pairingCode": "XYZ987", "token": "Bearer secret-token-value-12345", "status": "ok"}"#;
        let sanitized = redact_sensitive_content(raw);
        assert!(!sanitized.contains("XYZ987"));
        assert!(!sanitized.contains("secret-token-value-12345"));
        assert!(sanitized.contains("[REDACTED]"));
        assert!(sanitized.contains("\"status\": \"ok\""));
    }

    #[test]
    fn test_redact_password() {
        let raw = r#"Connecting with "password": "SuperSecretPassword!" to server"#;
        let sanitized = redact_sensitive_content(raw);
        assert!(!sanitized.contains("SuperSecretPassword!"));
        assert!(sanitized.contains("[REDACTED]"));
    }

    #[test]
    fn test_rolling_file_rotation() {
        let temp_dir = std::env::temp_dir().join(format!("msp_tray_test_{}", uuid::Uuid::new_v4()));
        let log_file = temp_dir.join("test.log");

        // Set low limit for testing rotation: 50 bytes, 2 backups
        let writer = RollingFileWriter::new(log_file.clone(), 50, 2);

        // Write first chunk (30 bytes)
        let _ = writer.write_formatted(b"Chunk 1: 01234567890123456789\n");
        assert!(log_file.exists());

        // Write second chunk (30 bytes, total 60 bytes > 50 bytes limit -> rotation happens)
        let _ = writer.write_formatted(b"Chunk 2: 01234567890123456789\n");

        let backup_1 = temp_dir.join("test.log.1");
        assert!(backup_1.exists(), "Backup .1 must exist after rotation");

        // Write third chunk (causes another rotation)
        let _ = writer.write_formatted(b"Chunk 3: 01234567890123456789\n");
        let backup_2 = temp_dir.join("test.log.2");
        assert!(backup_2.exists(), "Backup .2 must exist after second rotation");

        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_log_file_path_override() {
        let custom = std::env::temp_dir().join("custom_msp_tray.log");
        std::env::set_var("MSP_TRAY_LOG", custom.to_string_lossy().to_string());

        let resolved = log_file_path();
        assert_eq!(resolved, custom);

        std::env::remove_var("MSP_TRAY_LOG");
    }
}
