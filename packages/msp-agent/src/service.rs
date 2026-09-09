#[cfg(windows)]
pub mod windows_service_impl {
    use std::ffi::OsString;
    use std::path::PathBuf;
    use std::time::Duration;
    use windows_service::{
        define_windows_service,
        service::{
            ServiceAccess, ServiceControl, ServiceControlAccept, ServiceErrorControl,
            ServiceExitCode, ServiceInfo, ServiceStartType, ServiceState, ServiceStatus, ServiceType,
        },
        service_control_handler::{self, ServiceControlHandlerResult},
        service_dispatcher,
        service_manager::{ServiceManager, ServiceManagerAccess},
    };

    pub const SERVICE_NAME: &str = "MSPEndpointAgent";
    pub const SERVICE_DISPLAY_NAME: &str = "MSP Endpoint Agent";
    pub const SERVICE_DESCRIPTION: &str =
        "Velmar Technology MSP Endpoint Agent — background service for remote diagnostics, patch scans, security audits, and telemetry.";

    define_windows_service!(ffi_service_main, my_service_main);

    fn my_service_main(_arguments: Vec<OsString>) {
        let args: Vec<String> = std::env::args().collect();
        let config = crate::AgentConfig::from_args_and_env(&args);
        if let Err(err) = run_service_internal(config) {
            log::error!("[Service] Error running service: {:?}", err);
        }
    }

    fn run_service_internal(config: crate::AgentConfig) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let (shutdown_tx, mut shutdown_rx) = tokio::sync::mpsc::channel::<()>(1);

        let event_handler = move |control_event| -> ServiceControlHandlerResult {
            match control_event {
                ServiceControl::Stop | ServiceControl::Shutdown => {
                    log::info!("[Service] Stop/Shutdown control signal received from SCM.");
                    let _ = shutdown_tx.blocking_send(());
                    ServiceControlHandlerResult::NoError
                }
                ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
                _ => ServiceControlHandlerResult::NotImplemented,
            }
        };

        let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

