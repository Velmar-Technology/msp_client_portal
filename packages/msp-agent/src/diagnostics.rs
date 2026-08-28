use serde::{Deserialize, Serialize};
use serde_json::Value;

/// CPU, memory, disk, and network metric snapshot collected from the local system.
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
    pub architecture: String,
    pub uptime_hours: f64,
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub disks: Vec<DiskMetrics>,
    pub network: Vec<NetworkAdapter>,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CpuMetrics {
    pub brand: String,
    pub core_count: usize,
    pub global_usage_pct: f32,
    pub per_core_usage: Vec<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub usage_pct: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiskMetrics {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub usage_pct: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkAdapter {
    pub name: String,
    pub mac_address: String,
    pub received_bytes: u64,
    pub transmitted_bytes: u64,
}

/// Gathers comprehensive hardware, OS, CPU, memory, disk, and network metrics
/// using the `sysinfo` crate. Works on Windows, macOS, and Linux.
pub fn gather_system_metrics() -> Value {
    use sysinfo::{Disks, Networks, System};

    let mut sys = System::new_all();
    sys.refresh_all();

    // Brief pause to allow CPU usage to compute from delta
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_usage();

    let disks = Disks::new_with_refreshed_list();
    let networks = Networks::new_with_refreshed_list();

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown".into());
    let core_count = sys.cpus().len();
    let global_cpu = sys.global_cpu_usage();
    let per_core: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();

    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();
    let free_mem = total_mem.saturating_sub(used_mem);
    let mem_pct = if total_mem > 0 {
        (used_mem as f64 / total_mem as f64) * 100.0
    } else {
        0.0
    };

    let disk_list: Vec<Value> = disks
        .iter()
        .map(|d| {
            let total = d.total_space();
            let available = d.available_space();
            let used = total.saturating_sub(available);
            let usage_pct = if total > 0 {
                (used as f64 / total as f64) * 100.0
            } else {
                0.0
            };
            serde_json::json!({
                "name": d.name().to_string_lossy(),
                "mount_point": d.mount_point().to_string_lossy(),
                "file_system": d.file_system().to_string_lossy(),
                "total_bytes": total,
                "available_bytes": available,
                "used_bytes": used,
                "usage_pct": (usage_pct * 10.0).round() / 10.0
            })
        })
        .collect();

    let net_list: Vec<Value> = networks
        .iter()
        .map(|(name, data)| {
            serde_json::json!({
                "name": name,
                "mac_address": data.mac_address().to_string(),
                "received_bytes": data.total_received(),
                "transmitted_bytes": data.total_transmitted()
            })
        })
        .collect();

    serde_json::json!({
        "hostname": System::host_name().unwrap_or_else(|| "Unknown".into()),
        "os_name": System::name().unwrap_or_else(|| "Unknown".into()),
        "os_version": System::long_os_version().unwrap_or_else(|| "Unknown".into()),
        "architecture": std::env::consts::ARCH,
        "uptime_hours": (System::uptime() as f64 / 3600.0 * 100.0).round() / 100.0,
        "cpu": {
            "brand": cpu_brand,
            "core_count": core_count,
            "global_usage_pct": (global_cpu * 10.0).round() / 10.0,
            "per_core_usage": per_core.iter().map(|v| (v * 10.0).round() / 10.0).collect::<Vec<f32>>()
        },
        "memory": {
            "total_bytes": total_mem,
            "used_bytes": used_mem,
            "free_bytes": free_mem,
            "usage_pct": (mem_pct * 10.0).round() / 10.0
        },
        "disks": disk_list,
        "network": net_list,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

/// Queries Windows Event Logs via PowerShell. Returns structured JSON array
/// of recent error/warning/critical events from the specified log channel.
///
/// Parameters (from payload JSON):
/// - `log_name`: "Application" | "System" (default: "Application")
/// - `level`: "Error" | "Warning" | "Critical" (default: "Error")
/// - `max_events`: 1..20 (default: 5)
pub fn query_event_logs(payload: &Option<Value>) -> Value {
    let log_name = payload
        .as_ref()
        .and_then(|p| p.get("log_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Application");

    let level_str = payload
        .as_ref()
        .and_then(|p| p.get("level"))
        .and_then(|v| v.as_str())
        .unwrap_or("Error");

    let max_events = payload
        .as_ref()
        .and_then(|p| p.get("max_events"))
        .and_then(|v| v.as_u64())
        .unwrap_or(5)
        .min(20)
        .max(1);

    let level_num = match level_str {
        "Critical" => 1,
        "Error" => 2,
        "Warning" => 3,
        _ => 2,
    };

    let ps_command = format!(
        "Get-WinEvent -FilterHashtable @{{LogName='{}'; Level={}}} -MaxEvents {} -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id, ProviderName, @{{Name='MessageSnippet';Expression={{$_.Message.Substring(0, [Math]::Min(300, $_.Message.Length))}}}} | ConvertTo-Json -Compress",
        log_name, level_num, max_events
    );

    match std::process::Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &ps_command])
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if stdout.is_empty() || stdout == "null" {
                return serde_json::json!({
                    "log_name": log_name,
                    "level": level_str,
                    "events": [],
                    "message": format!("No recent {} events found in '{}' log.", level_str, log_name)
                });
            }
            match serde_json::from_str::<Value>(&stdout) {
                Ok(events) => serde_json::json!({
                    "log_name": log_name,
                    "level": level_str,
                    "events": if events.is_array() { events } else { Value::Array(vec![events]) }
                }),
                Err(_) => serde_json::json!({
                    "log_name": log_name,
                    "level": level_str,
                    "events": [],
                    "raw_output": stdout
                }),
            }
        }
        Err(e) => serde_json::json!({
            "error": format!("Failed to execute PowerShell event log query: {}", e),
            "log_name": log_name
        }),
    }
}

/// Audits local security posture: BitLocker encryption, Windows Defender status,
/// Windows Firewall profiles, and pending reboot flags.
pub fn audit_security_posture() -> Value {
    let bitlocker = run_ps_json(
        "Get-BitLockerVolume -MountPoint C: -ErrorAction SilentlyContinue | Select-Object MountPoint, ProtectionStatus, EncryptionPercentage, VolumeStatus | ConvertTo-Json -Compress"
    );

    let defender = run_ps_json(
        "Get-MpComputerStatus -ErrorAction SilentlyContinue | Select-Object RealTimeProtectionEnabled, AntivirusEnabled, AntispywareEnabled, AntivirusSignatureLastUpdated, QuickScanEndTime | ConvertTo-Json -Compress"
    );

    let firewall = run_ps_json(
        "Get-NetFirewallProfile -ErrorAction SilentlyContinue | Select-Object Name, Enabled | ConvertTo-Json -Compress"
    );

    let pending_reboot = run_ps_json(
        "Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending' | ConvertTo-Json -Compress"
    );

    serde_json::json!({
        "bitlocker": bitlocker,
        "defender": defender,
        "firewall": firewall,
        "pending_reboot": pending_reboot,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

/// Restarts a Windows service by name. Returns success/failure status.
pub fn restart_service(payload: &Option<Value>) -> Value {
    let service_name = payload
        .as_ref()
        .and_then(|p| p.get("service_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if service_name.is_empty() {
        return serde_json::json!({ "error": "service_name is required" });
    }

    // Block dangerous service names to prevent abuse
    let blocked = ["WinDefend", "TrustedInstaller", "wuauserv"];
    if blocked.iter().any(|b| b.eq_ignore_ascii_case(service_name)) {
        return serde_json::json!({
            "error": format!("Restarting '{}' is blocked by policy.", service_name)
        });
    }

    let ps_cmd = format!(
        "Restart-Service -Name '{}' -Force -ErrorAction Stop; Get-Service -Name '{}' | Select-Object Name, Status | ConvertTo-Json -Compress",
        service_name, service_name
    );

    match std::process::Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &ps_cmd])
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if !stderr.is_empty() {
                serde_json::json!({
                    "service_name": service_name,
                    "success": false,
                    "error": stderr
                })
            } else {
                let status = serde_json::from_str::<Value>(&stdout).unwrap_or(Value::Null);
                serde_json::json!({
                    "service_name": service_name,
                    "success": true,
                    "status": status
                })
            }
        }
        Err(e) => serde_json::json!({
            "service_name": service_name,
            "success": false,
            "error": format!("Failed to execute restart: {}", e)
        }),
    }
}

/// Inspects all listening TCP ports and their owning processes.
pub fn inspect_open_ports() -> Value {
    run_ps_json(
        "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess, @{Name='ProcessName';Expression={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}} | ConvertTo-Json -Compress"
    )
}

/// Lists startup / autorun programs from registry Run keys.
pub fn list_startup_programs() -> Value {
    run_ps_json(
        "Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue | Select-Object Name, Command, Location, User | ConvertTo-Json -Compress"
    )
}

/// Executes a flush DNS + renew DHCP operation.
pub fn flush_dns_renew_dhcp() -> Value {
    let dns_result = run_ps_text("ipconfig /flushdns");
    let dhcp_result = run_ps_text("ipconfig /renew");

    serde_json::json!({
        "flush_dns": dns_result,
        "renew_dhcp": dhcp_result,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

/// Lists running processes sorted by memory or CPU usage using sysinfo
pub fn list_running_processes(payload: &Option<Value>) -> Value {
    use sysinfo::System;
    let mut sys = System::new_all();
    sys.refresh_all();

    let max_count = payload
        .as_ref()
        .and_then(|p| p.get("limit"))
        .and_then(|v| v.as_u64())
        .unwrap_or(25) as usize;

    let sort_by = payload
        .as_ref()
        .and_then(|p| p.get("sort_by"))
        .and_then(|v| v.as_str())
        .unwrap_or("memory");

    let mut procs: Vec<Value> = sys
        .processes()
        .iter()
        .map(|(pid, proc)| {
            serde_json::json!({
                "pid": pid.as_u32(),
                "name": proc.name().to_string_lossy(),
                "cpu_usage_pct": (proc.cpu_usage() * 10.0).round() / 10.0,
                "memory_bytes": proc.memory(),
                "memory_mb": ((proc.memory() as f64 / (1024.0 * 1024.0)) * 10.0).round() / 10.0,
                "virtual_memory_bytes": proc.virtual_memory(),
                "run_time_secs": proc.run_time(),
            })
        })
        .collect();

    if sort_by == "cpu" {
        procs.sort_by(|a, b| {
            let cpu_b = b.get("cpu_usage_pct").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let cpu_a = a.get("cpu_usage_pct").and_then(|v| v.as_f64()).unwrap_or(0.0);
            cpu_b.partial_cmp(&cpu_a).unwrap_or(std::cmp::Ordering::Equal)
        });
    } else {
        procs.sort_by(|a, b| {
            let mem_b = b.get("memory_bytes").and_then(|v| v.as_u64()).unwrap_or(0);
            let mem_a = a.get("memory_bytes").and_then(|v| v.as_u64()).unwrap_or(0);
            mem_b.cmp(&mem_a)
        });
    }

    procs.truncate(max_count);

    serde_json::json!({
        "total_processes": sys.processes().len(),
        "returned_count": procs.len(),
        "sort_by": sort_by,
        "processes": procs,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

/// Executes a PowerShell command/script on the endpoint and captures stdout/stderr/exit code.
pub fn exec_powershell_script(payload: &Option<Value>) -> Value {
    let script = payload
        .as_ref()
        .and_then(|p| p.get("script"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if script.trim().is_empty() {
        return serde_json::json!({
            "error": "script parameter is required and cannot be empty",
            "success": false
        });
    }

    let start_time = std::time::Instant::now();

    // Determine shell executable: powershell (Windows), pwsh, or sh (Linux container fallback)
    let (shell_cmd, shell_args) = if cfg!(windows) {
        ("powershell", vec!["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script])
    } else {
        // In Linux/Docker environment, prefer pwsh if installed, fallback to sh
        if std::process::Command::new("pwsh").arg("-v").output().is_ok() {
            ("pwsh", vec!["-NoProfile", "-NonInteractive", "-Command", script])
        } else if std::process::Command::new("powershell").arg("-v").output().is_ok() {
            ("powershell", vec!["-NoProfile", "-NonInteractive", "-Command", script])
        } else {
            ("sh", vec!["-c", script])
        }
    };

    match std::process::Command::new(shell_cmd).args(&shell_args).output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let exit_code = output.status.code().unwrap_or(-1);
            let duration_ms = start_time.elapsed().as_millis();

            serde_json::json!({
                "script": script,
                "shell": shell_cmd,
                "exit_code": exit_code,
                "success": output.status.success(),
                "stdout": stdout,
                "stderr": stderr,
                "duration_ms": duration_ms,
                "timestamp": chrono::Utc::now().to_rfc3339()
            })
        }
        Err(e) => {
            let duration_ms = start_time.elapsed().as_millis();
            serde_json::json!({
                "script": script,
                "shell": shell_cmd,
                "exit_code": -1,
                "success": false,
                "error": format!("Failed to launch shell '{}': {}", shell_cmd, e),
                "duration_ms": duration_ms,
                "timestamp": chrono::Utc::now().to_rfc3339()
            })
        }
    }
}

/// Captures the authoritative machine identity: OS hostname, BIOS/system serial
/// number, hardware manufacturer, and system model. This lets the MSP portal
/// reconcile customer-entered device details against the true machine.
///
/// The serial is read via platform-native tooling:
/// - Windows: `Get-CimInstance Win32_BIOS` (falls back to `Win32_ComputerSystemProduct`)
/// - macOS:   the I/O registry `IOPlatformSerialNumber`
/// - Linux:   the DMI `product_serial` sysfs node
pub fn gather_device_identity() -> Value {
    let hostname = sysinfo::System::host_name().unwrap_or_else(|| "Unknown".into());
    serde_json::json!({
        "hostname": hostname,
        "bios_serial": bios_serial(),
        "manufacturer": manufacturer(),
        "system_model": system_model(),
        "collected_at": chrono::Utc::now().to_rfc3339()
    })
}

/// Builds a stable identity payload from raw parts (pure helper, unit-testable).
pub fn identity_payload(
    hostname: impl Into<String>,
    bios_serial: impl Into<String>,
    manufacturer: impl Into<String>,
    system_model: impl Into<String>,
) -> Value {
    serde_json::json!({
        "hostname": hostname.into(),
        "bios_serial": bios_serial.into(),
        "manufacturer": manufacturer.into(),
        "system_model": system_model.into(),
    })
}

/// Reads the hardware BIOS/system serial number as a trimmed string. Empty when
/// unavailable or when the platform reports a vendor placeholder value.
pub fn bios_serial() -> String {
    let mut serial = if cfg!(windows) {
        run_platform_shell(
            "Get-CimInstance -ClassName Win32_BIOS -ErrorAction Stop | Select-Object -ExpandProperty SerialNumber"
        )
    } else if cfg!(target_os = "macos") {
        run_platform_shell(
            "ioreg -l | grep IOPlatformSerialNumber | awk -F'\"' '{print $4}'"
        )
    } else if cfg!(target_os = "linux") {
        run_platform_shell("cat /sys/class/dmi/id/product_serial 2>/dev/null")
    } else {
        String::new()
    };

    if serial.is_empty() && cfg!(windows) {
        serial = run_platform_shell(
            "Get-CimInstance -ClassName Win32_ComputerSystemProduct -ErrorAction SilentlyContinue | Select-Object -ExpandProperty UUID"
        );
    }

    normalize_serial(&serial).unwrap_or_default()
}

/// Reports the hardware manufacturer (Windows only; empty elsewhere).
pub fn manufacturer() -> String {
    if cfg!(windows) {
        run_platform_shell(
            "Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction Stop | Select-Object -ExpandProperty Manufacturer"
        )
    } else {
        String::new()
    }
}

/// Reports the system model name (Windows only; empty elsewhere).
pub fn system_model() -> String {
    if cfg!(windows) {
        run_platform_shell(
            "Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction Stop | Select-Object -ExpandProperty Model"
        )
    } else {
        String::new()
    }
}

/// Filters out vendor placeholder serials (e.g. "To be filled by O.E.M.").
fn normalize_serial(raw: &str) -> Option<String> {
    let value = raw.trim_matches(['\r', '\n', ' ']).trim().to_string();
    let lower = value.to_ascii_lowercase();
    if value.is_empty()
        || lower == "none"
        || lower == "system serial number"
        || lower == "default string"
        || lower.contains("to be filled")
        || lower.contains("o.e.m.")
    {
        None
    } else {
        Some(value)
    }
}

// ── Internal Helpers ──────────────────────────────────────────────────────────

/// Runs a command through the platform shell (PowerShell on Windows, `sh`
/// elsewhere) and returns the trimmed stdout. Returns an empty string on error.
fn run_platform_shell(command: &str) -> String {
    let (cmd, args) = if cfg!(windows) {
        (
            "powershell",
            vec!["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command],
        )
    } else {
        ("sh", vec!["-c", command])
    };
    match std::process::Command::new(cmd).args(&args).output() {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => String::new(),
    }
}

/// Runs a PowerShell command and parses the JSON output. Returns `Value::Null` on failure.
fn run_ps_json(command: &str) -> Value {
    match std::process::Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command])
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            serde_json::from_str(&stdout).unwrap_or(Value::Null)
        }
        Err(_) => Value::Null,
    }
}

/// Runs a PowerShell command and returns raw text output.
fn run_ps_text(command: &str) -> String {
    match std::process::Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command])
        .output()
    {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(e) => format!("Error: {}", e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_payload_includes_all_fields() {
        let payload = identity_payload("SRV-0421", "CN-9XYZ123", "Dell Inc.", "XPS 15");

        assert_eq!(payload["hostname"], "SRV-0421");
        assert_eq!(payload["bios_serial"], "CN-9XYZ123");
        assert_eq!(payload["manufacturer"], "Dell Inc.");
        assert_eq!(payload["system_model"], "XPS 15");
    }

    #[test]
    fn normalize_serial_keeps_real_serials() {
        assert_eq!(
            normalize_serial("  CN-9XYZ123  "),
            Some("CN-9XYZ123".to_string())
        );
        assert_eq!(normalize_serial("System Serial Number"), None);
        assert_eq!(normalize_serial("To be filled by O.E.M."), None);
        assert_eq!(normalize_serial("none"), None);
        assert_eq!(normalize_serial(""), None);
    }
}
