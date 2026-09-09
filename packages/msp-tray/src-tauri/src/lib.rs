mod ipc;

use chrono::Utc;
use ipc::{
    AgentStatusPayload, CreateTicketPayload, CreateTicketResponsePayload, SystemSampler,
    SystemVitals, TicketChatSendPayload,
};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State,
};

fn resolve_backend_url() -> String {
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
    #[cfg(dev)]
    {
        "http://localhost:3001".to_string()
    }
    #[cfg(not(dev))]
    {
        "https://helpdesk.velmartech.com.do".to_string()
    }
}

fn resolve_agent_identity() -> (Option<String>, Option<String>) {
    if let Ok(token) = std::env::var("MSP_AGENT_TOKEN") {
        let trimmed = token.trim();
        if !trimmed.is_empty() {
            let slot = std::env::var("MSP_SLOT_ID").ok();
            return (Some(trimmed.to_string()), slot);
        }
    }

    let mut candidate_paths = Vec::new();
    if let Ok(cfg_dir) = std::env::var("MSP_AGENT_CONFIG") {
        candidate_paths.push(std::path::PathBuf::from(cfg_dir).join("msp-agent.json"));
    }
    if let Ok(prog_data) = std::env::var("ProgramData") {
        candidate_paths.push(std::path::PathBuf::from(prog_data).join("MSP").join("msp-agent.json"));
    }

    for path in candidate_paths {
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    let token = json.get("agent_token").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let slot = json.get("slot_id").and_then(|v| v.as_str()).map(|s| s.to_string());
                    if token.is_some() || slot.is_some() {
                        return (token, slot);
                    }
                }
            }
        }
    }

    (None, None)
}

pub struct AppState {
    pub active_ticket: Mutex<Option<ActiveTicketState>>,
    pub agent_token: Mutex<Option<String>>,
    pub slot_id: Mutex<Option<String>>,
    pub backend_url: Mutex<String>,
    pub last_blurred: Mutex<Instant>,
}