        status_handle.set_service_status(ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::Running,
            controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        })?;

        // Inspect sentinel state for any pending rollback check before launching runtime
        crate::upgrade::check_and_handle_rollback();

        // Initialize and run the Tokio runtime for async background agent operations
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()?;

        rt.block_on(async {
            log::info!("[Service] MSP Endpoint Agent service started (Gateway: {}).", config.gateway_url);
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    log::info!("[Service] Shutdown signal received, terminating agent loop.");
                }
                _ = crate::run_agent_loop(config) => {
                    log::warn!("[Service] Agent loop terminated unexpectedly.");
                }
            }
        });

        status_handle.set_service_status(ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::Stopped,
            controls_accepted: ServiceControlAccept::empty(),
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        })?;

        log::info!("[Service] MSP Endpoint Agent service stopped cleanly.");
        Ok(())
    }

    /// Dispatches service execution to the Windows Service Control Manager.
    pub fn dispatch() -> Result<(), windows_service::Error> {
        service_dispatcher::start(SERVICE_NAME, ffi_service_main)
    }

    /// Installs this binary as an automatic background Windows service.
    /// If executed from a temporary location (e.g. Downloads / Desktop), it
    /// automatically relocates itself to a protected system folder (`C:\Program Files\MSP\msp-agent\`).
    pub fn install(
        gateway_override: Option<String>,
        token_override: Option<String>,
        silent: bool,
        autostart: bool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let current_exe: PathBuf = std::env::current_exe()?;
        let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| r"C:\Program Files".into());
        let target_dir = PathBuf::from(program_files).join("MSP").join("msp-agent");
        let target_exe = target_dir.join("msp-agent.exe");

        let is_in_target = current_exe
            .parent()
            .map(|p| p == target_dir)
            .unwrap_or(false);

        // 1. If service is already installed and running, stop it before copying new binary
        if let Ok(manager) = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT) {
            if let Ok(service) = manager.open_service(
                SERVICE_NAME,
                ServiceAccess::STOP | ServiceAccess::QUERY_STATUS,
            ) {
                if let Ok(status) = service.query_status() {
                    if status.current_state == ServiceState::Running {
                        if !silent {
                            println!("Stopping active background service before reinstalling...");
                        }
                        let _ = service.stop();
                        for _ in 0..10 {
                            std::thread::sleep(Duration::from_millis(500));
                            if let Ok(st) = service.query_status() {
                                if st.current_state == ServiceState::Stopped {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        let final_exe = if !is_in_target {
            if !silent {
                println!("Relocating agent binary to protected system folder...");
            }
            if let Err(err) = std::fs::create_dir_all(&target_dir) {
                if err.raw_os_error() == Some(5) {
                    return Err("Access denied. Please run as Administrator.".into());
                }
                return Err(err.into());
            }

            if let Err(err) = std::fs::copy(&current_exe, &target_exe) {
                if err.raw_os_error() == Some(5) {
                    return Err("Access denied. Please run as Administrator.".into());
                }
                if err.raw_os_error() == Some(32) {
                    return Err("Cannot overwrite active binary. Run '.\\msp-agent.exe stop' first, then retry install.".into());
                }
                return Err(err.into());
            }
            if !silent {
                println!("Protected Binary: {:?}", target_exe);
            }

            // Copy any existing config to ProgramData
            if let Ok(prog_data) = std::env::var("ProgramData") {
                let prog_data_dir = PathBuf::from(prog_data).join("MSP");
                let _ = std::fs::create_dir_all(&prog_data_dir);
                if let Some(parent) = current_exe.parent() {
                    let local_config = parent.join("msp-agent.json");
                    if local_config.exists() {
                        let target_config = prog_data_dir.join("msp-agent.json");
                        let _ = std::fs::copy(&local_config, &target_config);
                        if !silent {
                            println!("Protected Config: {:?}", target_config);
                        }
                    }
                }
            }

            target_exe
        } else {
            current_exe
        };

        // Provision token if provided during silent or command-line installation
        if let Some(ref tok) = token_override {
            let mut state = crate::pairing::AgentState::load();
            state.agent_token = Some(tok.clone());
            if let Err(e) = state.save() {
                log::warn!("Failed to persist pre-shared token on install: {}", e);
            } else if !silent {
                println!("Pre-shared token successfully configured.");
            }
        }

        let manager_access = ServiceManagerAccess::CONNECT | ServiceManagerAccess::CREATE_SERVICE;
        let service_manager = ServiceManager::local_computer(None::<&str>, manager_access)?;

        let mut launch_arguments: Vec<OsString> = vec!["--service".into()];
        if let Some(ref gw) = gateway_override {
            launch_arguments.push("--gateway".into());
            launch_arguments.push(gw.into());
        }

        let service_info = ServiceInfo {
            name: SERVICE_NAME.into(),
            display_name: SERVICE_DISPLAY_NAME.into(),
            service_type: ServiceType::OWN_PROCESS,
            start_type: ServiceStartType::AutoStart,
            error_control: ServiceErrorControl::Normal,
            executable_path: final_exe.clone(),
            launch_arguments,
            dependencies: vec![],
            account_name: None, // Runs as LocalSystem
            account_password: None,
        };

        match service_manager.create_service(&service_info, ServiceAccess::CHANGE_CONFIG) {
            Ok(service) => {
                let _ = service.set_description(SERVICE_DESCRIPTION);
            }
            Err(e) => {
                // If service already exists, ensure description is updated
                if let Ok(service) = service_manager.open_service(SERVICE_NAME, ServiceAccess::CHANGE_CONFIG) {
                    let _ = service.set_description(SERVICE_DESCRIPTION);
                } else {
                    return Err(Box::new(e));
                }
            }
        }

        if !silent {
            println!("\n==================================================");
            println!("  MSP ENDPOINT AGENT INSTALLED SUCCESSFULLY");
            println!("==================================================");
            println!("Service Name:   {}", SERVICE_NAME);
            println!("Protected Path: {:?}", final_exe);
            println!("Config Path:    C:\\ProgramData\\MSP\\msp-agent.json");
            if let Some(ref gw) = gateway_override {
                println!("Gateway URL:    {}", gw);
            }
            println!("Start Type:     Automatic (starts on Windows boot)");
            println!("==================================================");
        }

        if autostart {
            if let Err(e) = start() {
                if !silent {
                    println!("Service installed, but automatic start returned: {}", e);
                }
            } else if !silent {
                println!("Service started successfully in background.");
            }
        } else if !silent {
            println!("Run 'msp-agent.exe start' to start the service.");
        }

        Ok(())
    }

    /// Uninstalls and deletes the Windows service.
    pub fn uninstall() -> Result<(), Box<dyn std::error::Error>> {
        let manager_access = ServiceManagerAccess::CONNECT;
        let service_manager = ServiceManager::local_computer(None::<&str>, manager_access)?;

        let service_access = ServiceAccess::STOP | ServiceAccess::DELETE | ServiceAccess::QUERY_STATUS;
        let service = match service_manager.open_service(SERVICE_NAME, service_access) {
            Ok(s) => s,
            Err(e) => {
                println!("Service '{}' is not installed ({})", SERVICE_NAME, e);
                return Ok(());
            }
        };

        if let Ok(status) = service.query_status() {
            if status.current_state == ServiceState::Running {
                println!("Stopping running service before deletion...");
                let _ = service.stop();
                std::thread::sleep(Duration::from_millis(500));
            }
        }

        service.delete()?;
        println!("Successfully uninstalled '{}' Windows Service.", SERVICE_NAME);
        Ok(())
    }

    /// Starts the background Windows service.
    pub fn start() -> Result<(), Box<dyn std::error::Error>> {
        let manager_access = ServiceManagerAccess::CONNECT;
        let service_manager = ServiceManager::local_computer(None::<&str>, manager_access)?;

        let service_access = ServiceAccess::START | ServiceAccess::QUERY_STATUS;
        let service = service_manager.open_service(SERVICE_NAME, service_access)?;

        let status = service.query_status()?;
        if status.current_state == ServiceState::Running {
            println!("Service '{}' is already running.", SERVICE_NAME);
            return Ok(());
        }

        service.start::<&str>(&[])?;
        println!("Successfully sent start command to '{}'.", SERVICE_NAME);
        Ok(())
    }

    /// Stops the background Windows service.
    pub fn stop() -> Result<(), Box<dyn std::error::Error>> {
        let manager_access = ServiceManagerAccess::CONNECT;
        let service_manager = ServiceManager::local_computer(None::<&str>, manager_access)?;

        let service_access = ServiceAccess::STOP | ServiceAccess::QUERY_STATUS;
        let service = service_manager.open_service(SERVICE_NAME, service_access)?;

        let status = service.query_status()?;
        if status.current_state == ServiceState::Stopped {
            println!("Service '{}' is already stopped.", SERVICE_NAME);
            return Ok(());
        }

        service.stop()?;
        println!("Successfully sent stop command to '{}'.", SERVICE_NAME);
        Ok(())
    }

    /// Queries and prints the background Windows service status.
    pub fn status() -> Result<(), Box<dyn std::error::Error>> {
        let manager_access = ServiceManagerAccess::CONNECT;
        let service_manager = ServiceManager::local_computer(None::<&str>, manager_access)?;

        let service_access = ServiceAccess::QUERY_STATUS;
        let service = match service_manager.open_service(SERVICE_NAME, service_access) {
            Ok(s) => s,
            Err(e) => {
                println!("Service '{}' is not installed ({})", SERVICE_NAME, e);
                return Ok(());
            }
        };

        let status = service.query_status()?;
        let state_str = match status.current_state {
            ServiceState::Running => "RUNNING",
            ServiceState::Stopped => "STOPPED",
            ServiceState::StartPending => "START_PENDING",
            ServiceState::StopPending => "STOP_PENDING",
            ServiceState::Paused => "PAUSED",
            ServiceState::PausePending => "PAUSE_PENDING",
            ServiceState::ContinuePending => "CONTINUE_PENDING",
        };

        println!("Service Name: {}", SERVICE_NAME);
        println!("Display Name: {}", SERVICE_DISPLAY_NAME);
        println!("State:        {}", state_str);
        println!("Process ID:   {:?}", status.process_id);
        Ok(())
    }
}

#[cfg(not(windows))]
pub mod windows_service_impl {
    pub fn dispatch() -> Result<(), String> {
        Err("Windows services are only supported on Windows".into())
    }
    pub fn install(
        _gateway_override: Option<String>,
        _token_override: Option<String>,
        _silent: bool,
        _autostart: bool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        println!("Service management is only supported on Windows.");
        Ok(())
    }
    pub fn uninstall() -> Result<(), Box<dyn std::error::Error>> {
        println!("Service management is only supported on Windows.");
        Ok(())
    }
    pub fn start() -> Result<(), Box<dyn std::error::Error>> {
        println!("Service management is only supported on Windows.");
        Ok(())
    }
    pub fn stop() -> Result<(), Box<dyn std::error::Error>> {
        println!("Service management is only supported on Windows.");
        Ok(())
    }
    pub fn status() -> Result<(), Box<dyn std::error::Error>> {
        println!("Service management is only supported on Windows.");
        Ok(())
    }
}
