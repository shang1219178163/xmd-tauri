use std::path::PathBuf;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, EventTarget, LogicalPosition, LogicalSize, Manager, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, WindowEvent,
};

use crate::settings;
use crate::state::AppState;

const MIN_WIDTH: f64 = 960.0;
const MIN_HEIGHT: f64 = 620.0;
const DEFAULT_WIDTH: f64 = 1440.0;
const DEFAULT_HEIGHT: f64 = 900.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedWindow {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: f64,
    pub height: f64,
    pub maximized: bool,
}

impl Default for SavedWindow {
    fn default() -> Self {
        Self {
            x: None,
            y: None,
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            maximized: false,
        }
    }
}

fn state_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("无法定位应用数据目录：{err}"))?;
    std::fs::create_dir_all(&dir).map_err(|err| format!("无法创建应用数据目录：{err}"))?;
    Ok(dir.join("window-state.json"))
}

fn load_window_state(app: &AppHandle) -> Option<SavedWindow> {
    let raw = std::fs::read_to_string(state_file(app).ok()?).ok()?;
    let mut saved: SavedWindow = serde_json::from_str(&raw).ok()?;
    if !saved.width.is_finite() || !saved.height.is_finite() {
        return None;
    }
    saved.width = saved.width.max(MIN_WIDTH);
    saved.height = saved.height.max(MIN_HEIGHT);
    if saved.x.map_or(true, |x| !x.is_finite()) || saved.y.map_or(true, |y| !y.is_finite()) {
        saved.x = None;
        saved.y = None;
    }
    Some(saved)
}

/// Drops positions that no longer overlap any attached display.
fn is_on_screen(app: &AppHandle, saved: &SavedWindow) -> bool {
    let (Some(x), Some(y)) = (saved.x, saved.y) else {
        return true;
    };
    let Ok(monitors) = app.available_monitors() else {
        return true;
    };
    monitors.iter().any(|monitor| {
        let scale = monitor.scale_factor();
        let position = monitor.position();
        let size = monitor.size();
        let left = position.x as f64 / scale;
        let top = position.y as f64 / scale;
        let width = size.width as f64 / scale;
        let height = size.height as f64 / scale;
        x + saved.width > left + 80.0
            && x < left + width - 80.0
            && y + saved.height > top + 80.0
            && y < top + height - 80.0
    })
}

pub fn save_window_state(app: &AppHandle, window: &WebviewWindow) {
    if window.is_fullscreen().unwrap_or(false) {
        return;
    }
    let scale = window.scale_factor().unwrap_or(1.0);
    if scale <= 0.0 {
        return;
    }
    let Ok(size) = window.outer_size() else {
        return;
    };
    let position = window.outer_position().ok();
    let saved = SavedWindow {
        x: position.map(|pos| (pos.x as f64 / scale).round()),
        y: position.map(|pos| (pos.y as f64 / scale).round()),
        width: (size.width as f64 / scale).max(MIN_WIDTH),
        height: (size.height as f64 / scale).max(MIN_HEIGHT),
        maximized: window.is_maximized().unwrap_or(false),
    };
    if let Ok(value) = serde_json::to_value(&saved) {
        let _ = settings::write_json(app, "window-state.json", &value);
    }
}

fn schedule_save(app: AppHandle, window: WebviewWindow) {
    let generation = app.state::<AppState>().next_save_generation();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(400)).await;
        if app.state::<AppState>().save_generation() == generation {
            save_window_state(&app, &window);
        }
    });
}

