mod commands;
mod menu;
mod print;
mod settings;
mod state;
mod window;

use tauri::{Manager, RunEvent};
use state::AppState;

pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Registered first so a second launch forwards its arguments to this instance.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let path = argv
                .iter()
                .find(|arg| arg.to_lowercase().ends_with(".xmind"))
                .cloned();
            if let Some(path) = path {
                window::open_path(app, path);
            } else if let Some(target) = window::focused_window(app) {
                let _ = target.unminimize();
                let _ = target.set_focus();
            } else {
                let _ = window::create_window(app, vec![], vec![]);
            }
        }));
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::dialog_open_workbook,
            commands::dialog_pick_file,
            commands::read_file_raw,
            commands::read_workbook_raw,
            commands::save_workbook_raw,
            commands::export_binary_raw,
            commands::export_text_raw,
            commands::export_image_raw,
            commands::export_pdf_raw,
            commands::print_html_raw,
            commands::recent_get,
            commands::recent_add,
            commands::settings_get,
            commands::settings_save,
            commands::user_config_get,
            commands::user_config_save,
            commands::set_menu_language,
            commands::set_editing_shortcuts,
            commands::new_window,
            commands::app_info,
            commands::list_font_families,
            commands::show_item_in_folder,
            commands::read_clipboard_image,
            commands::set_dirty,
            commands::confirm_close,
            commands::app_ready,
            commands::take_pending_open_paths,
            commands::take_pending_actions,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            settings::migrate_legacy_data(&handle);

            let settings_value = settings::get_settings(&handle);
            let language = settings_value
                .get("language")
                .and_then(|value| value.as_str())
                .unwrap_or("zh-CN")
                .to_string();
            *handle.state::<AppState>().menu_language.lock().unwrap() = language.clone();

            let menu = menu::build_menu(&handle, &language)?;
            app.set_menu(menu)?;
            app.on_menu_event(|app_handle, event| {
                menu::handle_menu_event(app_handle, event.id().0.as_str());
            });

            // macOS may deliver an open-file event before setup runs; that event
            // already created the main window, so avoid creating a second one.
            if handle.webview_windows().is_empty() {
                let initial: Vec<String> = std::env::args()
                    .skip(1)
                    .filter(|arg| arg.to_lowercase().ends_with(".xmind"))
                    .collect();
                window::create_window(&handle, initial, vec![])?;
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build xmd")
        .run(|app_handle, event| match event {
            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
            RunEvent::Opened { urls } => {
                for url in urls {
                    let is_file = url.scheme() == "file";
                    if !is_file {
                        continue;
                    }
                    if let Ok(path) = url.to_file_path() {
                        let is_xmind = path
                            .extension()
                            .map(|ext| ext.eq_ignore_ascii_case("xmind"))
                            .unwrap_or(false);
                        if is_xmind {
                            window::open_path(app_handle, path.to_string_lossy().to_string());
                        }
                    }
                }
            }
            RunEvent::ExitRequested { code, api, .. } => {
                // On macOS, closing the last window keeps the app alive (matching
                // the Electron build); elsewhere the app quits. An explicit Quit
                // still exits everywhere (code is Some in that case).
                #[cfg(target_os = "macos")]
                if code.is_none() && app_handle.webview_windows().is_empty() {
                    api.prevent_exit();
                }
                #[cfg(not(target_os = "macos"))]
                let _ = (code, api);
            }
            #[cfg(target_os = "macos")]
            RunEvent::Reopen { .. } => {
                if app_handle.webview_windows().is_empty() {
                    let _ = window::create_window(app_handle, vec![], vec![]);
                }
            }
            _ => {}
        });
}
