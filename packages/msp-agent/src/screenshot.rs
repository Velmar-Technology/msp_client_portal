use chrono::Utc;
use log::warn;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualScreenMetrics {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scaled_width: u32,
    pub scaled_height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotResult {
    pub success: bool,
    pub displays_count: u32,
    pub virtual_screen: VirtualScreenMetrics,
    pub mime_type: String,
    pub image_base64: String,
    pub captured_at: String,
    pub session_state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[cfg(windows)]
pub mod win_capture {
    use super::*;
    use base64::prelude::*;
    use image::codecs::jpeg::JpegEncoder;
    use image::{DynamicImage, ImageBuffer, Rgb};
    use std::io::Cursor;
    use std::ptr;
    use widestring::U16CString;
    use windows_sys::Win32::Foundation::{CloseHandle, FALSE, HANDLE};
    use windows_sys::Win32::Graphics::Gdi::*;
    use windows_sys::Win32::Security::{
        DuplicateTokenEx, SecurityImpersonation, TokenPrimary, TOKEN_ALL_ACCESS,
    };
    use windows_sys::Win32::System::RemoteDesktop::{
        WTSGetActiveConsoleSessionId, WTSQueryUserToken,
    };
    use windows_sys::Win32::System::Threading::{
        CreateProcessAsUserW, GetExitCodeProcess, WaitForSingleObject, CREATE_NO_WINDOW,
        NORMAL_PRIORITY_CLASS, PROCESS_INFORMATION, STARTUPINFOW,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetSystemMetrics, SM_CMONITORS, SM_CXSCREEN, SM_CXVIRTUALSCREEN, SM_CYSCREEN,
        SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
    };

    /// Captures the unified virtual desktop across all connected monitors directly from the caller's session.
    pub fn capture_virtual_desktop_direct() -> Result<ScreenshotResult, String> {
        let mut x = unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) };
        let mut y = unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) };
        let mut width = unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) };
        let mut height = unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) };
        let mut monitors_count = unsafe { GetSystemMetrics(SM_CMONITORS) };

        if width <= 0 || height <= 0 {
            width = unsafe { GetSystemMetrics(SM_CXSCREEN) };
            height = unsafe { GetSystemMetrics(SM_CYSCREEN) };
            x = 0;
            y = 0;
            monitors_count = 1;
        }

        if width <= 0 || height <= 0 {
            return Err("Unable to detect display resolution or monitor metrics".to_string());
        }

        let hdc_screen = unsafe { GetDC(0) };
        if hdc_screen == 0 {
            return Err("Failed to obtain desktop Device Context (GetDC)".to_string());
        }

        let hdc_mem = unsafe { CreateCompatibleDC(hdc_screen) };
        if hdc_mem == 0 {
            unsafe { ReleaseDC(0, hdc_screen) };
            return Err("Failed to create compatible memory DC".to_string());
        }

        let hbitmap = unsafe { CreateCompatibleBitmap(hdc_screen, width, height) };
        if hbitmap == 0 {
            unsafe {
                DeleteDC(hdc_mem);
                ReleaseDC(0, hdc_screen);
            }
            return Err("Failed to create compatible bitmap".to_string());
        }

        let old_bitmap = unsafe { SelectObject(hdc_mem, hbitmap) };

        // BitBlt with SRCCOPY (0x00CC0020) and CAPTUREBLT (0x40000000) to include layered/transparent windows
        let raster_op = SRCCOPY | 0x40000000;
        let blt_res = unsafe {
            BitBlt(
                hdc_mem,
                0,
                0,
                width,
                height,
                hdc_screen,
                x,
                y,
                raster_op,
            )
        };

        if blt_res == FALSE {
            unsafe {
                SelectObject(hdc_mem, old_bitmap);
                DeleteObject(hbitmap);
                DeleteDC(hdc_mem);
                ReleaseDC(0, hdc_screen);
            }
            return Err("BitBlt failed during virtual screen copy".to_string());
        }

        let mut bi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // negative value indicates top-down DIB
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB as u32,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [RGBQUAD {
                rgbBlue: 0,
                rgbGreen: 0,
                rgbRed: 0,
                rgbReserved: 0,
            }],
        };

        let pixel_count = (width as usize) * (height as usize);
        let mut bgra_buf = vec![0u8; pixel_count * 4];

        let lines = unsafe {
            GetDIBits(
                hdc_screen,
                hbitmap,
                0,
                height as u32,
                bgra_buf.as_mut_ptr() as *mut _,
                &mut bi,
                DIB_RGB_COLORS,
            )
        };

        // Clean up GDI handles immediately
        unsafe {
            SelectObject(hdc_mem, old_bitmap);
            DeleteObject(hbitmap);
            DeleteDC(hdc_mem);
            ReleaseDC(0, hdc_screen);
        }

        if lines == 0 {
            return Err("Failed to retrieve bitmap bits via GetDIBits".to_string());
        }

        // Convert BGRA to RGB buffer
        let mut rgb_buf = Vec::with_capacity(pixel_count * 3);
        for chunk in bgra_buf.chunks_exact(4) {
            rgb_buf.push(chunk[2]); // R
            rgb_buf.push(chunk[1]); // G
            rgb_buf.push(chunk[0]); // B
        }

        let img: ImageBuffer<Rgb<u8>, Vec<u8>> =
            ImageBuffer::from_raw(width as u32, height as u32, rgb_buf)
                .ok_or_else(|| "Failed to construct ImageBuffer from raw RGB bytes".to_string())?;

        // Downscale virtual desktop if width exceeds 2560px
        let orig_w = width as u32;
        let orig_h = height as u32;
        let (scaled_w, scaled_h, processed_img) = if orig_w > 2560 {
            let ratio = 2560.0 / (orig_w as f64);
            let target_w = 2560u32;
            let target_h = ((orig_h as f64) * ratio).round() as u32;
            let resized = image::imageops::resize(
                &img,
                target_w,
                target_h,
                image::imageops::FilterType::Triangle,
            );
            (target_w, target_h, DynamicImage::ImageRgb8(resized))
        } else {
            (orig_w, orig_h, DynamicImage::ImageRgb8(img))
        };

        // Encode as JPEG with 80% quality
        let mut jpeg_bytes = Vec::new();
        let mut cursor = Cursor::new(&mut jpeg_bytes);
        let encoder = JpegEncoder::new_with_quality(&mut cursor, 80);
        processed_img
            .write_with_encoder(encoder)
            .map_err(|e| format!("JPEG encoding failed: {}", e))?;

        let base64_image = BASE64_STANDARD.encode(&jpeg_bytes);

        Ok(ScreenshotResult {
            success: true,
            displays_count: monitors_count.max(1) as u32,
            virtual_screen: VirtualScreenMetrics {
                x,
                y,
                width: orig_w,
                height: orig_h,
                scaled_width: scaled_w,
                scaled_height: scaled_h,
            },
            mime_type: "image/jpeg".to_string(),
            image_base64: base64_image,
            captured_at: Utc::now().to_rfc3339(),
            session_state: "ACTIVE".to_string(),
            error: None,
        })
    }

    /// Spawns msp-agent worker inside the active interactive console session (Session 1+)
    /// from Session 0 using WTSQueryUserToken and CreateProcessAsUserW.
    pub fn capture_via_user_session() -> Result<ScreenshotResult, String> {
        let session_id = unsafe { WTSGetActiveConsoleSessionId() };
        if session_id == 0xFFFFFFFF {
            // No active console session attached; attempt direct logon screen capture
            return capture_virtual_desktop_direct().map(|mut res| {
                res.session_state = "LOGON_SCREEN".to_string();
                res
            });
        }

        // Query user token for the active interactive desktop
        let mut user_token: HANDLE = 0;
        let query_ok = unsafe { WTSQueryUserToken(session_id, &mut user_token) };
        if query_ok == 0 || user_token == 0 {
            // Cannot acquire user token (e.g. locked or login window)
            // Fall back to direct capture attempt
            return capture_virtual_desktop_direct().map(|mut res| {
                res.session_state = "LOCKED".to_string();
                res
            });
        }

        let mut primary_token: HANDLE = 0;
        let dup_ok = unsafe {
            DuplicateTokenEx(
                user_token,
                TOKEN_ALL_ACCESS,
                ptr::null(),
                SecurityImpersonation,
                TokenPrimary,
                &mut primary_token,
            )
        };
        unsafe { CloseHandle(user_token) };

        if dup_ok == 0 || primary_token == 0 {
            return capture_virtual_desktop_direct();
        }

        // Generate temporary output file path
        let temp_dir = std::path::PathBuf::from(r"C:\ProgramData\MSP");
        let out_file = temp_dir.join(format!("msp_snap_{}.json", uuid::Uuid::new_v4()));
        let out_file_str = out_file.to_string_lossy().to_string();

        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let cmd_line = format!(
            "\"{}\" --capture-screens-worker \"{}\"",
            current_exe.to_string_lossy(),
            out_file_str
        );

        let mut cmd_line_u16: Vec<u16> = cmd_line.encode_utf16().chain(std::iter::once(0)).collect();

        let mut si: STARTUPINFOW = unsafe { std::mem::zeroed() };
        si.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
        let desktop_name = U16CString::from_str(r"winsta0\default").map_err(|e| e.to_string())?;
        si.lpDesktop = desktop_name.as_ptr() as *mut _;

        let mut pi: PROCESS_INFORMATION = unsafe { std::mem::zeroed() };

        let created = unsafe {
            CreateProcessAsUserW(
                primary_token,
                ptr::null(),
                cmd_line_u16.as_mut_ptr(),
                ptr::null(),
                ptr::null(),
                FALSE,
                NORMAL_PRIORITY_CLASS | CREATE_NO_WINDOW,
                ptr::null(),
                ptr::null(),
                &si,
                &mut pi,
            )
        };
        unsafe { CloseHandle(primary_token) };

        if created == 0 {
            warn!("[Screenshot] CreateProcessAsUserW failed, falling back to direct capture");
            return capture_virtual_desktop_direct();
        }

        // Wait up to 10 seconds for worker to finish capturing
        unsafe {
            WaitForSingleObject(pi.hProcess, 10000);
            let mut exit_code: u32 = 0;
            GetExitCodeProcess(pi.hProcess, &mut exit_code);
            log::info!("[Screenshot] Worker exit_code={}, out_exists={}", exit_code, out_file.exists());
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
        }

        // Read and parse worker output from the temporary file
        if out_file.exists() {
            let data = std::fs::read_to_string(&out_file).map_err(|e| e.to_string())?;
            let _ = std::fs::remove_file(&out_file);
            let result: ScreenshotResult = serde_json::from_str(&data)
                .map_err(|e| format!("Failed to parse worker output: {}", e))?;
            Ok(result)
        } else {
            Err("Worker process did not produce screenshot file".to_string())
        }
    }
}

