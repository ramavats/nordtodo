use tauri::{AppHandle, Manager, Runtime};

/// Window mode — kept in sync with the frontend store.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WindowMode {
    Normal,
    Slim,
}

/// Switch the main window between "normal" (full app) and "slim" (docked side-panel).
///
/// Slim mode:
///   - Resizes to ~320 × 100% screen height
///   - Positions to the far right edge of the primary monitor
///   - Always-on-top
///
/// Normal mode:
///   - Restores to 1280 × 800, centred
///   - Removes always-on-top
#[tauri::command]
pub async fn set_window_mode<R: Runtime>(
    app: AppHandle<R>,
    mode: WindowMode,
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    match mode {
        WindowMode::Slim => {
            // Get the primary monitor dimensions
            let monitor = window
                .current_monitor()
                .map_err(|e| e.to_string())?
                .or_else(|| window.primary_monitor().ok().flatten());

            let (screen_width, _screen_height) = if let Some(m) = monitor {
                let size = m.size();
                (size.width as f64, size.height as f64)
            } else {
                (1920.0, 1080.0) // safe fallback
            };

            let slim_width: f64 = 400.0;
            let slim_height: f64 = 950.0;

            // Move to right edge, top
            let x = (screen_width - slim_width) as i32;
            let y = 0_i32;

            window
                .set_size(tauri::Size::Logical(tauri::LogicalSize {
                    width: slim_width,
                    height: slim_height,
                }))
                .map_err(|e| e.to_string())?;

            window
                .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
                .map_err(|e| e.to_string())?;

            window.set_always_on_top(true).map_err(|e| e.to_string())?;

            // Remove min-width constraint so the slim window can go below 900px
            window
                .set_min_size(Some(tauri::Size::Logical(tauri::LogicalSize {
                    width: 200.0,
                    height: 300.0,
                })))
                .map_err(|e| e.to_string())?;
        }

        WindowMode::Normal => {
            // Restore min-size constraint
            window
                .set_min_size(Some(tauri::Size::Logical(tauri::LogicalSize {
                    width: 500.0,
                    height: 600.0,
                })))
                .map_err(|e| e.to_string())?;

            window
                .set_size(tauri::Size::Logical(tauri::LogicalSize {
                    width: 800.0,
                    height: 800.0,
                }))
                .map_err(|e| e.to_string())?;

            window.center().map_err(|e| e.to_string())?;

            window
                .set_always_on_top(false)
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Hide the main window (send to background — still running).
#[tauri::command]
pub async fn hide_window<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window.hide().map_err(|e| e.to_string())
}

/// Show and focus the main window.
#[tauri::command]
pub async fn show_window<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}
