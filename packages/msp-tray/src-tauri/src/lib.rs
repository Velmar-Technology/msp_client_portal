mod ipc;

use ipc::{
    ActiveTicketState, AgentStatusPayload, CreateTicketPayload, CreateTicketResponsePayload,
    IpcClient, SystemSampler, SystemVitals, TicketChatSendPayload, TicketMessageItem,
};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State,
};

pub struct AppState {
    pub active_ticket: Mutex<Option<ActiveTicketState>>,
    pub last_blurred: Mutex<Instant>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            active_ticket: Mutex::new(None),
            last_blurred: Mutex::new(Instant::now() - Duration::from_secs(10)),
        }
    }
}

#[tauri::command]
fn get_system_vitals(sampler: State<'_, SystemSampler>) -> SystemVitals {
    sampler.sample_vitals()
}

#[tauri::command]
async fn get_agent_status(
    sampler: State<'_, SystemSampler>,
    ipc_client: State<'_, IpcClient>,
    app_state: State<'_, AppState>,
) -> Result<AgentStatusPayload, String> {
    if ipc_client.is_connected() {
        if let Ok(status) = ipc_client
            .send_request::<serde_json::Value, AgentStatusPayload>("GET_AGENT_STATUS", serde_json::json!({}))
            .await
        {
            return Ok(status);
        }
    }

    let vitals = sampler.sample_vitals();
    let active_ticket = app_state.active_ticket.lock().unwrap().clone();
    let active_count = if active_ticket.is_some() { 1 } else { 0 };

    Ok(AgentStatusPayload {
        agent_online: false,
        cloud_connected: false,
        equipment_id: None,
        hostname: vitals.hostname,
        tenant_name: None,
        active_ticket_count: active_count,
    })
}

#[tauri::command]
async fn get_active_ticket(
    ipc_client: State<'_, IpcClient>,
    app_state: State<'_, AppState>,
) -> Result<Option<ActiveTicketState>, String> {
    if ipc_client.is_connected() {
        if let Ok(ticket) = ipc_client
            .send_request::<serde_json::Value, Option<ActiveTicketState>>(
                "GET_ACTIVE_TICKET",
                serde_json::json!({}),
            )
            .await
        {
            *app_state.active_ticket.lock().unwrap() = ticket.clone();
            return Ok(ticket);
        }
    }
    let ticket = app_state.active_ticket.lock().unwrap().clone();
    Ok(ticket)
}

#[tauri::command]
async fn get_ticket_responses(
    ticket_id: String,
    ipc_client: State<'_, IpcClient>,
) -> Result<Vec<TicketMessageItem>, String> {
    if ipc_client.is_connected() {
        ipc_client
            .send_request("GET_TICKET_RESPONSES", serde_json::json!({ "ticketId": ticket_id }))
            .await
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
async fn create_ticket(
    payload: CreateTicketPayload,
    ipc_client: State<'_, IpcClient>,
    app_state: State<'_, AppState>,
) -> Result<CreateTicketResponsePayload, String> {
    if ipc_client.is_connected() {
        let resp: CreateTicketResponsePayload = ipc_client
            .send_request("CREATE_TICKET", payload)
            .await?;

        let active = ActiveTicketState {
            id: resp.ticket_id.clone(),
            title: resp.title.clone(),
            status: resp.status.clone(),
            assigned_tech_name: resp.assigned_tech_name.clone(),
            created_at: resp.created_at.clone(),
        };
        *app_state.active_ticket.lock().unwrap() = Some(active);

        Ok(resp)
    } else {
        Err("MSP Agent background service is not connected. Unable to submit ticket to support desk.".to_string())
    }
}

#[tauri::command]
async fn send_chat_message(
    payload: TicketChatSendPayload,
    ipc_client: State<'_, IpcClient>,
) -> Result<bool, String> {
    if ipc_client.is_connected() {
        let _: serde_json::Value = ipc_client
            .send_request("SEND_CHAT_MESSAGE", payload)
            .await?;
        Ok(true)
    } else {
        Err("MSP Agent background service is not connected.".to_string())
    }
}

#[tauri::command]
async fn resolve_ticket(
    ticket_id: String,
    ipc_client: State<'_, IpcClient>,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    if ipc_client.is_connected() {
        let _ = ipc_client
            .send_request::<serde_json::Value, serde_json::Value>(
                "RESOLVE_TICKET",
                serde_json::json!({ "ticketId": ticket_id }),
            )
            .await;
    }
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
            get_ticket_responses,
            create_ticket,
            send_chat_message,
            resolve_ticket
        ])
        .setup(|app| {
            let ipc_client = IpcClient::new(app.handle().clone());
            app.manage(ipc_client);

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

            // Automatically open drawer window on initial launch
            toggle_main_window(app.handle());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running msp-tray application");
}
