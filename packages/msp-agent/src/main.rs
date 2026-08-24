mod diagnostics;

use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;
use tokio_tungstenite::{connect_async, tungstenite::Message};

// ── Configuration ─────────────────────────────────────────────────────────────

/// Agent runtime configuration, loaded from environment variables.
struct AgentConfig {
    /// WebSocket gateway URL (e.g. wss://api.yourmsp.com/agent-ws)
    gateway_url: String,
    /// Unique equipment ID / device UUID registered in the MSP portal
    agent_id: String,
    /// Pre-shared secret token for authentication
    agent_token: String,
    /// Seconds between reconnection attempts on disconnect
    reconnect_delay_secs: u64,
    /// Maximum reconnection delay cap (exponential backoff ceiling)
    max_reconnect_delay_secs: u64,
}

impl AgentConfig {
    fn from_env() -> Self {
        Self {
            gateway_url: std::env::var("MSP_GATEWAY_URL")
                .unwrap_or_else(|_| "ws://localhost:3001/agent-ws".into()),
            agent_id: std::env::var("MSP_AGENT_ID")
                .unwrap_or_else(|_| uuid::Uuid::new_v4().to_string()),
            agent_token: std::env::var("MSP_AGENT_TOKEN")
                .unwrap_or_else(|_| "dev-token".into()),
            reconnect_delay_secs: std::env::var("MSP_RECONNECT_DELAY")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5),
            max_reconnect_delay_secs: std::env::var("MSP_MAX_RECONNECT_DELAY")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(120),
        }
    }

    fn ws_url(&self) -> String {
        format!(
            "{}?agent_id={}&token={}",
            self.gateway_url, self.agent_id, self.agent_token
        )
    }
}

// ── Protocol Envelope ─────────────────────────────────────────────────────────

/// Message envelope exchanged between the agent and the backend gateway.
/// The `correlation_id` ties a request to its response.
#[derive(Debug, Serialize, Deserialize)]
struct AgentEnvelope {
    correlation_id: String,
    command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    payload: Option<Value>,
}

// ── Command Dispatcher ────────────────────────────────────────────────────────

/// Routes an inbound command from the gateway to the appropriate diagnostic
/// collector and returns the result as a JSON value.
fn dispatch_command(command: &str, payload: &Option<Value>) -> Value {
    match command {
        "DIAGNOSE_PC" => diagnostics::gather_system_metrics(),
        "GET_EVENT_LOGS" => diagnostics::query_event_logs(payload),
        "SECURITY_AUDIT" => diagnostics::audit_security_posture(),
        "RESTART_SERVICE" => diagnostics::restart_service(payload),
        "INSPECT_OPEN_PORTS" => diagnostics::inspect_open_ports(),
        "LIST_STARTUP_PROGRAMS" => diagnostics::list_startup_programs(),
        "LIST_PROCESSES" => diagnostics::list_running_processes(payload),
        "EXEC_POWERSHELL" => diagnostics::exec_powershell_script(payload),
        "FLUSH_DNS_RENEW_DHCP" => diagnostics::flush_dns_renew_dhcp(),
        "PING" => serde_json::json!({
            "status": "PONG",
            "agent_version": env!("CARGO_PKG_VERSION"),
            "timestamp": chrono::Utc::now().to_rfc3339()
        }),
        _ => serde_json::json!({
            "error": format!("Unknown command: {}", command)
        }),
    }
}

// ── WebSocket Connection Loop ─────────────────────────────────────────────────

/// Attempts a single WebSocket session: connects, processes commands, and
/// returns when the connection drops. The caller manages reconnection.
async fn run_session(config: &AgentConfig) -> Result<(), Box<dyn std::error::Error>> {
    let url = config.ws_url();
    info!("Connecting to gateway: {}", config.gateway_url);

    let (ws_stream, _response) = connect_async(&url).await?;
    info!(
        "Connected to MSP Gateway. Agent ID: {}",
        config.agent_id
    );

    let (mut writer, mut reader) = ws_stream.split();

    // Send initial registration / heartbeat
    let hello = AgentEnvelope {
        correlation_id: uuid::Uuid::new_v4().to_string(),
        command: "AGENT_HELLO".into(),
        payload: Some(serde_json::json!({
            "agent_id": config.agent_id,
            "agent_version": env!("CARGO_PKG_VERSION"),
            "hostname": sysinfo::System::host_name().unwrap_or_else(|| "Unknown".into()),
            "os": sysinfo::System::long_os_version().unwrap_or_else(|| "Unknown".into()),
            "timestamp": chrono::Utc::now().to_rfc3339()
        })),
    };
    writer
        .send(Message::Text(serde_json::to_string(&hello)?))
        .await?;

    // Main message loop
    while let Some(msg_result) = reader.next().await {
        match msg_result {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<AgentEnvelope>(&text) {
                    Ok(envelope) => {
                        info!(
                            "Received command: {} (correlation: {})",
                            envelope.command, envelope.correlation_id
                        );

                        // Execute diagnostic command (blocking work on a spawn_blocking thread)
                        let cmd = envelope.command.clone();
                        let payload = envelope.payload.clone();
                        let correlation_id = envelope.correlation_id.clone();

                        let result = tokio::task::spawn_blocking(move || {
                            dispatch_command(&cmd, &payload)
                        })
                        .await?;

                        let response = AgentEnvelope {
                            correlation_id,
                            command: "RESPONSE".into(),
                            payload: Some(result),
                        };

                        writer
                            .send(Message::Text(serde_json::to_string(&response)?))
                            .await?;
                    }
                    Err(e) => {
                        warn!("Failed to parse gateway message: {}", e);
                    }
                }
            }
            Ok(Message::Ping(data)) => {
                writer.send(Message::Pong(data)).await?;
            }
            Ok(Message::Close(_)) => {
                info!("Server closed the connection.");
                break;
            }
            Err(e) => {
                error!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }

    Ok(())
}

// ── Entry Point with Exponential Backoff Reconnection ─────────────────────────

#[tokio::main]
async fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let config = AgentConfig::from_env();
    let mut delay = config.reconnect_delay_secs;

    info!(
        "MSP Endpoint Agent v{} starting. Agent ID: {}",
        env!("CARGO_PKG_VERSION"),
        config.agent_id
    );

    loop {
        match run_session(&config).await {
            Ok(()) => {
                info!("Session ended cleanly. Reconnecting in {}s...", delay);
            }
            Err(e) => {
                error!(
                    "Session failed: {}. Reconnecting in {}s...",
                    e, delay
                );
            }
        }

        tokio::time::sleep(Duration::from_secs(delay)).await;

        // Exponential backoff with ceiling
        delay = (delay * 2).min(config.max_reconnect_delay_secs);

        // Reset backoff after a successful long session (>60s reconnect window)
        if delay > 30 {
            delay = config.reconnect_delay_secs;
        }
    }
}
