use chrono::Utc;
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicI64, AtomicU32, Ordering};
use std::sync::OnceLock;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::pairing::AgentState;
use crate::AgentConfig;

pub const PIPE_NAME: &str = r"\\.\pipe\msp-agent-ipc";

static BROADCAST_TX: OnceLock<broadcast::Sender<String>> = OnceLock::new();

/// In-memory circuit breaker and exponential backoff manager for endpoint ticket polling.
/// Suppresses rapid HTTP retries when the endpoint is un-paired, unauthorized, or throttled.
struct TicketSyncCircuitBreaker {
    consecutive_failures: AtomicU32,
    next_allowed_time: AtomicI64,
}

impl TicketSyncCircuitBreaker {
    const fn new() -> Self {
        Self {
            consecutive_failures: AtomicU32::new(0),
            next_allowed_time: AtomicI64::new(0),
        }
    }

    /// Evaluates whether an outbound HTTP request is currently permitted.
    fn can_request(&self) -> bool {
        let now = Utc::now().timestamp();
        now >= self.next_allowed_time.load(Ordering::Relaxed)
    }

    /// Resets failure count and clears any pending backoff delay on successful response.
    fn record_success(&self) {
        self.consecutive_failures.store(0, Ordering::Relaxed);
        self.next_allowed_time.store(0, Ordering::Relaxed);
    }

    /// Trips circuit breaker and computes exponential backoff with jitter on error.
    fn record_failure(&self, status_code: Option<u16>) {
        let fails = self.consecutive_failures.fetch_add(1, Ordering::Relaxed) + 1;
        let base_backoff: i64 = match status_code {
            Some(401) | Some(404) => 120, // 2 minutes minimum on auth failure or missing slot
            Some(429) => 300,             // 5 minutes on rate limit hit
            _ => 30,                      // 30 seconds default network backoff
        };
        let shift = fails.min(6).saturating_sub(1);
        let multiplier = 1i64.checked_shl(shift).unwrap_or(32);
        let delay_secs = (base_backoff * multiplier).min(900); // Capped at 15 minutes
        let target_time = Utc::now().timestamp() + delay_secs;
        self.next_allowed_time.store(target_time, Ordering::Relaxed);
        warn!(
            "[IPC Server] Ticket sync circuit breaker tripped (consecutive_failures: {}, backoff: {}s, status: {:?})",
            fails, delay_secs, status_code
        );
    }

    /// Manually resets the circuit breaker upon pairing or explicit user interaction.
    fn reset(&self) {
        self.consecutive_failures.store(0, Ordering::Relaxed);
        self.next_allowed_time.store(0, Ordering::Relaxed);
    }
}

static TICKET_CIRCUIT_BREAKER: TicketSyncCircuitBreaker = TicketSyncCircuitBreaker::new();

pub fn get_broadcast_sender() -> &'static broadcast::Sender<String> {
    BROADCAST_TX.get_or_init(|| {
        let (tx, _) = broadcast::channel(128);
        tx
    })
}

