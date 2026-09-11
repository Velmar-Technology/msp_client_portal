#![allow(dead_code)]

use chrono::Utc;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{atomic::AtomicBool, Arc, Mutex};
use sysinfo::{Disks, System};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::windows::named_pipe::ClientOptions;
use tokio::sync::{mpsc, oneshot, Mutex as TokioMutex};
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
    #[serde(rename = "isBound", default = "default_bound_true")]
    pub is_bound: bool,
    #[serde(rename = "pairingCode", default)]
    pub pairing_code: Option<String>,
    #[serde(rename = "pairingCodeExpiresAt", default)]
    pub pairing_code_expires_at: Option<String>,
}

fn default_bound_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveTicketState {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    pub status: String,
    #[serde(default)]
    pub priority: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(rename = "assignedTechName", alias = "assigned_tech_name", default)]
    pub assigned_tech_name: Option<String>,
    #[serde(rename = "createdAt", alias = "created_at", default)]
    pub created_at: String,
    #[serde(rename = "updatedAt", alias = "updated_at", default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketMessageItem {
    pub id: String,
    #[serde(rename = "authorName", alias = "author_name", default)]
    pub author_name: String,
    #[serde(rename = "authorRole", alias = "author_role", default)]
    pub author_role: String,
    pub message: String,
    #[serde(default)]
    pub attachments: Vec<String>,
    #[serde(rename = "createdAt", alias = "created_at", default)]
    pub created_at: String,
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

// ---------------------------------------------------------------------------
// IPC Client Implementation
// ---------------------------------------------------------------------------

struct OutboundRequest {
    id: String,
    bytes: Vec<u8>,
    response_sender: oneshot::Sender<Result<serde_json::Value, String>>,
}

type PendingMap = Arc<TokioMutex<HashMap<String, oneshot::Sender<Result<serde_json::Value, String>>>>>;

#[derive(Clone)]
pub struct IpcClient {
    request_tx: mpsc::Sender<OutboundRequest>,
    connected: Arc<AtomicBool>,
}

impl IpcClient {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let (request_tx, mut request_rx) = mpsc::channel::<OutboundRequest>(64);
        let connected = Arc::new(AtomicBool::new(false));
        let connected_flag = connected.clone();

