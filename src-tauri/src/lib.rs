// Forward-looking modules (sync engine, integration adapters, reminder/recurrence
// services) are scaffolded but not yet wired to Tauri commands. Suppress dead-code
// warnings for the entire crate so the build stays clean.
#![allow(dead_code)]
#![allow(unused_imports)]

mod commands;
mod config;
mod db;
mod errors;
mod models;
mod repositories;
mod services;
mod integrations;

use tauri::Manager;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};
use db::open_database;

/// Main Tauri app setup and plugin registration.
/// All Tauri commands are registered here.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Determine app data directory
            let app_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data directory");

            // Open (or create) the database and run migrations
            let db = open_database(&app_dir.join("nordtodo.db"))
                .expect("Failed to initialize database");

            // Seed dev data on first run
            #[cfg(debug_assertions)]
            {
                if let Err(e) = db::connection::seed_dev_data(&db) {
                    log::warn!("Dev seed failed (non-fatal): {e}");
                }
            }

            // Register DB as managed state — accessible in all commands
            app.manage(db);

            // ── System Tray ──────────────────────────────────────────
            // Right-click menu items
            let show_item = MenuItem::with_id(app, "show", "Show Nord Todo", true, None::<&str>)
                .expect("Failed to create tray menu item");
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)
                .expect("Failed to create tray quit item");
            let menu = Menu::with_items(app, &[&show_item, &quit_item])
                .expect("Failed to create tray menu");

            // Build tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("Nord Todo")
                .menu(&menu)
                .on_tray_icon_event(|tray, event| {
                    // Left-click → toggle show/hide
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)
                .expect("Failed to build tray icon");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Tasks
            commands::get_tasks,
            commands::get_task,
            commands::create_task,
            commands::update_task,
            commands::complete_task,
            commands::reopen_task,
            commands::delete_task,
            commands::duplicate_task,
            commands::get_task_counts,
            commands::bulk_action,
            // Tags
            commands::get_tags,
            commands::create_tag,
            commands::update_tag,
            commands::delete_tag,
            // Preferences
            commands::get_preferences,
            commands::set_preferences,
            commands::update_preferences,
            // Search
            commands::search_tasks,
            // Export/Import
            commands::export_tasks_json,
            commands::import_tasks_json,
            // Google Tasks integration
            commands::google_auth_url,
            commands::google_exchange_code,
            commands::google_status,
            commands::google_disconnect,
            commands::sync_google_tasks,
            // Window management
            commands::set_window_mode,
            commands::hide_window,
            commands::show_window,
        ])
        // Intercept the window close button (X) — hide instead of quit.
        // The app stays alive in the system tray. Use tray menu → Quit to exit.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("Error while running NordTodo application");
}
