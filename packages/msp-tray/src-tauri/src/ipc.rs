#![allow(dead_code)]

use chrono::Utc;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::sync::Mutex;
use sysinfo::{Disks, System};
use uuid::Uuid;

pub const PIPE_NAME: &str = r"\\.\pipe\msp-agent-ipc";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcEnvelope<T> {
    pub id: String,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub timestamp: String,
    pub payload: T,
}

impl<T> IpcEnvelope<T> {
    pub fn new(msg_type: &str, payload: T) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            msg_type: msg_type.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            payload,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatusPayload {
    #[serde(rename = "agentOnline")]
    pub agent_online: bool,
    #[serde(rename = "cloudConnected")]
    pub cloud_connected: bool,
    #[serde(rename = "equipmentId")]
    pub equipment_id: Option<String>,
    pub hostname: String,
    #[serde(rename = "tenantName")]
    pub tenant_name: Option<String>,
    #[serde(rename = "activeTicketCount")]
    pub active_ticket_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTicketPayload {
    #[serde(rename = "reporterName")]
    pub reporter_name: String,
    #[serde(rename = "reporterEmail")]
    pub reporter_email: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub priority: String,
    #[serde(rename = "screenshotBase64")]
    pub screenshot_base64: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTicketResponsePayload {
    pub success: bool,
    #[serde(rename = "ticketId")]
    pub ticket_id: String,
    pub title: String,
    #[serde(rename = "assignedTechName")]
    pub assigned_tech_name: Option<String>,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketChatPushPayload {
    #[serde(rename = "ticketId")]
    pub ticket_id: String,
    #[serde(rename = "responseId")]
    pub response_id: String,
    #[serde(rename = "authorName")]
    pub author_name: String,
    #[serde(rename = "authorRole")]
    pub author_role: String,
    pub message: String,
    #[serde(default)]
    pub attachments: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketChatSendPayload {
    #[serde(rename = "ticketId")]
    pub ticket_id: String,
    #[serde(rename = "reporterName")]
    pub reporter_name: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemVitals {
    #[serde(rename = "cpuPercent")]
    pub cpu_percent: f32,
    #[serde(rename = "memoryUsedMb")]
    pub memory_used_mb: u64,
    #[serde(rename = "memoryTotalMb")]
    pub memory_total_mb: u64,
    #[serde(rename = "memoryPercent")]
    pub memory_percent: f32,
    #[serde(rename = "diskUsedGb")]
    pub disk_used_gb: f64,
    #[serde(rename = "diskTotalGb")]
    pub disk_total_gb: f64,
    #[serde(rename = "diskPercent")]
    pub disk_percent: f32,
    #[serde(rename = "uptimeSeconds")]
    pub uptime_seconds: u64,
    #[serde(rename = "osName")]
    pub os_name: String,
    pub hostname: String,
}

pub struct SystemSampler {
    sys: Mutex<System>,
}

impl SystemSampler {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        Self {
            sys: Mutex::new(sys),
        }
    }

    pub fn sample_vitals(&self) -> SystemVitals {
        let mut sys = self.sys.lock().unwrap();
        sys.refresh_cpu_all();
        sys.refresh_memory();

        let cpu_percent = sys.global_cpu_usage();
        let total_mem = sys.total_memory() / (1024 * 1024);
        let used_mem = sys.used_memory() / (1024 * 1024);
        let mem_percent = if total_mem > 0 {
            (used_mem as f32 / total_mem as f32) * 100.0
        } else {
            0.0
        };

        let disks = Disks::new_with_refreshed_list();
        let mut total_disk_bytes: u64 = 0;
        let mut available_disk_bytes: u64 = 0;

        for disk in &disks {
            total_disk_bytes += disk.total_space();
            available_disk_bytes += disk.available_space();
        }

        let total_disk_gb = total_disk_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
        let used_disk_gb =
            (total_disk_bytes.saturating_sub(available_disk_bytes)) as f64 / (1024.0 * 1024.0 * 1024.0);
        let disk_percent = if total_disk_gb > 0.0 {
            (used_disk_gb / total_disk_gb) * 100.0
        } else {
            0.0
        };

        let uptime = System::uptime();
        let os_name = System::long_os_version().unwrap_or_else(|| "Windows".to_string());
        let hostname = System::host_name().unwrap_or_else(|| "WORKSTATION".to_string());

        SystemVitals {
            cpu_percent,
            memory_used_mb: used_mem,
            memory_total_mb: total_mem,
            memory_percent: mem_percent,
            disk_used_gb: (used_disk_gb * 10.0).round() / 10.0,
            disk_total_gb: (total_disk_gb * 10.0).round() / 10.0,
            disk_percent: (disk_percent * 10.0).round() as f32 / 10.0,
            uptime_seconds: uptime,
            os_name,
            hostname,
        }
    }
}

/// Helper to serialize an IPC frame with 4-byte big-endian length prefix
pub fn encode_frame<T: Serialize>(envelope: &IpcEnvelope<T>) -> Result<Vec<u8>, String> {
    let json_bytes = serde_json::to_vec(envelope).map_err(|e| e.to_string())?;
    let len = json_bytes.len() as u32;
    let mut frame = Vec::with_capacity(4 + json_bytes.len());
    frame.extend_from_slice(&len.to_be_bytes());
    frame.extend_from_slice(&json_bytes);
    Ok(frame)
}

/// Helper to deserialize an IPC frame given payload bytes
pub fn decode_frame<T: DeserializeOwned>(bytes: &[u8]) -> Result<IpcEnvelope<T>, String> {
    if bytes.len() < 4 {
        return Err("Frame too short for length prefix".to_string());
    }
    let payload = &bytes[4..];
    serde_json::from_slice(payload).map_err(|e| e.to_string())
}
