mod diagnostics;
mod pairing;

use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use pairing::{AgentState, PAIRING_TTL_SECS};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;
use tokio_tungstenite::{connect_async, tungstenite::Message};

// ── Configuration ─────────────────────────────────────────────────────────────

/// Runtime configuration, loaded from environment variables.
struct AgentConfig {
    /// WebSocket gateway URL (e.g. wss://api.yourmsp.com/agent-ws)
    gateway_url: String,
    /// Optional pre-shared secret token. When empty the persisted binding
    /// secret is used; unbound agents fall back to "dev-token".
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
            agent_token: std::env::var("MSP_AGENT_TOKEN").unwrap_or_default(),
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
}

/// Resolves the secret the agent presents on the WebSocket: an explicit env
/// override wins, then the persisted binding secret, then the dev fallback.
fn resolve_token(config: &AgentConfig, state: &AgentState) -> String {
    if !config.agent_token.is_empty() {
        return config.agent_token.clone();
    }
    state
        .agent_token
        .clone()
        .unwrap_or_else(|| "dev-token".into())
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

/// Builds the AGENT_HELLO payload. Unbound agents announce a short-lived
/// pairing code; bound agents flag their binding state instead.
fn build_hello_payload(state: &AgentState) -> Value {
    let mut payload = serde_json::json!({
        "agent_id": state.instance_id,
        "agent_version": env!("CARGO_PKG_VERSION"),
        "hostname": sysinfo::System::host_name().unwrap_or_else(|| "Unknown".into()),
        "serial_number": diagnostics::bios_serial(),
        "manufacturer": diagnostics::manufacturer(),
        "system_model": diagnostics::system_model(),
        "os": sysinfo::System::long_os_version().unwrap_or_else(|| "Unknown".into()),
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    if state.is_bound() {
        payload["binding_state"] = Value::String("BOUND".into());
    } else if let Some(code) = state.active_pairing_code() {
        payload["pairing_code"] = Value::String(code.to_string());
        if let Some(exp) = &state.pairing_code_expires_at {
            payload["pairing_code_expires_at"] = Value::String(exp.clone());
        }
    }
    payload
}

/// Renders the pairing code banner the technician reads from the console.
fn print_pairing_banner(state: &AgentState) {
    let Some(code) = state.active_pairing_code() else {
        return;
    };
    let expiry = state
        .pairing_code_expires_at
        .clone()
        .unwrap_or_else(|| "?".into());
    println!("\n==================================================");
    println!("  MSP AGENT PAIRING CODE: {code}");
    println!("  Expires (UTC): {expiry}  (~{} minutes)", PAIRING_TTL_SECS / 60);
    println!("  Enter this code in the portal to link this device");
    println!("  to its subscription slot.");
    println!("==================================================\n");
}

// ── Command Dispatcher ────────────────────────────────────────────────────────

/// Routes an inbound diagnostic command from the gateway to the appropriate
/// collector and returns the result as a JSON value.
fn dispatch_command(command: &str, payload: &Option<Value>) -> Value {
    match command {
        "DIAGNOSE_PC" => diagnostics::gather_system_metrics(),
        "GET_REMOTE_IDENTITY" => diagnostics::gather_device_identity(),
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

// ── WebSocket Session ─────────────────────────────────────────────────────────

/// Outcome of a single WebSocket session.
enum SessionOutcome {
    /// Connection dropped or closed normally; apply normal reconnect backoff.
    Clean,
    /// The server bound this device to a slot; reconnect immediately so the
    /// next AGENT_HELLO presents the provisioned secret.
    Relinked,
}

/// Attempts a single WebSocket session: connects, processes commands, and
/// returns when the connection drops. The caller manages reconnection.
async fn run_session(config: &AgentConfig) -> Result<SessionOutcome, Box<dyn std::error::Error + Send + Sync>> {
    let state = AgentState::load();
    let token = resolve_token(config, &state);

    let url = format!(
        "{}?agent_id={}&token={}",
        config.gateway_url, state.instance_id, token
    );
    info!("Connecting to gateway: {}", config.gateway_url);

    let (ws_stream, _response) = connect_async(&url).await?;
    info!(
        "Connected to MSP Gateway. Agent ID: {}",
        state.instance_id
    );

    if !state.is_bound() {
        info!("Device is UNBOUND. Pairing code is required for slot linkage.");
        print_pairing_banner(&state);
    }

    let (mut writer, mut reader) = ws_stream.split();

    // Send initial registration / heartbeat
    let hello = AgentEnvelope {
        correlation_id: uuid::Uuid::new_v4().to_string(),
        command: "AGENT_HELLO".into(),
        payload: Some(build_hello_payload(&state)),
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

                        // ── BIND: server links this device to a slot ──
                        if envelope.command == "BIND" {
                            let accepted = handle_bind(&envelope);
                            let ok = accepted.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
                            let response = AgentEnvelope {
                                correlation_id: envelope.correlation_id,
                                command: "RESPONSE".into(),
                                payload: Some(accepted),
                            };
                            writer
                                .send(Message::Text(serde_json::to_string(&response)?))
                                .await?;
                            if ok {
                                return Ok(SessionOutcome::Relinked);
                            }
                            continue;
                        }

                        // ── REFRESH_PAIRING_CODE: re-issue an unbound code ──
                        if envelope.command == "REFRESH_PAIRING_CODE" {
                            let refreshed = handle_refresh_pairing_code();
                            let response = AgentEnvelope {
                                correlation_id: envelope.correlation_id,
                                command: "RESPONSE".into(),
                                payload: Some(refreshed),
                            };
                            writer
                                .send(Message::Text(serde_json::to_string(&response)?))
                                .await?;
                            continue;
                        }

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

    Ok(SessionOutcome::Clean)
}

/// Executes the server's BIND command: persists {slot_id, agent_token} and
/// clears the pairing code. Returns the response payload.
fn handle_bind(envelope: &AgentEnvelope) -> Value {
    let Some(payload) = envelope.payload.as_ref() else {
        warn!("[agent] BIND without payload; ignoring.");
        return serde_json::json!({ "success": false, "error": "BIND requires a payload" });
    };

    let slot_id = payload.get("slot_id").and_then(|v| v.as_str()).unwrap_or("");
    let agent_token = payload.get("agent_token").and_then(|v| v.as_str()).unwrap_or("");

    if slot_id.is_empty() || agent_token.is_empty() {
        warn!("[agent] Invalid BIND payload (missing slot_id/agent_token); ignoring.");
        return serde_json::json!({
            "success": false,
            "error": "Invalid BIND payload: slot_id and agent_token are required"
        });
    }

    let mut state = AgentState::load();
    state.bind(slot_id, agent_token);
    if let Err(err) = state.save() {
        error!("[agent] Failed to persist binding: {}", err);
        return serde_json::json!({ "success": false, "error": format!("Failed to persist binding: {err}") });
    }

    info!("Device linked to slot {slot_id}. Reconnecting as a bound agent.");
    serde_json::json!({
        "success": true,
        "slot_id": slot_id
    })
}

/// Executes the server's REFRESH_PAIRING_CODE command (unbound agents only).
fn handle_refresh_pairing_code() -> Value {
    let mut state = AgentState::load();
    if state.is_bound() {
        return serde_json::json!({
            "success": false,
            "error": "Agent is already bound to a slot; pairing is disabled"
        });
    }
    let code = state.issue_pairing_code();
    if let Err(err) = state.save() {
        error!("[agent] Failed to persist refreshed pairing code: {}", err);
        return serde_json::json!({ "success": false, "error": format!("Failed to persist pairing code: {err}") });
    }
    print_pairing_banner(&state);
    serde_json::json!({
        "success": true,
        "pairing_code": code,
        "pairing_code_expires_at": state.pairing_code_expires_at
    })
}

// ── Entry Point with Exponential Backoff Reconnection ─────────────────────────

/// Prints help message to stdout.
fn print_help() {
    println!("MSP Endpoint Agent — Lightweight Rust background agent for remote diagnostics, event log queries, security audits, and service remediation via WebSocket tunnel.");
    println!("");
    println!("Usage:");
    println!("  msp-agent.exe [OPTIONS]");
    println!("");
    println!("Options:");
    println!("  -h, --help       Print help information");
    println!("  -V, --version    Print version information");
    println!("");
    println!("Environment variables:");
    println!("  MSP_GATEWAY_URL   WebSocket gateway URL (default: ws://localhost:3001/agent-ws)");
    println!("  MSP_AGENT_ID      Equipment UUID from the MSP Portal (auto-generated if unset)");
    println!("  MSP_AGENT_TOKEN   Pre-shared secret for authentication (default: \"dev-token\" if empty)");
    println!("  MSP_RECONNECT_DELAY Initial reconnection delay in seconds (default: 5)");
    println!("  MSP_MAX_RECONNECT_DELAY Maximum reconnection delay in seconds (default: 120)");
    println!("");
    println!("The agent makes an outbound TLS WebSocket connection, so it works behind NAT, corporate firewalls, and VPNs without any port-forwarding configuration.");
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.contains(&"--help".to_string()) || args.contains(&"-h".to_string()) {
        print_help();
        return;
    }
    if args.contains(&"--version".to_string()) || args.contains(&"-V".to_string()) {
        println!("msp-agent {}", env!("CARGO_PKG_VERSION"));
        return;
    }

    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let config = AgentConfig::from_env();
    let mut delay = config.reconnect_delay_secs;

    let mut state = AgentState::load();
    // Unbound agents must always hold a live 6-digit pairing code so the
    // portal can link this device to a subscription slot. Issue one on first
    // boot or after a code expires, and persist it before the first hello.
    if !state.is_bound() && state.active_pairing_code().is_none() {
        state.issue_pairing_code();
        if let Err(err) = state.save() {
            error!("[agent] Failed to persist initial pairing code: {}", err);
        }
        print_pairing_banner(&state);
    }
    info!(
        "MSP Endpoint Agent v{} starting. Agent ID: {}",
        env!("CARGO_PKG_VERSION"),
        state.instance_id
    );

    loop {
        let mut relinked = false;
        match run_session(&config).await {
            Ok(SessionOutcome::Relinked) => {
                info!("Device relinked; reconnecting in {}s...", config.reconnect_delay_secs);
                relinked = true;
            }
            Ok(SessionOutcome::Clean) => {
                info!("Session ended cleanly. Reconnecting in {}s...", delay);
            }
            Err(e) => {
                error!(
                    "Session failed: {}. Reconnecting in {}s...",
                    e, delay
                );
            }
        }

        let wait = if relinked {
            config.reconnect_delay_secs
        } else {
            delay
        };
        tokio::time::sleep(Duration::from_secs(wait)).await;

        // Exponential backoff with ceiling
        if !relinked {
            delay = (delay * 2).min(config.max_reconnect_delay_secs);
            // Reset backoff after a long wait window
            if delay > 30 {
                delay = config.reconnect_delay_secs;
            }
        }
    }
}