        tauri::async_runtime::spawn(async move {
            loop {
                log::info!("[MSP-TRAY IPC] Attempting connection to named pipe: {}", PIPE_NAME);
                let pipe = match ClientOptions::new().open(PIPE_NAME) {
                    Ok(p) => {
                        log::info!("[MSP-TRAY IPC] Connected to named pipe: {}", PIPE_NAME);
                        connected_flag.store(true, std::sync::atomic::Ordering::SeqCst);
                        p
                    }
                    Err(err) => {
                        log::debug!("[MSP-TRAY IPC] Pipe connection pending: {}", err);
                        connected_flag.store(false, std::sync::atomic::Ordering::SeqCst);
                        tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
                        continue;
                    }
                };

                let (mut reader, mut writer) = tokio::io::split(pipe);
                let pending: PendingMap = Arc::new(TokioMutex::new(HashMap::new()));
                let pending_for_reader = pending.clone();
                let app_handle_for_reader = app_handle.clone();

                let (disconnect_tx, mut disconnect_rx) = tokio::sync::broadcast::channel::<()>(1);
                let disconnect_tx_reader = disconnect_tx.clone();

                // Reader loop task
                let reader_task = tauri::async_runtime::spawn(async move {
                    loop {
                        let mut len_buf = [0u8; 4];
                        if reader.read_exact(&mut len_buf).await.is_err() {
                            log::warn!("[MSP-TRAY IPC] Named pipe reader disconnected (read_exact len failed)");
                            break;
                        }
                        let len = u32::from_be_bytes(len_buf) as usize;
                        if len > 10 * 1024 * 1024 {
                            log::warn!("[MSP-TRAY IPC] Frame size too large ({} bytes)", len);
                            break;
                        }

                        let mut payload_buf = vec![0u8; len];
                        if reader.read_exact(&mut payload_buf).await.is_err() {
                            log::warn!("[MSP-TRAY IPC] Named pipe reader disconnected (read_exact payload failed)");
                            break;
                        }

                        match serde_json::from_slice::<IpcEnvelope<serde_json::Value>>(&payload_buf) {
                            Ok(envelope) => {
                                if envelope.msg_type.eq_ignore_ascii_case("TICKET_CHAT_PUSH") {
                                    use tauri::Emitter;
                                    log::info!("[MSP-TRAY IPC] Received TICKET_CHAT_PUSH, broadcasting to webview");
                                    let _ = app_handle_for_reader.emit("ticket_chat_push", &envelope.payload);
                                } else if envelope.msg_type.eq_ignore_ascii_case("AGENT_BOUND") {
                                    use tauri::Emitter;
                                    log::info!("[MSP-TRAY IPC] Received AGENT_BOUND push, broadcasting agent://bound");
                                    let _ = app_handle_for_reader.emit("agent://bound", &envelope.payload);
                                } else if envelope.msg_type.eq_ignore_ascii_case("AGENT_UNBOUND") {
                                    use tauri::Emitter;
                                    log::info!("[MSP-TRAY IPC] Received AGENT_UNBOUND push, broadcasting agent://unbound");
                                    let _ = app_handle_for_reader.emit("agent://unbound", &envelope.payload);
                                } else {
                                    let mut p = pending_for_reader.lock().await;
                                    if let Some(resp_tx) = p.remove(&envelope.id) {
                                        if envelope.msg_type == "ERROR" {
                                            let err_msg = envelope
                                                .payload
                                                .get("error")
                                                .and_then(|v| v.as_str())
                                                .unwrap_or("IPC request returned error")
                                                .to_string();
                                            let _ = resp_tx.send(Err(err_msg));
                                        } else {
                                            let _ = resp_tx.send(Ok(envelope.payload));
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                log::warn!("[MSP-TRAY IPC] Failed to deserialize envelope: {}", e);
                            }
                        }
                    }
                    let _ = disconnect_tx_reader.send(());
                });

                // Writer loop
                loop {
                    tokio::select! {
                        _ = disconnect_rx.recv() => {
                            log::warn!("[MSP-TRAY IPC] Disconnect notification received from reader");
                            break;
                        }
                        maybe_req = request_rx.recv() => {
                            match maybe_req {
                                Some(outbound) => {
                                    {
                                        let mut p = pending.lock().await;
                                        p.insert(outbound.id, outbound.response_sender);
                                    }
                                    if let Err(e) = writer.write_all(&outbound.bytes).await {
                                        log::warn!("[MSP-TRAY IPC] Pipe write error: {}", e);
                                        break;
                                    }
                                    if let Err(e) = writer.flush().await {
                                        log::warn!("[MSP-TRAY IPC] Pipe flush error: {}", e);
                                        break;
                                    }
                                }
                                None => {
                                    log::warn!("[MSP-TRAY IPC] Request channel dropped, shutting down writer");
                                    return;
                                }
                            }
                        }
                    }
                }

                // Handle pipe tear-down & cleanup
                connected_flag.store(false, std::sync::atomic::Ordering::SeqCst);
                reader_task.abort();
                {
                    let mut p = pending.lock().await;
                    for (_, sender) in p.drain() {
                        let _ = sender.send(Err("Named pipe connection closed".to_string()));
                    }
                }

                log::info!("[MSP-TRAY IPC] Pipe session closed, retrying in 1500ms...");
                tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
            }
        });

        Self {
            request_tx,
            connected,
        }
    }

    pub fn is_connected(&self) -> bool {
        self.connected.load(std::sync::atomic::Ordering::SeqCst)
    }

    pub async fn send_request<P: Serialize, R: DeserializeOwned>(
        &self,
        msg_type: &str,
        payload: P,
    ) -> Result<R, String> {
        if !self.is_connected() {
            return Err("MSP Agent service is not connected on named pipe".to_string());
        }

        let envelope = IpcEnvelope::new(msg_type, payload);
        let id = envelope.id.clone();
        let bytes = encode_frame(&envelope)?;

        let (resp_tx, resp_rx) = oneshot::channel();
        let outbound = OutboundRequest {
            id,
            bytes,
            response_sender: resp_tx,
        };

        self.request_tx
            .send(outbound)
            .await
            .map_err(|_| "Failed to send request: IPC channel closed".to_string())?;

        match tokio::time::timeout(tokio::time::Duration::from_secs(12), resp_rx).await {
            Ok(Ok(Ok(val))) => {
                serde_json::from_value(val).map_err(|e| format!("Invalid response schema: {}", e))
            }
            Ok(Ok(Err(err_msg))) => Err(err_msg),
            Ok(Err(_)) => Err("IPC response channel dropped".to_string()),
            Err(_) => Err("IPC request timed out after 12 seconds".to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_and_decode_frame() {
        let envelope = IpcEnvelope::new("TEST_PING", serde_json::json!({ "foo": "bar" }));
        let encoded = encode_frame(&envelope).expect("Failed to encode");
        assert!(encoded.len() > 4);

        let len_prefix = u32::from_be_bytes([encoded[0], encoded[1], encoded[2], encoded[3]]) as usize;
        assert_eq!(len_prefix, encoded.len() - 4);

        let decoded: IpcEnvelope<serde_json::Value> = decode_frame(&encoded).expect("Failed to decode");
        assert_eq!(decoded.msg_type, "TEST_PING");
        assert_eq!(decoded.payload["foo"], "bar");
    }

    #[test]
    fn test_ticket_chat_push_payload_serialization() {
        let push = TicketChatPushPayload {
            ticket_id: "8c79219e-e3be-4971-bf31-0738dca534b1".to_string(),
            response_id: "resp-123".to_string(),
            author_name: "John Technician".to_string(),
            author_role: "ADMIN".to_string(),
            message: "Looking into your network issue now.".to_string(),
            attachments: vec![],
            created_at: Utc::now().to_rfc3339(),
        };

        let envelope = IpcEnvelope::new("TICKET_CHAT_PUSH", push);
        let encoded = encode_frame(&envelope).unwrap();
        let decoded: IpcEnvelope<TicketChatPushPayload> = decode_frame(&encoded).unwrap();

        assert_eq!(decoded.msg_type, "TICKET_CHAT_PUSH");
        assert_eq!(decoded.payload.ticket_id, "8c79219e-e3be-4971-bf31-0738dca534b1");
        assert_eq!(decoded.payload.author_name, "John Technician");
    }
}