/// Broadcasts a real-time event frame (e.g. ticket_chat_push) down all connected named pipe instances.
pub fn broadcast_push_event(event_type: &str, payload: &Value) {
    let envelope = IpcEnvelope {
        id: Uuid::new_v4().to_string(),
        msg_type: event_type.to_string(),
        timestamp: Utc::now().to_rfc3339(),
        payload: payload.clone(),
    };

    if let Ok(encoded) = serde_json::to_string(&envelope) {
        let _ = get_broadcast_sender().send(encoded);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcEnvelope {
    pub id: String,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub timestamp: String,
    pub payload: Value,
}

impl IpcEnvelope {
    pub fn response(req_id: &str, msg_type: &str, payload: Value) -> Self {
        Self {
            id: req_id.to_string(),
            msg_type: msg_type.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            payload,
        }
    }

    pub fn error(req_id: &str, error_message: &str) -> Self {
        Self {
            id: req_id.to_string(),
            msg_type: "ERROR".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            payload: json!({ "success": false, "error": error_message }),
        }
    }
}

/// Helper to serialize an IPC frame with a 4-byte big-endian length prefix.
pub fn encode_frame(envelope: &IpcEnvelope) -> Result<Vec<u8>, String> {
    let json_bytes = serde_json::to_vec(envelope).map_err(|e| e.to_string())?;
    let len = json_bytes.len() as u32;
    let mut frame = Vec::with_capacity(4 + json_bytes.len());
    frame.extend_from_slice(&len.to_be_bytes());
    frame.extend_from_slice(&json_bytes);
    Ok(frame)
}

/// Helper to parse a backend HTTP URL from agent configuration or environment.
pub fn resolve_backend_http_url(config: &AgentConfig) -> String {
    if let Ok(url) = std::env::var("MSP_BACKEND_URL") {
        let trimmed = url.trim();
        if !trimmed.is_empty() {
            return trimmed.trim_end_matches('/').to_string();
        }
    }
    if let Ok(url) = std::env::var("MSP_SERVER_URL") {
        let trimmed = url.trim();
        if !trimmed.is_empty() {
            let prefixed = if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
                format!("https://{}", trimmed)
            } else {
                trimmed.to_string()
            };
            return prefixed.trim_end_matches('/').to_string();
        }
    }

    let gw = config.gateway_url.trim();
    if gw.starts_with("wss://") {
        let without_proto = &gw["wss://".len()..];
        let host_port = without_proto.split('/').next().unwrap_or("helpdesk.velmartech.com.do");
        format!("https://{}", host_port)
    } else if gw.starts_with("ws://") {
        let without_proto = &gw["ws://".len()..];
        let host_port = without_proto.split('/').next().unwrap_or("localhost:3001");
        format!("http://{}", host_port)
    } else {
        "https://helpdesk.velmartech.com.do".to_string()
    }
}

/// Resolves active agent token for machine-authenticated HTTP calls.
fn resolve_active_token(config: &AgentConfig, state: &AgentState) -> String {
    if !config.agent_token.is_empty() {
        return config.agent_token.clone();
    }
    state.agent_token.clone().unwrap_or_else(|| "dev-token".to_string())
}

#[cfg(windows)]
unsafe fn create_security_attributes() -> Option<*mut std::ffi::c_void> {
    use windows_sys::Win32::Security::Authorization::ConvertStringSecurityDescriptorToSecurityDescriptorW;
    use windows_sys::Win32::Security::{PSECURITY_DESCRIPTOR, SECURITY_ATTRIBUTES};

    // SDDL granting Generic All to Everyone (WD) and Authenticated Users (AU)
    let sddl = widestring::U16CString::from_str("D:(A;;GA;;;WD)").ok()?;
    let mut sd: PSECURITY_DESCRIPTOR = std::ptr::null_mut();
    let success = ConvertStringSecurityDescriptorToSecurityDescriptorW(
        sddl.as_ptr(),
        1, // SDDL_REVISION_1
        &mut sd,
        std::ptr::null_mut(),
    );

    if success != 0 && !sd.is_null() {
        let sa = Box::new(SECURITY_ATTRIBUTES {
            nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
            lpSecurityDescriptor: sd,
            bInheritHandle: 0,
        });
        Some(Box::into_raw(sa) as _)
    } else {
        None
    }
}

#[cfg(windows)]
fn create_named_pipe_instance(first: bool) -> std::io::Result<tokio::net::windows::named_pipe::NamedPipeServer> {
    use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
    use windows_sys::Win32::Security::SECURITY_ATTRIBUTES;
    use windows_sys::Win32::Storage::FileSystem::{FILE_FLAG_FIRST_PIPE_INSTANCE, FILE_FLAG_OVERLAPPED};
    use windows_sys::Win32::System::Pipes::{
        CreateNamedPipeW, PIPE_TYPE_BYTE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
    };

    const PIPE_ACCESS_DUPLEX: u32 = 0x00000003;

    let pipe_name_u16 = widestring::U16CString::from_str(PIPE_NAME)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e.to_string()))?;

    let sa_ptr: *const SECURITY_ATTRIBUTES = match unsafe { create_security_attributes() } {
        Some(ptr) => ptr as _,
        None => std::ptr::null(),
    };

    let mut open_mode = PIPE_ACCESS_DUPLEX | FILE_FLAG_OVERLAPPED;
    if first {
        open_mode |= FILE_FLAG_FIRST_PIPE_INSTANCE;
    }

    let pipe_mode = PIPE_TYPE_BYTE | PIPE_WAIT;

    let handle = unsafe {
        CreateNamedPipeW(
            pipe_name_u16.as_ptr(),
            open_mode,
            pipe_mode,
            PIPE_UNLIMITED_INSTANCES,
            65536,
            65536,
            0,
            sa_ptr,
        )
    };

    if handle != INVALID_HANDLE_VALUE {
        unsafe { tokio::net::windows::named_pipe::NamedPipeServer::from_raw_handle(handle as _) }
    } else {
        tokio::net::windows::named_pipe::ServerOptions::new()
            .first_pipe_instance(first)
            .create(PIPE_NAME)
    }
}

