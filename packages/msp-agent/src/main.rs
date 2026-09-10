mod diagnostics;
mod ipc_server;
mod pairing;
mod service;
mod upgrade;

use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use pairing::{AgentState, PAIRING_TTL_SECS};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;
use tokio_tungstenite::{connect_async, tungstenite::Message};

// ── Configuration ─────────────────────────────────────────────────────────────

/// Runtime configuration, loaded from CLI flags and environment variables.
#[derive(Debug, Clone)]
pub struct AgentConfig {
    /// WebSocket gateway URL (e.g. wss://api.yourmsp.com/agent-ws)
    pub gateway_url: String,
    /// Optional pre-shared secret token. When empty the persisted binding
    /// secret is used; unbound agents fall back to "dev-token".
    pub agent_token: String,
    /// Seconds between reconnection attempts on disconnect
    pub reconnect_delay_secs: u64,
    /// Maximum reconnection delay cap (exponential backoff ceiling)
    pub max_reconnect_delay_secs: u64,
}

impl AgentConfig {
    pub fn from_args_and_env(args: &[String]) -> Self {
        let gateway_url = extract_gateway_arg(args)
            .or_else(|| std::env::var("MSP_GATEWAY_URL").ok())
            .unwrap_or_else(|| "wss://helpdesk.velmartech.com.do/agent-ws".into());

        Self {
            gateway_url,
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

/// Helper to parse `--gateway <URL>`, `-g <URL>`, or `--gateway=<URL>` from CLI arguments.
fn extract_gateway_arg(args: &[String]) -> Option<String> {
    for (i, arg) in args.iter().enumerate() {
        if (arg == "--gateway" || arg == "-g") && i + 1 < args.len() {
            return Some(args[i + 1].clone());
        }
        if let Some(stripped) = arg.strip_prefix("--gateway=") {
            return Some(stripped.to_string());
        }
    }
    None
}

/// Helper to parse `--token <TOKEN>`, `-t <TOKEN>`, or `--token=<TOKEN>` from CLI arguments.
fn extract_token_arg(args: &[String]) -> Option<String> {
    for (i, arg) in args.iter().enumerate() {
        if (arg == "--token" || arg == "-t") && i + 1 < args.len() {
            return Some(args[i + 1].clone());
        }
        if let Some(stripped) = arg.strip_prefix("--token=") {
            return Some(stripped.to_string());
        }
    }
    None
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
        if let Some(slot) = &state.slot_id {
            payload["slot_id"] = Value::String(slot.clone());
        }
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
        "INSPECT_HARDWARE_INVENTORY" | "GET_HARDWARE_COMPONENTS" => diagnostics::inspect_hardware_components(),
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

    // Commit any active upgrade transaction now that TLS WebSocket handshake is validated
    upgrade::commit_upgrade_success();

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

                        // ── AGENT_UPGRADE: server commands autonomous binary upgrade ──
                        if envelope.command == "AGENT_UPGRADE" {
                            let (response_payload, upgrade_task) = handle_upgrade(&envelope);
                            let response = AgentEnvelope {
                                correlation_id: envelope.correlation_id,
                                command: "RESPONSE".into(),
                                payload: Some(response_payload),
                            };
                            writer
                                .send(Message::Text(serde_json::to_string(&response)?))
                                .await?;

                            if let Some(task) = upgrade_task {
                                tokio::spawn(task);
                            }
                            continue;
                        }

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

                        // ── UNBIND: server unlinks this device from slot (by client) ──
                        if envelope.command == "UNBIND" {
                            let unbind_result = handle_unbind(&envelope);
                            let response = AgentEnvelope {
                                correlation_id: envelope.correlation_id,
                                command: "RESPONSE".into(),
                                payload: Some(unbind_result),
                            };
                            writer
                                .send(Message::Text(serde_json::to_string(&response)?))
                                .await?;
                            return Ok(SessionOutcome::Relinked);
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

                        // ── TICKET_CHAT_PUSH: server forwards real-time reply down to workstation ──
                        if envelope.command == "TICKET_CHAT_PUSH" {
                            if let Some(ref payload) = envelope.payload {
                                ipc_server::broadcast_push_event("TICKET_CHAT_PUSH", payload);
                            }
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

/// Executes the server's AGENT_UPGRADE command: schedules binary download,
/// verifies integrity, atomic move swap, and triggers service restart.
fn handle_upgrade(
    envelope: &AgentEnvelope,
) -> (Value, Option<std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + 'static>>>) {
    let Some(payload) = envelope.payload.as_ref() else {
        warn!("[agent] AGENT_UPGRADE without payload; ignoring.");
        return (
            serde_json::json!({ "success": false, "error": "AGENT_UPGRADE requires a payload" }),
            None,
        );
    };

    let target_version = payload
        .get("target_version")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let download_url = payload
        .get("download_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let sha256_checksum = payload
        .get("sha256_checksum")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let rollback_timeout_secs = payload
        .get("rollback_timeout_secs")
        .and_then(|v| v.as_u64())
        .unwrap_or(45);

    if target_version.is_empty() || download_url.is_empty() || sha256_checksum.is_empty() {
        warn!("[agent] Invalid AGENT_UPGRADE payload: target_version, download_url, and sha256_checksum required");
        return (
            serde_json::json!({
                "success": false,
                "error": "target_version, download_url, and sha256_checksum are required"
            }),
            None,
        );
    }

    info!(
        "[agent] Scheduled AGENT_UPGRADE to v{} from {} (rollback deadline: {}s)",
        target_version, download_url, rollback_timeout_secs
    );

    let ack = serde_json::json!({
        "success": true,
        "status": "UPGRADE_PREPARED",
        "target_version": target_version,
        "rollback_timeout_secs": rollback_timeout_secs
    });

    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let upgrade_fut = Box::pin(async move {
        // Yield momentarily to let the WebSocket frame flush
        tokio::time::sleep(Duration::from_millis(1500)).await;

        let staging_path = std::path::PathBuf::from("C:\\ProgramData\\MSP\\updates")
            .join(format!("msp-agent-v{}.staged", target_version));

        info!("[agent] Commencing OTA download from {}...", download_url);
        if let Err(e) =
            upgrade::download_and_verify(&download_url, &sha256_checksum, &staging_path).await
        {
            error!("[agent] Upgrade download/verification failed: {}", e);
            return;
        }

        info!("[agent] Checksum verified. Executing atomic move swap...");
        match upgrade::execute_atomic_swap(
            &target_version,
            &current_version,
            &staging_path,
            rollback_timeout_secs,
        ) {
            Ok(_) => {
                info!("[agent] Atomic move swap succeeded! Triggering service restart...");
                upgrade::trigger_service_restart();
            }
            Err(e) => {
                error!("[agent] Atomic move swap failed: {}", e);
            }
        }
    });

    (ack, Some(upgrade_fut))
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

/// Executes the server's UNBIND command: unlinks from slot, generates a fresh
/// pairing code, and persists the unbound state.
fn handle_unbind(_envelope: &AgentEnvelope) -> Value {
    let mut state = AgentState::load();
    let new_code = state.unbind();
    if let Err(err) = state.save() {
        error!("[agent] Failed to persist unbound state: {}", err);
        return serde_json::json!({
            "success": false,
            "error": format!("Failed to persist unbound state: {err}")
        });
    }

    info!("Device unlinked from slot by client. Reconnecting in pairing mode.");
    print_pairing_banner(&state);
    serde_json::json!({
        "success": true,
        "pairing_code": new_code,
        "pairing_code_expires_at": state.pairing_code_expires_at
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
    println!("MSP Endpoint Agent v{} — Lightweight background agent for remote diagnostics,", env!("CARGO_PKG_VERSION"));
    println!("event log queries, security audits, telemetry, and automated service remediation.");
    println!("");
    println!("Usage:");
    println!("  msp-agent.exe [COMMAND] [OPTIONS]");
    println!("  msp-agent.exe --install-service [OPTIONS]");
    println!("");
    println!("Commands & Service Flags:");
    println!("  install, --install-service     Register and configure as an automatic Windows Service (Run as Admin)");
    println!("  uninstall, --uninstall-service Stop and delete the Windows Background Service (Run as Admin)");
    println!("  start, --start-service         Start the installed Windows Background Service");
    println!("  stop, --stop-service           Stop the running Windows Background Service");
    println!("  status, --status-service       Display current service status (RUNNING / STOPPED) and PID");
    println!("  log, logs                      Print recent service execution logs from 'C:\\ProgramData\\MSP\\msp-agent.log'");
    println!("  console                        Run interactively in foreground console mode (default)");
    println!("");
    println!("Options for Silent Deployment & Configuration:");
    println!("  -g, --gateway <URL>            Override WebSocket gateway URL (e.g. wss://api.yourmsp.com/agent-ws)");
    println!("  -t, --token <TOKEN>            Pre-configure pre-shared agent authentication secret on install");
    println!("  -s, --silent, --unattended     Silent unattended installation without interactive prompts");
    println!("  --no-autostart                 Do not automatically start the service immediately after install");
    println!("  -h, --help                     Print this help documentation");
    println!("  -V, --version                  Print version information");
    println!("  --service                      Internal flag invoked by Windows Service Control Manager (SCM)");
    println!("");
    println!("Protected Paths:");
    println!("  Binary:          C:\\Program Files\\MSP\\msp-agent\\msp-agent.exe");
    println!("  State & Config:  C:\\ProgramData\\MSP\\msp-agent.json");
    println!("  Service Log:     C:\\ProgramData\\MSP\\msp-agent.log");
    println!("");
    println!("Environment Variables:");
    println!("  MSP_GATEWAY_URL          WebSocket gateway URL (default: wss://helpdesk.velmartech.com.do/agent-ws)");
    println!("  MSP_AGENT_ID             Equipment UUID override (auto-generated if unset)");
    println!("  MSP_AGENT_TOKEN          Pre-shared secret for authentication (default: \"dev-token\" if empty)");
    println!("  MSP_AGENT_CONFIG         Custom directory path for msp-agent.json");
    println!("  MSP_AGENT_LOG            Custom file path for service log file");
    println!("  MSP_RECONNECT_DELAY      Initial reconnection delay in seconds (default: 5)");
    println!("  MSP_MAX_RECONNECT_DELAY  Maximum reconnection delay ceiling in seconds (default: 120)");
    println!("");
    println!("Silent Mass Deployment Examples (GPO / Intune / RMM):");
    println!("  1. Silent Install & Start:     .\\msp-agent.exe --install-service --gateway wss://api.yourmsp.com/agent-ws --token <TOKEN> --silent");
    println!("  2. Standard Admin Install:     .\\msp-agent.exe install --gateway ws://localhost:3001/agent-ws");
    println!("  3. Uninstall Silently:         .\\msp-agent.exe --uninstall-service --silent");
    println!("  4. Query Status:               .\\msp-agent.exe status");
    println!("");
    println!("The agent makes an outbound TLS WebSocket connection, operating behind NAT and firewalls.");
}

/// Main async agent connection and command execution loop.
pub async fn run_agent_loop(config: AgentConfig) {
    let mut delay = config.reconnect_delay_secs;

    let mut state = AgentState::load();
    // Unbound agents must always hold a live 6-digit pairing code so the
    // portal can link this device to a subscription slot. Issue one on first
    // boot or after a code expires, and display it once on startup.
    if !state.is_bound() {
        if state.active_pairing_code().is_none() {
            state.issue_pairing_code();
            if let Err(err) = state.save() {
                error!("[agent] Failed to persist initial pairing code: {}", err);
            }
        }
        print_pairing_banner(&state);
    }
    info!(
        "MSP Endpoint Agent v{} starting. Agent ID: {}",
        env!("CARGO_PKG_VERSION"),
        state.instance_id
    );

    // Start local named pipe IPC server for desktop tray companion
    ipc_server::start_ipc_server(config.clone());

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

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();

    if args.contains(&"--help".to_string()) || args.contains(&"-h".to_string()) {
        print_help();
        return Ok(());
    }
    if args.contains(&"--version".to_string()) || args.contains(&"-V".to_string()) {
        println!("msp-agent {}", env!("CARGO_PKG_VERSION"));
        return Ok(());
    }

    let gateway_override = extract_gateway_arg(&args);
    let token_override = extract_token_arg(&args);
    let silent = args.iter().any(|a| a == "--silent" || a == "-s" || a == "--unattended");
    let autostart = !args.iter().any(|a| a == "--no-autostart" || a == "--autostart=false");

    // Windows Service Management CLI Subcommands & Flags
    if args.iter().any(|a| a == "install" || a == "--install-service" || a == "-i") {
        return service::windows_service_impl::install(gateway_override, token_override, silent, autostart);
    }
    if args.iter().any(|a| a == "uninstall" || a == "--uninstall-service" || a == "remove" || a == "-u") {
        return service::windows_service_impl::uninstall();
    }
    if args.iter().any(|a| a == "start" || a == "--start-service") {
        return service::windows_service_impl::start();
    }
    if args.iter().any(|a| a == "stop" || a == "--stop-service") {
        return service::windows_service_impl::stop();
    }
    if args.iter().any(|a| a == "status" || a == "--status-service") {
        return service::windows_service_impl::status();
    }
    if args.iter().any(|a| a == "log" || a == "logs") {
        let path = log_file_path();
        if path.exists() {
            println!("Service Log: {:?}\n---", path);
            match std::fs::read_to_string(&path) {
                Ok(content) => {
                    let lines: Vec<&str> = content.lines().collect();
                    let start = if lines.len() > 100 { lines.len() - 100 } else { 0 };
                    for line in &lines[start..] {
                        println!("{}", line);
                    }
                }
                Err(e) => eprintln!("Failed to read log file: {}", e),
            }
        } else {
            println!("No log file found at {:?}", path);
        }
        return Ok(());
    }

    init_logger();

    // Inspect sentinel state for any pending rollback check
    upgrade::check_and_handle_rollback();

    // If spawned by Windows Service Control Manager (SCM) or with --service flag
    if args.iter().any(|a| a == "--service") {
        if let Err(e) = service::windows_service_impl::dispatch() {
            eprintln!("Failed to start Windows service dispatcher: {:?}", e);
        }
        return Ok(());
    }

    let config = AgentConfig::from_args_and_env(&args);

    // Interactive console mode / standalone execution
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;

    rt.block_on(async {
        run_agent_loop(config).await;
    });

    Ok(())
}

/// Returns the path to the persistent service log file.
pub fn log_file_path() -> std::path::PathBuf {
    if let Ok(over) = std::env::var("MSP_AGENT_LOG") {
        return std::path::PathBuf::from(over);
    }
    #[cfg(windows)]
    {
        if let Ok(prog_data) = std::env::var("ProgramData") {
            let msp_dir = std::path::PathBuf::from(prog_data).join("MSP");
            let _ = std::fs::create_dir_all(&msp_dir);
            return msp_dir.join("msp-agent.log");
        }
    }
    let dir = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    dir.join("msp-agent.log")
}

struct DualWriter {
    file: Option<std::sync::Mutex<std::fs::File>>,
}

impl std::io::Write for DualWriter {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let _ = std::io::stdout().write_all(buf);
        if let Some(ref f) = self.file {
            if let Ok(mut handle) = f.lock() {
                let _ = handle.write_all(buf);
            }
        }
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        let _ = std::io::stdout().flush();
        if let Some(ref f) = self.file {
            if let Ok(mut handle) = f.lock() {
                let _ = handle.flush();
            }
        }
        Ok(())
    }
}

fn init_logger() {
    let log_path = log_file_path();
    let file_handle = if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
        std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .ok()
    } else {
        None
    };

    let writer = DualWriter {
        file: file_handle.map(std::sync::Mutex::new),
    };

    let _ = env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .target(env_logger::Target::Pipe(Box::new(writer)))
        .try_init();
}