/// Orchestrates multi-screen virtual desktop capture.
pub fn capture_multi_screen() -> Value {
    #[cfg(windows)]
    {
        // Try user session worker first; if that fails or errors, try direct capture
        match win_capture::capture_via_user_session() {
            Ok(res) => json!(res),
            Err(e) => {
                warn!("[Screenshot] User session capture failed ({}), trying direct capture", e);
                match win_capture::capture_virtual_desktop_direct() {
                    Ok(res) => json!(res),
                    Err(direct_err) => json!({
                        "success": false,
                        "error": format!("Screen capture failed: {} (direct fallback: {})", e, direct_err),
                        "displays_count": 0,
                        "session_state": "CAPTURE_FAILED",
                        "captured_at": Utc::now().to_rfc3339()
                    }),
                }
            }
        }
    }

    #[cfg(not(windows))]
    {
        json!({
            "success": false,
            "error": "Screen capture is only supported on Windows endpoints.",
            "displays_count": 0,
            "session_state": "UNSUPPORTED_OS",
            "captured_at": Utc::now().to_rfc3339()
        })
    }
}

/// Executes internal worker mode when invoked with `--capture-screens-worker <out_file>`.
pub fn run_capture_worker(out_file_path: &str) {
    #[cfg(windows)]
    {
        let res = win_capture::capture_virtual_desktop_direct().unwrap_or_else(|err| {
            ScreenshotResult {
                success: false,
                displays_count: 0,
                virtual_screen: VirtualScreenMetrics {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    scaled_width: 0,
                    scaled_height: 0,
                },
                mime_type: "image/jpeg".to_string(),
                image_base64: String::new(),
                captured_at: Utc::now().to_rfc3339(),
                session_state: "WORKER_FAILED".to_string(),
                error: Some(err),
            }
        });

        if let Ok(serialized) = serde_json::to_string(&res) {
            let _ = std::fs::write(out_file_path, serialized);
        }
    }

    #[cfg(not(windows))]
    {
        let _ = out_file_path;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_screenshot_result_serialization() {
        let res = ScreenshotResult {
            success: true,
            displays_count: 2,
            virtual_screen: VirtualScreenMetrics {
                x: 0,
                y: 0,
                width: 3840,
                height: 1080,
                scaled_width: 2560,
                scaled_height: 720,
            },
            mime_type: "image/jpeg".to_string(),
            image_base64: "dGVzdA==".to_string(),
            captured_at: "2026-09-28T20:00:00Z".to_string(),
            session_state: "ACTIVE".to_string(),
            error: None,
        };

        let val = serde_json::to_value(&res).expect("Should serialize to JSON");
        assert_eq!(val["success"], true);
        assert_eq!(val["displays_count"], 2);
        assert_eq!(val["virtual_screen"]["width"], 3840);
        assert_eq!(val["virtual_screen"]["scaled_width"], 2560);
        assert_eq!(val["mime_type"], "image/jpeg");
    }

    #[test]
    fn test_capture_multi_screen_does_not_panic() {
        let val = capture_multi_screen();
        assert!(val.is_object());
        assert!(val.get("captured_at").is_some());
    }
}