/// Creates a new application window, restoring the last saved placement.
/// Pending file paths and menu actions are delivered once the renderer is ready.
pub fn create_window(
    app: &AppHandle,
    initial_paths: Vec<String>,
    initial_actions: Vec<String>,
) -> tauri::Result<WebviewWindow> {
    let state = app.state::<AppState>();
    let index = state.next_window_index();
    let label = if index == 0 {
        "main".to_string()
    } else {
        format!("window-{}", index + 1)
    };

    for path in initial_paths {
        state.push_pending_open(&label, path);
    }
    for action in initial_actions {
        state.push_pending_action(&label, action);
    }

    let saved = load_window_state(app)
        .filter(|candidate| is_on_screen(app, candidate))
        .unwrap_or_default();
    state.set_pending_maximize(&label, saved.maximized);

    let mut builder = WebviewWindowBuilder::new(
        app,
        label.as_str(),
        WebviewUrl::App("index.html".into()),
    )
    .title("xmd")
    .inner_size(saved.width, saved.height)
    .min_inner_size(MIN_WIDTH, MIN_HEIGHT)
    .background_color(tauri::window::Color(248, 250, 252, 255))
    .visible(false)
    .decorations(true)
    .resizable(true);

    if let (Some(x), Some(y)) = (saved.x, saved.y) {
        builder = builder.position(x, y);
    }

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .traffic_light_position(LogicalPosition::new(14.0, 14.0));
    }

    let window = builder.build()?;

    let event_app = app.clone();
    let event_label = window.label().to_string();
    window.on_window_event(move |event| {
        let label = event_label.clone();
        let app = &event_app;
        match event {
            WindowEvent::CloseRequested { api, .. } => {
                if let Some(candidate) = app.get_webview_window(&label) {
                    save_window_state(app, &candidate);
                    let state = app.state::<AppState>();
                    if state.is_dirty(&label) && !state.is_confirmed(&label) {
                        api.prevent_close();
                        let _ = app.emit_to(
                            EventTarget::webview_window(label.as_str()),
                            "app:request-close",
                            (),
                        );
                    }
                }
            }
            WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
                if let Some(candidate) = app.get_webview_window(&label) {
                    schedule_save(app.clone(), candidate);
                }
            }
            WindowEvent::Destroyed => {
                if let Some(candidate) = app.get_webview_window(&label) {
                    save_window_state(app, &candidate);
                }
                app.state::<AppState>().forget_window(&label);
            }
            _ => {}
        }
    });

    // Safety net: never leave the app invisible if the renderer fails to boot.
    let fallback_app = app.clone();
    let fallback_label = window.label().to_string();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(6)).await;
        if let Some(candidate) = fallback_app.get_webview_window(&fallback_label) {
            if !candidate.is_visible().unwrap_or(true) {
                let _ = candidate.show();
            }
        }
    });

    Ok(window)
}

/// Reveals a window after its renderer finished mounting.
pub fn show_window(app: &AppHandle, window: &WebviewWindow) {
    let maximize = app
        .state::<AppState>()
        .take_pending_maximize(window.label());
    let _ = window.show();
    if maximize {
        let _ = window.maximize();
    }
    let _ = window.set_focus();

    let app = app.clone();
    let window = window.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(600)).await;
        save_window_state(&app, &window);
    });
}

/// Picks the window a menu action should target.
pub fn focused_window(app: &AppHandle) -> Option<WebviewWindow> {
    let windows = app.webview_windows();
    if let Some(focused) = windows
        .values()
        .find(|window| window.is_focused().unwrap_or(false))
    {
        return Some(focused.clone());
    }
    if let Some(main) = windows.get("main") {
        return Some(main.clone());
    }
    windows.values().next().cloned()
}

/// Opens a workbook path in a window, creating one when necessary.
pub fn open_path(app: &AppHandle, path: String) {
    if let Some(window) = focused_window(app) {
        let label = window.label().to_string();
        let state = app.state::<AppState>();
        if state.is_ready(&label) {
            let _ = app.emit_to(
                EventTarget::webview_window(label.as_str()),
                "file:open-path",
                path,
            );
            let _ = window.set_focus();
        } else {
            state.push_pending_open(&label, path);
        }
        return;
    }
    let _ = create_window(app, vec![path], vec![]);
}

/// Sets a window size from a logical size (used by tests/debugging).
#[allow(dead_code)]
pub fn resize_logical(window: &WebviewWindow, width: f64, height: f64) {
    let _ = window.set_size(LogicalSize::new(width, height));
}
