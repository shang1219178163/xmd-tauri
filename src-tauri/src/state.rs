use std::collections::{HashMap, HashSet};
use std::sync::atomic::AtomicU64;
use std::sync::Mutex;

/// Process-wide state shared by the window, menu and command layers.
#[derive(Default)]
pub struct AppState {
    /// Windows whose document has unsaved changes.
    dirty: Mutex<HashSet<String>>,
    /// Windows whose close was confirmed by the renderer.
    confirmed: Mutex<HashSet<String>>,
    /// Windows whose renderer has installed its event listeners.
    ready: Mutex<HashSet<String>>,
    /// Paths to open once a window's renderer is ready.
    pending_open: Mutex<HashMap<String, Vec<String>>>,
    /// Menu actions to run once a window's renderer is ready.
    pending_actions: Mutex<HashMap<String, Vec<String>>>,
    /// Windows that should be maximized when first shown.
    pending_maximize: Mutex<HashMap<String, bool>>,
    /// Current menu language (`zh-CN` / `en-US`).
    pub menu_language: Mutex<String>,
    /// Monotonic window counter.
    window_seq: AtomicU64,
    /// Debounce token for window-state persistence.
    save_generation: AtomicU64,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            menu_language: Mutex::new("zh-CN".to_string()),
            ..Self::default()
        }
    }

    pub fn next_window_index(&self) -> u64 {
        self.window_seq
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst)
    }

    pub fn set_dirty(&self, label: &str, dirty: bool) {
        let mut set = self.dirty.lock().unwrap();
        if dirty {
            set.insert(label.to_string());
        } else {
            set.remove(label);
        }
    }

    pub fn is_dirty(&self, label: &str) -> bool {
        self.dirty.lock().unwrap().contains(label)
    }

    pub fn confirm(&self, label: &str) {
        self.confirmed.lock().unwrap().insert(label.to_string());
    }

    pub fn is_confirmed(&self, label: &str) -> bool {
        self.confirmed.lock().unwrap().contains(label)
    }

    /// Marks a renderer as ready. Returns true only on the first call.
    pub fn mark_ready(&self, label: &str) -> bool {
        self.ready.lock().unwrap().insert(label.to_string())
    }

    pub fn is_ready(&self, label: &str) -> bool {
        self.ready.lock().unwrap().contains(label)
    }

    pub fn push_pending_open(&self, label: &str, path: String) {
        self.pending_open
            .lock()
            .unwrap()
            .entry(label.to_string())
            .or_default()
            .push(path);
    }

    pub fn take_pending_open(&self, label: &str) -> Vec<String> {
        self.pending_open
            .lock()
            .unwrap()
            .remove(label)
            .unwrap_or_default()
    }

    pub fn push_pending_action(&self, label: &str, action: String) {
        self.pending_actions
            .lock()
            .unwrap()
            .entry(label.to_string())
            .or_default()
            .push(action);
    }

    pub fn take_pending_actions(&self, label: &str) -> Vec<String> {
        self.pending_actions
            .lock()
            .unwrap()
            .remove(label)
            .unwrap_or_default()
    }

    pub fn set_pending_maximize(&self, label: &str, maximize: bool) {
        self.pending_maximize
            .lock()
            .unwrap()
            .insert(label.to_string(), maximize);
    }

    pub fn take_pending_maximize(&self, label: &str) -> bool {
        self.pending_maximize
            .lock()
            .unwrap()
            .remove(label)
            .unwrap_or(false)
    }

    pub fn next_save_generation(&self) -> u64 {
        self.save_generation
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst)
            + 1
    }

    pub fn save_generation(&self) -> u64 {
        self.save_generation
            .load(std::sync::atomic::Ordering::SeqCst)
    }

    /// Drops every per-window entry when a window is destroyed.
    pub fn forget_window(&self, label: &str) {
        self.dirty.lock().unwrap().remove(label);
        self.confirmed.lock().unwrap().remove(label);
        self.ready.lock().unwrap().remove(label);
        self.pending_open.lock().unwrap().remove(label);
        self.pending_actions.lock().unwrap().remove(label);
        self.pending_maximize.lock().unwrap().remove(label);
    }
}