/// Asynchronously handles incoming client requests over a single named pipe connection.
#[cfg(windows)]
async fn handle_pipe_client(
    server: tokio::net::windows::named_pipe::NamedPipeServer,
    config: AgentConfig,
) {
    let (mut read_half, mut write_half) = tokio::io::split(server);
    let mut broadcast_rx = get_broadcast_sender().subscribe();

    let client = reqwest::Client::new();
    let backend_url = resolve_backend_http_url(&config);

    loop {
        tokio::select! {
            // Inbound frame from desktop tray app
            read_res = async {
                let mut len_buf = [0u8; 4];
                read_half.read_exact(&mut len_buf).await?;
                let len = u32::from_be_bytes(len_buf) as usize;
                if len > 5 * 1024 * 1024 {
                    return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, "Frame too large"));
                }
                let mut body = vec![0u8; len];
                read_half.read_exact(&mut body).await?;
                Ok::<Vec<u8>, std::io::Error>(body)
            } => {
                match read_res {
                    Ok(body) => {
                        let envelope: IpcEnvelope = match serde_json::from_slice(&body) {
                            Ok(env) => env,
                            Err(e) => {
                                warn!("[IPC Server] Failed to deserialize envelope: {}", e);
                                continue;
                            }
                        };

                        let mut state = AgentState::load();
                        let token = resolve_active_token(&config, &state);

                        let response_env = match envelope.msg_type.as_str() {
                            "GET_AGENT_STATUS" => {
                                let hostname = sysinfo::System::host_name().unwrap_or_else(|| "WORKSTATION".to_string());
                                let eq_id = state.slot_id.clone().or(Some(state.instance_id.clone()));
                                let is_bound = state.is_bound();
                                let (pairing_code, pairing_code_expires_at) = if !is_bound {
                                    let code = match state.active_pairing_code() {
                                        Some(c) => c.to_string(),
                                        None => {
                                            let fresh = state.issue_pairing_code();
                                            if let Err(e) = state.save() {
                                                warn!("[IPC Server] Failed to save fresh pairing code: {}", e);
                                            }
                                            fresh
                                        }
                                    };
                                    (Some(code), state.pairing_code_expires_at.clone())
                                } else {
                                    (None, None)
                                };

                                IpcEnvelope::response(
                                    &envelope.id,
                                    "GET_AGENT_STATUS_RESP",
                                    json!({
                                        "agentOnline": true,
                                        "cloudConnected": true,
                                        "equipmentId": eq_id,
                                        "hostname": hostname,
                                        "tenantName": "Managed Workstation",
                                        "activeTicketCount": 0,
                                        "isBound": is_bound,
                                        "pairingCode": pairing_code,
                                        "pairingCodeExpiresAt": pairing_code_expires_at
                                    }),
                                )
                            }

                            "REFRESH_PAIRING_CODE" => {
                                if state.is_bound() {
                                    IpcEnvelope::error(&envelope.id, "Agent is already bound to a slot; pairing is disabled")
                                } else {
                                    let code = state.issue_pairing_code();
                                    if let Err(e) = state.save() {
                                        IpcEnvelope::error(&envelope.id, &format!("Failed to persist refreshed code: {}", e))
                                    } else {
                                        TICKET_CIRCUIT_BREAKER.reset();
                                        let exp = state.pairing_code_expires_at.clone();
                                        IpcEnvelope::response(
                                            &envelope.id,
                                            "REFRESH_PAIRING_CODE_RESP",
                                            json!({
                                                "success": true,
                                                "pairingCode": code,
                                                "pairingCodeExpiresAt": exp
                                            }),
                                        )
                                    }
                                }
                            }

                            "GET_ACTIVE_TICKET" => {
                                if !state.is_bound() || token.trim().is_empty() {
                                    // Suppress HTTP traffic completely when un-paired or lacking credentials
                                    IpcEnvelope::response(&envelope.id, "GET_ACTIVE_TICKET_RESP", Value::Null)
                                } else if !TICKET_CIRCUIT_BREAKER.can_request() {
                                    // Circuit breaker open — serve fast cached fallback
                                    IpcEnvelope::response(&envelope.id, "GET_ACTIVE_TICKET_RESP", Value::Null)
                                } else {
                                    let endpoint = format!("{}/api/v1/tickets/agent/active", backend_url);
                                    let req = client
                                        .get(&endpoint)
                                        .header("Authorization", format!("Bearer {}", token))
                                        .header("X-Agent-Instance-Id", &state.instance_id)
                                        .header("X-Slot-Id", state.slot_id.as_deref().unwrap_or_default())
                                        .header("User-Agent", "msp-agent/1.12.0");

                                    match req.send().await {
                                        Ok(res) => {
                                            let status = res.status();
                                            if status.is_success() {
                                                TICKET_CIRCUIT_BREAKER.record_success();
                                                if let Ok(json_res) = res.json::<Value>().await {
                                                    let data = json_res.get("data").cloned().unwrap_or(Value::Null);
                                                    IpcEnvelope::response(&envelope.id, "GET_ACTIVE_TICKET_RESP", data)
                                                } else {
                                                    IpcEnvelope::response(&envelope.id, "GET_ACTIVE_TICKET_RESP", Value::Null)
                                                }
                                            } else {
                                                TICKET_CIRCUIT_BREAKER.record_failure(Some(status.as_u16()));
                                                IpcEnvelope::response(&envelope.id, "GET_ACTIVE_TICKET_RESP", Value::Null)
                                            }
                                        }
                                        Err(err) => {
                                            TICKET_CIRCUIT_BREAKER.record_failure(None);
                                            warn!("[IPC Server] Failed to fetch active ticket from backend: {}", err);
                                            IpcEnvelope::response(&envelope.id, "GET_ACTIVE_TICKET_RESP", Value::Null)
                                        }
                                    }
                                }
                            }

                            "GET_TICKET_LIST" => {
                                if !state.is_bound() || token.trim().is_empty() {
                                    // Suppress HTTP traffic completely when un-paired
                                    IpcEnvelope::response(&envelope.id, "GET_TICKET_LIST_RESP", json!([]))
                                } else if !TICKET_CIRCUIT_BREAKER.can_request() {
                                    // Circuit breaker open — serve fast cached fallback
                                    IpcEnvelope::response(&envelope.id, "GET_TICKET_LIST_RESP", json!([]))
                                } else {
                                    let limit = envelope.payload.get("limit").and_then(|v| v.as_u64()).unwrap_or(20);
                                    let endpoint = format!("{}/api/v1/tickets/agent/list?limit={}", backend_url, limit);
                                    let req = client
                                        .get(&endpoint)
                                        .header("Authorization", format!("Bearer {}", token))
                                        .header("X-Agent-Instance-Id", &state.instance_id)
                                        .header("X-Slot-Id", state.slot_id.as_deref().unwrap_or_default())
                                        .header("User-Agent", "msp-agent/1.12.0");

                                    match req.send().await {
                                        Ok(res) => {
                                            let status = res.status();
                                            if status.is_success() {
                                                TICKET_CIRCUIT_BREAKER.record_success();
                                                if let Ok(json_res) = res.json::<Value>().await {
                                                    let data = json_res.get("data").cloned().unwrap_or_else(|| json!([]));
                                                    IpcEnvelope::response(&envelope.id, "GET_TICKET_LIST_RESP", data)
                                                } else {
                                                    IpcEnvelope::response(&envelope.id, "GET_TICKET_LIST_RESP", json!([]))
                                                }
                                            } else {
                                                TICKET_CIRCUIT_BREAKER.record_failure(Some(status.as_u16()));
                                                IpcEnvelope::response(&envelope.id, "GET_TICKET_LIST_RESP", json!([]))
                                            }
                                        }
                                        Err(err) => {
                                            TICKET_CIRCUIT_BREAKER.record_failure(None);
                                            warn!("[IPC Server] Failed to fetch ticket list from backend: {}", err);
                                            IpcEnvelope::response(&envelope.id, "GET_TICKET_LIST_RESP", json!([]))
                                        }
                                    }
                                }
                            }

                            "GET_TICKET_RESPONSES" => {
                                if !state.is_bound() || token.trim().is_empty() {
                                    IpcEnvelope::response(&envelope.id, "GET_TICKET_RESPONSES_RESP", json!([]))
                                } else if !TICKET_CIRCUIT_BREAKER.can_request() {
                                    IpcEnvelope::response(&envelope.id, "GET_TICKET_RESPONSES_RESP", json!([]))
                                } else {
                                    let ticket_id = envelope.payload.get("ticketId").and_then(|v| v.as_str()).unwrap_or_default();
                                    let endpoint = format!("{}/api/v1/tickets/{}/responses/agent", backend_url, ticket_id);
                                    let req = client
                                        .get(&endpoint)
                                        .header("Authorization", format!("Bearer {}", token))
                                        .header("X-Agent-Instance-Id", &state.instance_id)
                                        .header("X-Slot-Id", state.slot_id.as_deref().unwrap_or_default())
                                        .header("User-Agent", "msp-agent/1.12.0");

                                    match req.send().await {
                                        Ok(res) => {
                                            let status = res.status();
                                            if status.is_success() {
                                                TICKET_CIRCUIT_BREAKER.record_success();
                                                if let Ok(json_res) = res.json::<Value>().await {
                                                    let data = json_res.get("data").cloned().unwrap_or_else(|| json!([]));
                                                    IpcEnvelope::response(&envelope.id, "GET_TICKET_RESPONSES_RESP", data)
                                                } else {
                                                    IpcEnvelope::response(&envelope.id, "GET_TICKET_RESPONSES_RESP", json!([]))
                                                }
                                            } else {
                                                TICKET_CIRCUIT_BREAKER.record_failure(Some(status.as_u16()));
                                                IpcEnvelope::response(&envelope.id, "GET_TICKET_RESPONSES_RESP", json!([]))
                                            }
                                        }
                                        Err(err) => {
                                            TICKET_CIRCUIT_BREAKER.record_failure(None);
                                            warn!("[IPC Server] Failed to fetch ticket responses: {}", err);
                                            IpcEnvelope::response(&envelope.id, "GET_TICKET_RESPONSES_RESP", json!([]))
                                        }
                                    }
                                }
                            }

                            "CREATE_TICKET" => {
                                let title = envelope.payload.get("title").and_then(|v| v.as_str()).unwrap_or_default();
                                let description = envelope.payload.get("description").and_then(|v| v.as_str()).unwrap_or_default();
                                let raw_category = envelope.payload.get("category").and_then(|v| v.as_str()).unwrap_or("HELPDESK");
                                let category = match raw_category.trim().to_uppercase().as_str() {
                                    "REPAIR" | "HARDWARE" => "REPAIR",
                                    "WARRANTY" => "WARRANTY",
                                    "SERVICE_OUTAGE" | "NETWORK" => "SERVICE_OUTAGE",
                                    "PREVENTATIVE_MAINTENANCE" => "PREVENTATIVE_MAINTENANCE",
                                    "AI" => "AI",
                                    _ => "HELPDESK",
                                };
                                let priority = envelope.payload.get("priority").and_then(|v| v.as_str()).unwrap_or("MEDIUM");
                                let reporter_name = envelope.payload.get("reporterName").and_then(|v| v.as_str()).unwrap_or("Desk User");
                                let reporter_email = envelope.payload.get("reporterEmail").and_then(|v| v.as_str()).unwrap_or("user@endpoint.local");
                                let screenshot = envelope.payload.get("screenshotBase64").and_then(|v| v.as_str());

                                let sys_metrics = crate::diagnostics::gather_system_metrics();

                                let flight_recorder = json!({
                                    "os": sys_metrics.get("os_name").and_then(|v| v.as_str()).unwrap_or("Windows 10 Pro"),
                                    "osVersion": sys_metrics.get("os_version").and_then(|v| v.as_str()).unwrap_or("10.0"),
                                    "uptimeSeconds": (sys_metrics.get("uptime_hours").and_then(|v| v.as_f64()).unwrap_or(1.0) * 3600.0) as u64,
                                    "cpuUsagePercent": sys_metrics.get("cpu").and_then(|c| c.get("global_usage_pct")).and_then(|v| v.as_f64()).unwrap_or(5.0),
                                    "memoryUsagePercent": sys_metrics.get("memory").and_then(|m| m.get("usage_pct")).and_then(|v| v.as_f64()).unwrap_or(40.0),
                                    "memoryTotalBytes": sys_metrics.get("memory").and_then(|m| m.get("total_bytes")).and_then(|v| v.as_u64()).unwrap_or(16000000000),
                                    "memoryUsedBytes": sys_metrics.get("memory").and_then(|m| m.get("used_bytes")).and_then(|v| v.as_u64()).unwrap_or(6000000000),
                                    "diskUsagePercent": 35.0,
                                    "activeWindowTitle": "Managed Desk Workspace",
                                    "topProcesses": [],
                                    "recentEventErrors": []
                                });

                                let mut body = json!({
                                    "title": title,
                                    "description": description,
                                    "category": category,
                                    "priority": priority,
                                    "reporterName": reporter_name,
                                    "reporterEmail": reporter_email,
                                    "deviceSnapshot": flight_recorder
                                });

                                if let Some(s) = screenshot {
                                    body["screenshotBase64"] = json!(s);
                                }

                                let endpoint = format!("{}/api/v1/tickets/agent", backend_url);
                                match client.post(&endpoint).header("Authorization", format!("Bearer {}", token)).json(&body).send().await {
                                    Ok(res) => {
                                        if res.status().is_success() {
                                            if let Ok(json_res) = res.json::<Value>().await {
                                                let data = json_res.get("data").cloned().unwrap_or(json_res);
                                                let ticket_id = data.get("ticketId").or_else(|| data.get("id")).and_then(|v| v.as_str()).unwrap_or_default();
                                                let tech_name = data.get("assignedTechName").and_then(|v| v.as_str());
                                                let status = data.get("status").and_then(|v| v.as_str()).unwrap_or("OPEN");
                                                let created_at = data.get("createdAt").and_then(|v| v.as_str()).unwrap_or_else(|| "");

                                                IpcEnvelope::response(
                                                    &envelope.id,
                                                    "CREATE_TICKET_RESP",
                                                    json!({
                                                        "success": true,
                                                        "ticketId": ticket_id,
                                                        "title": title,
                                                        "assignedTechName": tech_name,
                                                        "status": status,
                                                        "createdAt": created_at
                                                    }),
                                                )
                                            } else {
                                                IpcEnvelope::error(&envelope.id, "Invalid JSON response from ticketing gateway")
                                            }
                                        } else {
                                            let status_code = res.status();
                                            let err_text = res.text().await.unwrap_or_default();
                                            IpcEnvelope::error(&envelope.id, &format!("Backend error ({}): {}", status_code, err_text))
                                        }
                                    }
                                    Err(err) => {
                                        IpcEnvelope::error(&envelope.id, &format!("Failed to reach ticketing backend: {}", err))
                                    }
                                }
                            }

                            "SEND_CHAT_MESSAGE" => {
                                let ticket_id = envelope.payload.get("ticketId").and_then(|v| v.as_str()).unwrap_or_default();
                                let reporter_name = envelope.payload.get("reporterName").and_then(|v| v.as_str()).unwrap_or("Desk Worker");
                                let message = envelope.payload.get("message").and_then(|v| v.as_str()).unwrap_or_default();

                                let endpoint = format!("{}/api/v1/tickets/{}/responses/agent", backend_url, ticket_id);
                                let body = json!({
                                    "reporterName": reporter_name,
                                    "message": message,
                                    "attachments": []
                                });

                                match client.post(&endpoint).header("Authorization", format!("Bearer {}", token)).json(&body).send().await {
                                    Ok(res) => {
                                        if res.status().is_success() {
                                            IpcEnvelope::response(&envelope.id, "SEND_CHAT_MESSAGE_RESP", json!({ "success": true }))
                                        } else {
                                            let status = res.status();
                                            IpcEnvelope::error(&envelope.id, &format!("Failed to post message ({})", status))
                                        }
                                    }
                                    Err(err) => {
                                        IpcEnvelope::error(&envelope.id, &format!("Network error: {}", err))
                                    }
                                }
                            }

                            "RESOLVE_TICKET" => {
                                let ticket_id = envelope.payload.get("ticketId").and_then(|v| v.as_str()).unwrap_or_default();
                                let endpoint = format!("{}/api/v1/tickets/{}/status/agent", backend_url, ticket_id);
                                let body = json!({ "status": "RESOLVED" });

                                match client.patch(&endpoint).header("Authorization", format!("Bearer {}", token)).json(&body).send().await {
                                    Ok(res) => {
                                        if res.status().is_success() {
                                            IpcEnvelope::response(&envelope.id, "RESOLVE_TICKET_RESP", json!({ "success": true }))
                                        } else {
                                            IpcEnvelope::error(&envelope.id, "Failed to resolve ticket")
                                        }
                                    }
                                    Err(err) => {
                                        IpcEnvelope::error(&envelope.id, &format!("Network error: {}", err))
                                    }
                                }
                            }

                            unknown => {
                                IpcEnvelope::error(&envelope.id, &format!("Unknown IPC command: {}", unknown))
                            }
                        };

                        if let Ok(resp_bytes) = encode_frame(&response_env) {
                            if let Err(e) = write_half.write_all(&resp_bytes).await {
                                warn!("[IPC Server] Failed to send response to pipe client: {}", e);
                                break;
                            }
                        }
                    }
                    Err(_) => {
                        // Client disconnected or pipe closed
                        break;
                    }
                }
            }

            // Real-time broadcast pushed from WebSocket gateway (e.g. TICKET_CHAT_PUSH)
            push_msg = broadcast_rx.recv() => {
                match push_msg {
                    Ok(raw_json) => {
                        let len = raw_json.as_bytes().len() as u32;
                        let mut frame = Vec::with_capacity(4 + len as usize);
                        frame.extend_from_slice(&len.to_be_bytes());
                        frame.extend_from_slice(raw_json.as_bytes());

                        if let Err(e) = write_half.write_all(&frame).await {
                            warn!("[IPC Server] Failed to write push frame to pipe client: {}", e);
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("[IPC Server] Client lagged by {} push events", skipped);
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        break;
                    }
                }
            }
        }
    }
}