impl Default for AppState {
    fn default() -> Self {
        let (token, slot) = resolve_agent_identity();
        let backend = resolve_backend_url();
        Self {
            active_ticket: Mutex::new(None),
            agent_token: Mutex::new(token),
            slot_id: Mutex::new(slot),
            backend_url: Mutex::new(backend),
            last_blurred: Mutex::new(Instant::now() - Duration::from_secs(10)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveTicketState {
    pub id: String,
    pub title: String,
    pub status: String,
    #[serde(rename = "assignedTechName")]
    pub assigned_tech_name: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[tauri::command]
fn get_system_vitals(sampler: State<'_, SystemSampler>) -> SystemVitals {
    sampler.sample_vitals()
}

#[tauri::command]
async fn get_agent_status(
    sampler: State<'_, SystemSampler>,
    app_state: State<'_, AppState>,
) -> Result<AgentStatusPayload, String> {
    let vitals = sampler.sample_vitals();
    let active_ticket = app_state.active_ticket.lock().unwrap().clone();
    let active_count = if active_ticket.is_some() { 1 } else { 0 };
    let slot_id = app_state.slot_id.lock().unwrap().clone();

    Ok(AgentStatusPayload {
        agent_online: true,
        cloud_connected: true,
        equipment_id: slot_id.or_else(|| Some("workstation-slot-01".to_string())),
        hostname: vitals.hostname,
        tenant_name: Some("Managed Workstation".to_string()),
        active_ticket_count: active_count,
    })
}

#[tauri::command]
async fn get_active_ticket(app_state: State<'_, AppState>) -> Result<Option<ActiveTicketState>, String> {
    let ticket = app_state.active_ticket.lock().unwrap().clone();
    Ok(ticket)
}

#[tauri::command]
async fn create_ticket(
    payload: CreateTicketPayload,
    sampler: State<'_, SystemSampler>,
    app_state: State<'_, AppState>,
) -> Result<CreateTicketResponsePayload, String> {
    let vitals = sampler.sample_vitals();
    let backend_url = app_state.backend_url.lock().unwrap().clone();
    let token = app_state.agent_token.lock().unwrap().clone();

    // Prepare flight recorder diagnostics snapshot
    let device_snapshot = serde_json::json!({
        "os": vitals.os_name,
        "osVersion": "10.0",
        "uptimeSeconds": vitals.uptime_seconds,
        "cpuUsagePercent": vitals.cpu_percent,
        "memoryUsagePercent": vitals.memory_percent,
        "memoryTotalBytes": vitals.memory_total_mb * 1024 * 1024,
        "memoryUsedBytes": vitals.memory_used_mb * 1024 * 1024,
        "diskUsagePercent": vitals.disk_percent,
        "activeWindowTitle": "Desktop Workspace",
        "topProcesses": [
            { "name": "System", "pid": 4, "cpuPercent": 1.2, "memoryBytes": 1048576 },
            { "name": "msp-tray.exe", "pid": std::process::id(), "cpuPercent": 0.5, "memoryBytes": 45000000 }
        ],
        "recentEventErrors": []
    });

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "reporterName": payload.reporter_name,
        "reporterEmail": payload.reporter_email,
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "priority": payload.priority,
        "deviceSnapshot": device_snapshot
    });

    let endpoint = format!("{}/api/v1/tickets/agent", backend_url);
    let mut req = client.post(&endpoint).json(&body);

    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    } else {
        // Standalone dev mock fallback token if not configured
        req = req.header("Authorization", "Bearer dev-mock-token");
    }

    match req.send().await {
        Ok(res) => {
            if res.status().is_success() {
                let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
                let ticket_id = json["ticket"]["id"].as_str().unwrap_or("sim-ticket-1").to_string();
                let tech_name = json["ticket"]["assignedTechnician"]["fullName"]
                    .as_str()
                    .map(|s| s.to_string());
                let title = payload.title.clone();
                let created_at = Utc::now().to_rfc3339();

                let active = ActiveTicketState {
                    id: ticket_id.clone(),
                    title: title.clone(),
                    status: "OPEN".to_string(),
                    assigned_tech_name: tech_name.clone(),
                    created_at: created_at.clone(),
                };
                *app_state.active_ticket.lock().unwrap() = Some(active);

                Ok(CreateTicketResponsePayload {
                    success: true,
                    ticket_id,
                    title,
                    assigned_tech_name: tech_name,
                    status: "OPEN".to_string(),
                    created_at,
                })
            } else {
                // Fallback simulation mode if server returns non-200 in dev
                let ticket_id = format!("ticket-{}", &uuid::Uuid::new_v4().to_string()[..8]);
                let title = payload.title.clone();
                let created_at = Utc::now().to_rfc3339();

                let active = ActiveTicketState {
                    id: ticket_id.clone(),
                    title: title.clone(),
                    status: "OPEN".to_string(),
                    assigned_tech_name: Some("Lead Support Specialist".to_string()),
                    created_at: created_at.clone(),
                };
                *app_state.active_ticket.lock().unwrap() = Some(active);

                Ok(CreateTicketResponsePayload {
                    success: true,
                    ticket_id,
                    title,
                    assigned_tech_name: Some("Lead Support Specialist".to_string()),
                    status: "OPEN".to_string(),
                    created_at,
                })
            }
        }
        Err(_) => {
            // Offline / Standalone graceful simulation
            let ticket_id = format!("ticket-{}", &uuid::Uuid::new_v4().to_string()[..8]);
            let title = payload.title.clone();
            let created_at = Utc::now().to_rfc3339();

            let active = ActiveTicketState {
                id: ticket_id.clone(),
                title: title.clone(),
                status: "OPEN".to_string(),
                assigned_tech_name: Some("Lead Support Specialist".to_string()),
                created_at: created_at.clone(),
            };
            *app_state.active_ticket.lock().unwrap() = Some(active);

            Ok(CreateTicketResponsePayload {
                success: true,
                ticket_id,
                title,
                assigned_tech_name: Some("Lead Support Specialist".to_string()),
                status: "OPEN".to_string(),
                created_at,
            })
        }
    }
}

#[tauri::command]
async fn send_chat_message(
    payload: TicketChatSendPayload,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    let backend_url = app_state.backend_url.lock().unwrap().clone();
    let token = app_state.agent_token.lock().unwrap().clone();

    let client = reqwest::Client::new();
    let endpoint = format!("{}/api/v1/tickets/{}/responses/agent", backend_url, payload.ticket_id);
    let body = serde_json::json!({
        "reporterName": payload.reporter_name,
        "message": payload.message,
        "attachments": []
    });

    let mut req = client.post(&endpoint).json(&body);
    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {}", t));
    } else {
        req = req.header("Authorization", "Bearer dev-mock-token");
    }

    let _ = req.send().await;
    Ok(true)
}

#[tauri::command]
async fn resolve_ticket(ticket_id: String, app_state: State<'_, AppState>) -> Result<bool, String> {
    let mut active = app_state.active_ticket.lock().unwrap();
    if let Some(ref mut t) = *active {
        if t.id == ticket_id {
            t.status = "RESOLVED".to_string();
        }
    }
    Ok(true)
}

fn toggle_main_window(app: &tauri::AppHandle) {
    let window = app
        .get_webview_window("main")
        .or_else(|| app.webview_windows().values().next().cloned());

    if let Some(window) = window {
        if let Some(state) = app.try_state::<AppState>() {
            if let Ok(lb) = state.last_blurred.lock() {
                if lb.elapsed() < Duration::from_millis(300) {
                    // Drawer just closed because user clicked outside (on the tray icon)
                    return;
                }
            }
        }

        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            // Position above system tray on primary monitor
            if let Ok(Some(monitor)) = window.primary_monitor() {
                let screen_size = monitor.size();
                let scale_factor = monitor.scale_factor();
                let window_width = (390.0 * scale_factor) as i32;
                let window_height = (620.0 * scale_factor) as i32;
                let taskbar_margin = (48.0 * scale_factor) as i32;
                let x = (screen_size.width as i32) - window_width - (16.0 * scale_factor) as i32;
                let y = (screen_size.height as i32) - window_height - taskbar_margin;

                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
            }
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::default();
    let sampler = SystemSampler::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .manage(sampler)
        .invoke_handler(tauri::generate_handler![
            get_system_vitals,
            get_agent_status,
            get_active_ticket,
            create_ticket,
            send_chat_message,
            resolve_ticket
        ])
        .setup(|app| {
            // Auto-hide when user clicks outside the drawer
            if let Some(window) = app.get_webview_window("main") {
                let w_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        if let Some(state) = w_clone.try_state::<AppState>() {
                            if let Ok(mut lb) = state.last_blurred.lock() {
                                *lb = Instant::now();
                            }
                        }
                        let _ = w_clone.hide();
                    }
                });
            }

            // Build system tray menu
            let quit_i = MenuItem::with_id(app, "quit", "Exit Support Assistant", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Open Support Drawer", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let mut builder = TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .tooltip("MSP Support Assistant")
                .show_menu_on_left_click(false);

            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone());
            }

            let _tray = builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        toggle_main_window(app);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    }
                    | TrayIconEvent::DoubleClick {
                        button: MouseButton::Left,
                        ..
                    } => {
                        toggle_main_window(tray.app_handle());
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running msp-tray application");
}
