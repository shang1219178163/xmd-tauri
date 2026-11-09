use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentFile {
    pub path: String,
    pub name: String,
    pub opened_at: u64,
}

fn default_settings() -> Value {
    json!({
        "theme": "light",
        "language": "zh-CN",
        "autoSave": true,
        "autoSaveIntervalMs": 30_000,
        "handDrawnMode": false,
        "showGrid": false,
        "recentFiles": []
    })
}

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("无法定位应用数据目录：{err}"))?;
    fs::create_dir_all(&dir).map_err(|err| format!("无法创建应用数据目录：{err}"))?;
    Ok(dir)
}

fn data_file(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join(name))
}

/// One-time migration from the pre-rename bundle identifier
/// (`app.xmindstudio.desktop`) to the current `app.xmd.desktop` data folder.
pub fn migrate_legacy_data(app: &AppHandle) {
    let Ok(new_dir) = app.path().app_data_dir() else {
        return;
    };
    let Some(parent) = new_dir.parent() else {
        return;
    };
    let old_dir = parent.join("app.xmindstudio.desktop");
    if old_dir == new_dir || !old_dir.exists() {
        return;
    }
    let _ = fs::create_dir_all(&new_dir);
    for name in [
        "settings.json",
        "recent.json",
        "window-state.json",
        "user-config.json",
    ] {
        let target = new_dir.join(name);
        if target.exists() {
            continue;
        }
        let source = old_dir.join(name);
        if source.exists() {
            let _ = fs::copy(source, target);
        }
    }
}

pub fn read_json_lossy(app: &AppHandle, name: &str) -> Option<Value> {
    let path = data_file(app, name).ok()?;
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str::<Value>(&raw).ok()
}

pub fn write_json(app: &AppHandle, name: &str, value: &Value) -> Result<(), String> {
    let path = data_file(app, name)?;
    let text = serde_json::to_string_pretty(value).map_err(|err| err.to_string())?;
    fs::write(&path, text).map_err(|err| format!("无法写入 {}：{err}", path.display()))
}

pub fn get_settings(app: &AppHandle) -> Value {
    let stored = read_json_lossy(app, "settings.json").unwrap_or_else(|| json!({}));
    let mut merged = default_settings();
    if let (Value::Object(base), Value::Object(overrides)) = (&mut merged, stored) {
        for (key, value) in overrides {
            base.insert(key, value);
        }
    }
    merged
}

pub fn save_settings(app: &AppHandle, patch: &Value) -> Value {
    let current = get_settings(app);
    let mut next = match current {
        Value::Object(map) => Value::Object(map),
        _ => default_settings(),
    };
    if let (Value::Object(base), Value::Object(overrides)) = (&mut next, patch) {
        for (key, value) in overrides {
            base.insert(key.clone(), value.clone());
        }
    }
    let _ = write_json(app, "settings.json", &next);
    next
}

pub fn get_recent(app: &AppHandle) -> Vec<RecentFile> {
    match read_json_lossy(app, "recent.json") {
        Some(Value::Array(items)) => items
            .into_iter()
            .filter_map(|item| serde_json::from_value::<RecentFile>(item).ok())
            .collect(),
        _ => Vec::new(),
    }
}

fn normalize(path: &Path) -> String {
    fs::canonicalize(path)
        .unwrap_or_else(|_| path.to_path_buf())
        .to_string_lossy()
        .to_string()
}

fn file_name_of(path: &str) -> String {
    Path::new(path)
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string())
}

pub fn add_recent(app: &AppHandle, path: &str) -> Result<(), String> {
    let normalized = normalize(Path::new(path));
    let mut seen = std::collections::HashSet::new();
    seen.insert(normalized.clone());

    let mut kept: Vec<RecentFile> = Vec::new();
    for mut entry in get_recent(app) {
        entry.path = normalize(Path::new(&entry.path));
        if !seen.insert(entry.path.clone()) {
            continue;
        }
        entry.name = file_name_of(&entry.path);
        kept.push(entry);
    }

    let opened_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0);

    let mut next = vec![RecentFile {
        path: normalized.clone(),
        name: file_name_of(&normalized),
        opened_at,
    }];
    next.extend(kept);
    next.truncate(15);

    let value = serde_json::to_value(next).map_err(|err| err.to_string())?;
    write_json(app, "recent.json", &value)
}