/// Main entry point for the background IPC Named Pipe server.
pub fn start_ipc_server(config: AgentConfig) {
    #[cfg(windows)]
    {
        tokio::spawn(async move {
            info!("[IPC Server] Initializing Windows Named Pipe server on {}", PIPE_NAME);
            let mut first = true;

            loop {
                match create_named_pipe_instance(first) {
                    Ok(server) => {
                        first = false;
                        // Wait for client connection
                        if let Err(e) = server.connect().await {
                            warn!("[IPC Server] Error awaiting pipe connection: {}", e);
                            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                            continue;
                        }

                        info!("[IPC Server] New desktop tray client connected to named pipe");
                        let cfg_clone = config.clone();
                        tokio::spawn(handle_pipe_client(server, cfg_clone));
                    }
                    Err(e) => {
                        error!("[IPC Server] Failed to create named pipe instance: {}", e);
                        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                    }
                }
            }
        });
    }

    #[cfg(not(windows))]
    {
        let _ = config;
        info!("[IPC Server] Named pipe server is disabled on non-Windows targets.");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_frame_structure() {
        let envelope = IpcEnvelope::response("req-123", "TEST_TYPE", json!({ "status": "ok" }));
        let encoded = encode_frame(&envelope).expect("Encoding should succeed");

        assert!(encoded.len() > 4);
        let len_prefix = u32::from_be_bytes([encoded[0], encoded[1], encoded[2], encoded[3]]) as usize;
        assert_eq!(len_prefix, encoded.len() - 4);

        let parsed: IpcEnvelope = serde_json::from_slice(&encoded[4..]).expect("Should deserialize");
        assert_eq!(parsed.id, "req-123");
        assert_eq!(parsed.msg_type, "TEST_TYPE");
        assert_eq!(parsed.payload["status"], "ok");
    }

    #[test]
    fn test_resolve_backend_http_url_conversions() {
        let cfg_wss = AgentConfig {
            gateway_url: "wss://helpdesk.velmartech.com.do/agent-ws".into(),
            agent_token: "".into(),
            reconnect_delay_secs: 5,
            max_reconnect_delay_secs: 120,
        };
        assert_eq!(resolve_backend_http_url(&cfg_wss), "https://helpdesk.velmartech.com.do");

        let cfg_ws = AgentConfig {
            gateway_url: "ws://localhost:3001/agent-ws".into(),
            agent_token: "".into(),
            reconnect_delay_secs: 5,
            max_reconnect_delay_secs: 120,
        };
        assert_eq!(resolve_backend_http_url(&cfg_ws), "http://localhost:3001");
    }

    #[test]
    fn test_ipc_envelope_error_builder() {
        let err_env = IpcEnvelope::error("req-999", "Machine unauthorized");
        assert_eq!(err_env.id, "req-999");
        assert_eq!(err_env.msg_type, "ERROR");
        assert_eq!(err_env.payload["success"], false);
        assert_eq!(err_env.payload["error"], "Machine unauthorized");
    }
}
