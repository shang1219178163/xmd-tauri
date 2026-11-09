use std::path::{Path, PathBuf};

use base64::Engine as _;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Emitter, EventTarget, Manager, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::menu;
use crate::print;
use crate::settings;
use crate::state::AppState;
use crate::window;

const B64: base64::engine::general_purpose::GeneralPurpose = base64::engine::general_purpose::STANDARD;

#[derive(Debug, Clone, Deserialize)]
pub struct DialogFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DialogResult {
    canceled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    file_path: Option<String>,
}

impl DialogResult {
    fn canceled() -> Self {
        Self {
            canceled: true,
            file_path: None,
        }
    }

    fn picked(path: &Path) -> Self {
        Self {
            canceled: false,
            file_path: Some(path.to_string_lossy().to_string()),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResult {
    canceled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    file_path: Option<String>,
}

impl SaveResult {
    fn canceled() -> Self {
        Self {
            canceled: true,
            file_path: None,
        }
    }

    fn saved(path: &Path) -> Self {
        Self {
            canceled: false,
            file_path: Some(path.to_string_lossy().to_string()),
        }
    }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

fn header_raw(request: &Request<'_>, key: &str) -> Option<String> {
    request
        .headers()
        .get(key)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string())
}

fn header_text(request: &Request<'_>, key: &str) -> Option<String> {
    header_raw(request, key)
        .and_then(|value| B64.decode(value).ok())
        .and_then(|bytes| String::from_utf8(bytes).ok())
}

fn body_bytes(request: &Request<'_>) -> Result<Vec<u8>, String> {
    match request.body() {
        InvokeBody::Raw(bytes) => Ok(bytes.clone()),
        _ => Err("请求体必须是原始字节".to_string()),
    }
}

fn body_text(request: &Request<'_>) -> Result<String, String> {
    String::from_utf8(body_bytes(request)?).map_err(|err| format!("文本编码错误：{err}"))
}

fn save_dialog(
    app: &AppHandle,
    default_name: &str,
    filters: &[DialogFilter],
) -> Option<PathBuf> {
    let mut dialog = app.dialog().file().set_file_name(default_name);
    for filter in filters {
        let extensions: Vec<&str> = filter.extensions.iter().map(String::as_str).collect();
        dialog = dialog.add_filter(&filter.name, &extensions);
    }
    dialog.blocking_save_file()?.into_path().ok()
}

fn write_bytes(path: &Path, data: &[u8]) -> Result<(), String> {
    std::fs::write(path, data).map_err(|err| format!("无法写入 {}：{err}", path.display()))
}

/* ------------------------------------------------------------------ */
/* Dialogs and file IO                                                 */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn dialog_open_workbook(app: AppHandle) -> Result<DialogResult, String> {
    let picked = app
        .dialog()
        .file()
        .set_title("打开 Xmind 文件")
        .add_filter("Xmind Workbook", &["xmind"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();
    let Some(file) = picked else {
        return Ok(DialogResult::canceled());
    };
    let path = file.into_path().map_err(|err| err.to_string())?;
    settings::add_recent(&app, &path.to_string_lossy())?;
    Ok(DialogResult::picked(&path))
}

#[tauri::command]
pub async fn dialog_pick_file(
    app: AppHandle,
    filters: Vec<DialogFilter>,
) -> Result<DialogResult, String> {
    let mut dialog = app.dialog().file();
    for filter in &filters {
        let extensions: Vec<&str> = filter.extensions.iter().map(String::as_str).collect();
        dialog = dialog.add_filter(&filter.name, &extensions);
    }
    let Some(file) = dialog.blocking_pick_file() else {
        return Ok(DialogResult::canceled());
    };
    let path = file.into_path().map_err(|err| err.to_string())?;
    Ok(DialogResult::picked(&path))
}

#[tauri::command]
pub fn read_file_raw(path: String) -> Result<Response, String> {
    let bytes = std::fs::read(&path).map_err(|err| format!("无法读取 {path}：{err}"))?;
    Ok(Response::new(bytes))
}

#[tauri::command]
pub fn read_workbook_raw(app: AppHandle, path: String) -> Result<Response, String> {
    let bytes = std::fs::read(&path).map_err(|err| format!("无法读取 {path}：{err}"))?;
    settings::add_recent(&app, &path)?;
    Ok(Response::new(bytes))
}

#[tauri::command]
pub async fn save_workbook_raw(
    app: AppHandle,
    request: Request<'_>,
) -> Result<SaveResult, String> {
    let data = body_bytes(&request)?;

    if let Some(target) = header_text(&request, "x-target-path") {
        let path = PathBuf::from(target);
        write_bytes(&path, &data)?;
        settings::add_recent(&app, &path.to_string_lossy())?;
        return Ok(SaveResult::saved(&path));
    }

    let default_name = header_text(&request, "x-default-name")
        .unwrap_or_else(|| "Untitled.xmind".to_string());
    let filters = vec![DialogFilter {
        name: "Xmind Workbook".to_string(),
        extensions: vec!["xmind".to_string()],
    }];
    let Some(path) = save_dialog(&app, &default_name, &filters) else {
        return Ok(SaveResult::canceled());
    };
    write_bytes(&path, &data)?;
    settings::add_recent(&app, &path.to_string_lossy())?;
    Ok(SaveResult::saved(&path))
}

#[tauri::command]
pub async fn export_binary_raw(
    app: AppHandle,
    request: Request<'_>,
) -> Result<SaveResult, String> {
    let data = body_bytes(&request)?;
    let default_name = header_text(&request, "x-default-name")
        .unwrap_or_else(|| "Untitled".to_string());
    let filters: Vec<DialogFilter> = header_text(&request, "x-filters")
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default();
    let Some(path) = save_dialog(&app, &default_name, &filters) else {
        return Ok(SaveResult::canceled());
    };
    write_bytes(&path, &data)?;
    Ok(SaveResult::saved(&path))
}

#[tauri::command]
pub async fn export_text_raw(
    app: AppHandle,
    request: Request<'_>,
) -> Result<SaveResult, String> {
    let data = body_bytes(&request)?;
    let default_name = header_text(&request, "x-default-name")
        .unwrap_or_else(|| "Untitled.txt".to_string());
    let filters: Vec<DialogFilter> = header_text(&request, "x-filters")
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default();
    let Some(path) = save_dialog(&app, &default_name, &filters) else {
        return Ok(SaveResult::canceled());
    };
    write_bytes(&path, &data)?;
    Ok(SaveResult::saved(&path))
}

#[tauri::command]
pub async fn export_image_raw(
    app: AppHandle,
    request: Request<'_>,
) -> Result<SaveResult, String> {
    let format = header_raw(&request, "x-format").unwrap_or_else(|| "png".to_string());
    let default_name = header_text(&request, "x-default-name")
        .unwrap_or_else(|| format!("Untitled.{format}"));
    let data = body_bytes(&request)?;

    let filters = vec![DialogFilter {
        name: if format == "svg" { "SVG Image" } else { "PNG Image" }.to_string(),
        extensions: vec![format.clone()],
    }];
    let Some(path) = save_dialog(&app, &default_name, &filters) else {
        return Ok(SaveResult::canceled());
    };

    if format == "svg" {
        write_bytes(&path, &data)?;
    } else {
        let text = String::from_utf8(data).map_err(|err| format!("图像数据编码错误：{err}"))?;
        let payload = text
            .split_once("base64,")
            .map(|(_, tail)| tail)
            .unwrap_or(text.as_str());
        let bytes = B64
            .decode(payload.trim())
            .map_err(|err| format!("PNG 数据解析失败：{err}"))?;
        write_bytes(&path, &bytes)?;
    }
    Ok(SaveResult::saved(&path))
}

#[tauri::command]
pub async fn export_pdf_raw(
    app: AppHandle,
    request: Request<'_>,
) -> Result<SaveResult, String> {
    let html = body_text(&request)?;
    let default_name = header_text(&request, "x-default-name")
        .unwrap_or_else(|| "Untitled.pdf".to_string());
    let landscape = header_raw(&request, "x-landscape").as_deref() == Some("1");
    let filters = vec![DialogFilter {
        name: "PDF Document".to_string(),
        extensions: vec!["pdf".to_string()],
    }];
    let Some(path) = save_dialog(&app, &default_name, &filters) else {
        return Ok(SaveResult::canceled());
    };
    print::render_html_to_pdf(&app, &html, landscape, &path).await?;
    Ok(SaveResult::saved(&path))
}

#[tauri::command]
pub async fn print_html_raw(app: AppHandle, request: Request<'_>) -> Result<bool, String> {
    let html = body_text(&request)?;
    print::print_html(&app, &html).await
}

/* ------------------------------------------------------------------ */
/* Recent files and settings                                           */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub fn recent_get(app: AppHandle) -> Vec<settings::RecentFile> {
    settings::get_recent(&app)
}

#[tauri::command]
pub fn recent_add(app: AppHandle, path: String) -> Result<(), String> {
    settings::add_recent(&app, &path)
}

#[tauri::command]
pub fn settings_get(app: AppHandle) -> Value {
    settings::get_settings(&app)
}

#[tauri::command]
pub fn settings_save(app: AppHandle, patch: Value) -> Value {
    settings::save_settings(&app, &patch)
}

#[tauri::command]
pub fn user_config_get(app: AppHandle) -> Option<Value> {
    settings::read_json_lossy(&app, "user-config.json")
}

#[tauri::command]
pub fn user_config_save(app: AppHandle, config: Value) -> Result<String, String> {
    settings::write_json(&app, "user-config.json", &config)?;
    let path = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("无法定位应用数据目录：{err}"))?
        .join("user-config.json");
    Ok(path.to_string_lossy().to_string())
}

/* ------------------------------------------------------------------ */
/* Application / window actions                                        */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub fn set_menu_language(app: AppHandle, language: String) -> Result<(), String> {
    menu::set_language(&app, &language)
}

#[tauri::command]
pub fn new_window(app: AppHandle) -> Result<(), String> {
    window::create_window(&app, vec![], vec![])
        .map(|_| ())
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn app_info() -> Value {
    let platform = match std::env::consts::OS {
        "macos" => "darwin",
        "windows" => "win32",
        other => other,
    };
    serde_json::json!({
        "platform": platform,
        "version": env!("CARGO_PKG_VERSION")
    })
}

/// Installed font families, used by the renderer's font picker.
static FONT_FAMILIES: std::sync::OnceLock<Vec<String>> = std::sync::OnceLock::new();

#[tauri::command]
pub fn list_font_families() -> Vec<String> {
    FONT_FAMILIES.get_or_init(enumerate_font_families).clone()
}

fn enumerate_font_families() -> Vec<String> {
    #[cfg(target_os = "macos")]
    {
        let mut names = macos_font_families();
        normalize_font_names(&mut names);
        if !names.is_empty() {
            return names;
        }
    }
    fallback_font_families()
}

#[cfg(target_os = "macos")]
fn macos_font_families() -> Vec<String> {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;
    use std::ffi::CStr;
    use std::os::raw::c_char;

    let mut names = Vec::new();
    unsafe {
        let manager: *mut AnyObject =
            msg_send![objc2::class!(NSFontManager), sharedFontManager];
        if manager.is_null() {
            return names;
        }
        let families: *mut AnyObject = msg_send![manager, availableFontFamilies];
        if families.is_null() {
            return names;
        }
        let count: usize = msg_send![families, count];
        for index in 0..count {
            let item: *mut AnyObject = msg_send![families, objectAtIndex: index];
            if item.is_null() {
                continue;
            }
            let utf8: *const c_char = msg_send![item, UTF8String];
            if utf8.is_null() {
                continue;
            }
            if let Ok(name) = CStr::from_ptr(utf8).to_str() {
                let name = name.trim();
                if !name.is_empty() && !name.starts_with('.') {
                    names.push(name.to_string());
                }
            }
        }
    }
    names
}

fn normalize_font_names(names: &mut Vec<String>) {
    names.retain(|name| !name.trim().is_empty() && !name.starts_with('.'));
    names.sort_by(|a, b| {
        a.to_lowercase()
            .cmp(&b.to_lowercase())
            .then_with(|| a.cmp(b))
    });
    names.dedup_by(|a, b| a.eq_ignore_ascii_case(b));
}

fn fallback_font_families() -> Vec<String> {
    let mut names: Vec<String> = [
        "Arial",
        "Avenir Next",
        "Georgia",
        "Heiti SC",
        "Helvetica Neue",
        "Hiragino Sans GB",
        "Inter",
        "Kaiti SC",
        "Menlo",
        "Microsoft YaHei",
        "Monaco",
        "PingFang SC",
        "SimSun",
        "Songti SC",
        "STKaiti",
        "STSong",
        "Times New Roman",
        "Verdana",
    ]
    .iter()
    .map(|name| name.to_string())
    .collect();
    normalize_font_names(&mut names);
    names
}

#[tauri::command]
pub fn show_item_in_folder(app: AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn read_clipboard_image() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(|| -> Result<Option<String>, String> {
        let mut clipboard = match arboard::Clipboard::new() {
            Ok(clipboard) => clipboard,
            Err(_) => return Ok(None),
        };
        let image = match clipboard.get_image() {
            Ok(image) => image,
            Err(_) => return Ok(None),
        };
        let width = image.width as u32;
        let height = image.height as u32;
        let buffer = image::RgbaImage::from_raw(width, height, image.bytes.into_owned())
            .ok_or_else(|| "剪贴板图像格式无效".to_string())?;
        let mut cursor = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgba8(buffer)
            .write_to(&mut cursor, image::ImageFormat::Png)
            .map_err(|err| format!("无法编码剪贴板图像：{err}"))?;
        let encoded = B64.encode(cursor.into_inner());
        Ok(Some(format!("data:image/png;base64,{encoded}")))
    })
    .await
    .map_err(|err| err.to_string())?
}

/* ------------------------------------------------------------------ */
/* Window lifecycle                                                    */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub fn set_dirty(app: AppHandle, window: WebviewWindow, dirty: bool) {
    app.state::<AppState>()
        .set_dirty(window.label(), dirty);
}

#[tauri::command]
pub fn confirm_close(app: AppHandle, window: WebviewWindow) {
    app.state::<AppState>().confirm(window.label());
    let _ = window.close();
}

#[tauri::command]
pub fn app_ready(app: AppHandle, window: WebviewWindow) {
    let label = window.label().to_string();
    if app.state::<AppState>().mark_ready(&label) {
        window::show_window(&app, &window);
    }
    // Anything queued between the renderer's initial drain and this point is
    // delivered now that listeners are definitely installed.
    for path in app.state::<AppState>().take_pending_open(&label) {
        let _ = app.emit_to(
            EventTarget::webview_window(label.as_str()),
            "file:open-path",
            path,
        );
    }
    for action in app.state::<AppState>().take_pending_actions(&label) {
        let _ = app.emit_to(
            EventTarget::webview_window(label.as_str()),
            "menu:action",
            action,
        );
    }
}

#[tauri::command]
pub fn take_pending_open_paths(app: AppHandle, window: WebviewWindow) -> Vec<String> {
    app.state::<AppState>().take_pending_open(window.label())
}

#[tauri::command]
pub fn take_pending_actions(app: AppHandle, window: WebviewWindow) -> Vec<String> {
    app.state::<AppState>()
        .take_pending_actions(window.label())
}
