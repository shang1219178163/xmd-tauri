use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, EventTarget, Manager, Wry};

use crate::state::AppState;
use crate::window;

/// Actions that may create a window when none is open (mirrors the Electron build).
const NEW_WINDOW_ACTIONS: &[&str] = &["new-map", "new-starter", "new-template"];

fn is_zh(language: &str) -> bool {
    language.to_lowercase().starts_with("zh")
}

fn t<'a>(zh: bool, chinese: &'a str, english: &'a str) -> &'a str {
    if zh {
        chinese
    } else {
        english
    }
}

pub fn build_menu(app: &AppHandle, language: &str) -> tauri::Result<Menu<Wry>> {
    let zh = is_zh(language);

    let new_map = MenuItemBuilder::with_id("new-map", t(zh, "新建空白图", "New Blank Map"))
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let new_starter = MenuItemBuilder::with_id("new-starter", t(zh, "新建示例图", "New Starter Map"))
        .accelerator("CmdOrCtrl+Shift+N")
        .build(app)?;
    let new_template = MenuItemBuilder::with_id("new-template", t(zh, "从模板新建…", "New from Template…"))
        .accelerator("CmdOrCtrl+T")
        .build(app)?;
    let open = MenuItemBuilder::with_id("open", t(zh, "打开…", "Open…"))
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let save = MenuItemBuilder::with_id("save", t(zh, "保存", "Save"))
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let save_as = MenuItemBuilder::with_id("save-as", t(zh, "另存为…", "Save As…"))
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;

    let import_md = MenuItemBuilder::with_id("import-markdown", t(zh, "从 Markdown 导入…", "Import Markdown…")).build(app)?;
    let import_opml = MenuItemBuilder::with_id("import-opml", t(zh, "从 OPML 导入…", "Import OPML…")).build(app)?;
    let import_docx = MenuItemBuilder::with_id("import-word", t(zh, "从 Word 导入…", "Import Word…")).build(app)?;
    let import_menu = SubmenuBuilder::new(app, t(zh, "导入", "Import"))
        .item(&import_md)
        .item(&import_opml)
        .item(&import_docx)
        .build()?;

    let export_png = MenuItemBuilder::with_id("export-png", t(zh, "导出为 PNG…", "Export as PNG…"))
        .accelerator("CmdOrCtrl+Shift+E")
        .build(app)?;
    let export_svg = MenuItemBuilder::with_id("export-svg", t(zh, "导出为 SVG…", "Export as SVG…")).build(app)?;
    let export_pdf = MenuItemBuilder::with_id("export-pdf", t(zh, "导出为 PDF…", "Export as PDF…")).build(app)?;
    let export_md = MenuItemBuilder::with_id("export-markdown", t(zh, "导出为 Markdown…", "Export as Markdown…")).build(app)?;
    let export_txt = MenuItemBuilder::with_id("export-text", t(zh, "导出为纯文本…", "Export as Plain Text…")).build(app)?;
    let export_docx = MenuItemBuilder::with_id("export-docx", t(zh, "导出为 Word…", "Export as Word…")).build(app)?;
    let export_xlsx = MenuItemBuilder::with_id("export-xlsx", t(zh, "导出为 Excel…", "Export as Excel…")).build(app)?;
    let export_pptx = MenuItemBuilder::with_id("export-pptx", t(zh, "导出为 PowerPoint…", "Export as PowerPoint…")).build(app)?;
    let export_opml = MenuItemBuilder::with_id("export-opml", t(zh, "导出为 OPML…", "Export as OPML…")).build(app)?;
    let export_menu = SubmenuBuilder::new(app, t(zh, "导出", "Export"))
        .item(&export_png)
        .item(&export_svg)
        .item(&export_pdf)
        .separator()
        .item(&export_md)
        .item(&export_txt)
        .item(&export_docx)
        .item(&export_xlsx)
        .item(&export_pptx)
        .item(&export_opml)
        .build()?;

    let print = MenuItemBuilder::with_id("print", t(zh, "打印…", "Print…"))
        .accelerator("CmdOrCtrl+P")
        .build(app)?;
    let close = MenuItemBuilder::with_id("close", t(zh, "关闭窗口", "Close Window"))
        .accelerator("CmdOrCtrl+W")
        .build(app)?;

    let file_menu = SubmenuBuilder::new(app, t(zh, "文件", "File"))
        .item(&new_map)
        .item(&new_starter)
        .item(&new_template)
        .separator()
        .item(&open)
        .separator()
        .item(&save)
        .item(&save_as)
        .separator()
        .item(&import_menu)
        .item(&export_menu)
        .separator()
        .item(&print)
        .item(&close)
        .build()?;

    let undo = MenuItemBuilder::with_id("undo", t(zh, "撤销", "Undo"))
        .accelerator("CmdOrCtrl+Z")
        .build(app)?;
    let redo = MenuItemBuilder::with_id("redo", t(zh, "重做", "Redo"))
        .accelerator("CmdOrCtrl+Shift+Z")
        .build(app)?;
    let cut = MenuItemBuilder::with_id("cut", t(zh, "剪切", "Cut"))
        .accelerator("CmdOrCtrl+X")
        .build(app)?;
    let copy = MenuItemBuilder::with_id("copy", t(zh, "复制", "Copy"))
        .accelerator("CmdOrCtrl+C")
        .build(app)?;
    let paste = MenuItemBuilder::with_id("paste", t(zh, "粘贴", "Paste"))
        .accelerator("CmdOrCtrl+V")
        .build(app)?;
    let delete = MenuItemBuilder::with_id("delete", t(zh, "删除", "Delete")).build(app)?;
    let select_all = MenuItemBuilder::with_id("select-all", t(zh, "全选", "Select All"))
        .accelerator("CmdOrCtrl+A")
        .build(app)?;

    let edit_menu = SubmenuBuilder::new(app, t(zh, "编辑", "Edit"))
        .item(&undo)
        .item(&redo)
        .separator()
        .item(&cut)
        .item(&copy)
        .item(&paste)
        .item(&delete)
        .separator()
        .item(&select_all)
        .build()?;

    let insert_topic = MenuItemBuilder::with_id("insert-topic", t(zh, "插入主题", "Insert Topic")).build(app)?;
    let insert_sibling = MenuItemBuilder::with_id("insert-sibling", t(zh, "插入同级主题", "Insert Sibling Topic")).build(app)?;
    let insert_floating = MenuItemBuilder::with_id("insert-floating", t(zh, "插入自由主题", "Insert Floating Topic"))
        .accelerator("CmdOrCtrl+Shift+F")
        .build(app)?;
    let insert_note = MenuItemBuilder::with_id("insert-note", t(zh, "插入备注", "Insert Note"))
        .accelerator("CmdOrCtrl+Shift+K")
        .build(app)?;
    let insert_label = MenuItemBuilder::with_id("insert-label", t(zh, "插入标签", "Insert Label")).build(app)?;
    let insert_marker = MenuItemBuilder::with_id("insert-marker", t(zh, "插入标记", "Insert Marker")).build(app)?;
    let insert_relationship = MenuItemBuilder::with_id("insert-relationship", t(zh, "插入关系线", "Insert Relationship")).build(app)?;
    let insert_boundary = MenuItemBuilder::with_id("insert-boundary", t(zh, "插入边界", "Insert Boundary")).build(app)?;
    let insert_summary = MenuItemBuilder::with_id("insert-summary", t(zh, "插入摘要", "Insert Summary")).build(app)?;
    let insert_image = MenuItemBuilder::with_id("insert-image", t(zh, "插入图片", "Insert Image")).build(app)?;
    let insert_attachment = MenuItemBuilder::with_id("insert-attachment", t(zh, "插入附件", "Insert Attachment")).build(app)?;

    let insert_menu = SubmenuBuilder::new(app, t(zh, "插入", "Insert"))
        .item(&insert_topic)
        .item(&insert_sibling)
        .item(&insert_floating)
        .separator()
        .item(&insert_note)
        .item(&insert_label)
        .item(&insert_marker)
        .item(&insert_relationship)
        .item(&insert_boundary)
        .item(&insert_summary)
        .separator()
        .item(&insert_image)
        .item(&insert_attachment)
        .build()?;

    let zoom_in = MenuItemBuilder::with_id("zoom-in", t(zh, "放大", "Zoom In"))
        .accelerator("CmdOrCtrl+=")
        .build(app)?;
    let zoom_out = MenuItemBuilder::with_id("zoom-out", t(zh, "缩小", "Zoom Out"))
        .accelerator("CmdOrCtrl+-")
        .build(app)?;
    let zoom_reset = MenuItemBuilder::with_id("zoom-reset", t(zh, "实际大小", "Actual Size"))
        .accelerator("CmdOrCtrl+0")
        .build(app)?;
    let fit = MenuItemBuilder::with_id("fit", t(zh, "适应画布", "Fit to Canvas"))
        .accelerator("CmdOrCtrl+Shift+H")
        .build(app)?;
    let theme_panel = MenuItemBuilder::with_id("theme-panel", t(zh, "主题面板", "Theme Panel"))
        .accelerator("CmdOrCtrl+Shift+T")
        .build(app)?;
    let format_panel = MenuItemBuilder::with_id("format-panel", t(zh, "格式面板", "Format Panel"))
        .accelerator("CmdOrCtrl+Shift+F")
        .build(app)?;
    let outline_panel = MenuItemBuilder::with_id("outline-panel", t(zh, "大纲视图", "Outline"))
        .accelerator("CmdOrCtrl+Shift+O")
        .build(app)?;
    let outline_tree = MenuItemBuilder::with_id("outline-tree", t(zh, "大纲面板", "Outline Panel")).build(app)?;
    let search_panel = MenuItemBuilder::with_id("search-panel", t(zh, "搜索", "Search"))
        .accelerator("CmdOrCtrl+F")
        .build(app)?;
    let notes_panel = MenuItemBuilder::with_id("notes-panel", t(zh, "备注", "Notes")).build(app)?;
    let navigator_panel = MenuItemBuilder::with_id("navigator-panel", t(zh, "导航面板", "Navigator")).build(app)?;
    let zen = MenuItemBuilder::with_id("zen", t(zh, "ZEN 专注模式", "ZEN Mode"))
        .accelerator("CmdOrCtrl+Alt+Z")
        .build(app)?;
    let pitch = MenuItemBuilder::with_id("pitch", t(zh, "演示模式", "Pitch Mode"))
        .accelerator("CmdOrCtrl+Shift+P")
        .build(app)?;
    let dark = MenuItemBuilder::with_id("toggle-dark", t(zh, "深色外观", "Dark Appearance")).build(app)?;
    let fullscreen = PredefinedMenuItem::fullscreen(app, None)?;

    let view_menu = SubmenuBuilder::new(app, t(zh, "视图", "View"))
        .item(&zoom_in)
        .item(&zoom_out)
        .item(&zoom_reset)
        .item(&fit)
        .separator()
        .item(&theme_panel)
        .item(&format_panel)
        .item(&outline_panel)
        .item(&outline_tree)
        .item(&search_panel)
        .item(&notes_panel)
        .item(&navigator_panel)
        .separator()
        .item(&zen)
        .item(&pitch)
        .item(&dark)
        .separator()
        .item(&fullscreen)
        .build()?;

    let new_window = MenuItemBuilder::with_id("new-window", t(zh, "新建窗口", "New Window"))
        .accelerator("CmdOrCtrl+Shift+M")
        .build(app)?;
    let minimize = PredefinedMenuItem::minimize(app, Some(t(zh, "最小化", "Minimize")))?;
    let maximize = PredefinedMenuItem::maximize(app, Some(t(zh, "缩放", "Zoom")))?;

    let mut window_builder = SubmenuBuilder::new(app, t(zh, "窗口", "Window"))
        .item(&new_window)
        .item(&minimize)
        .item(&maximize);
    #[cfg(target_os = "macos")]
    {
        let front = PredefinedMenuItem::bring_all_to_front(app, Some(t(zh, "前置全部窗口", "Bring All to Front")))?;
        window_builder = window_builder.separator().item(&front);
    }
    let window_menu = window_builder.build()?;

    let shortcuts = MenuItemBuilder::with_id("shortcuts", t(zh, "快捷键", "Keyboard Shortcuts"))
        .accelerator("CmdOrCtrl+/")
        .build(app)?;
    let about = MenuItemBuilder::with_id("about", t(zh, "关于 xmd", "About xmd")).build(app)?;
    let help_menu = SubmenuBuilder::new(app, t(zh, "帮助", "Help"))
        .item(&shortcuts)
        .item(&about)
        .build()?;

    let mut builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    {
        let app_about = PredefinedMenuItem::about(
            app,
            Some(t(zh, "关于 xmd", "About xmd")),
            None,
        )?;
        let services = PredefinedMenuItem::services(app, None)?;
        let hide = PredefinedMenuItem::hide(app, None)?;
        let hide_others = PredefinedMenuItem::hide_others(app, None)?;
        let show_all = PredefinedMenuItem::show_all(app, None)?;
        let quit = MenuItemBuilder::with_id("quit", t(zh, "退出 xmd", "Quit xmd"))
            .accelerator("CmdOrCtrl+Q")
            .build(app)?;
        let app_menu = SubmenuBuilder::new(app, "xmd")
            .item(&app_about)
            .separator()
            .item(&services)
            .separator()
            .item(&hide)
            .item(&hide_others)
            .item(&show_all)
            .separator()
            .item(&quit)
            .build()?;
        builder = builder.item(&app_menu);
    }

    builder = builder
        .item(&file_menu)
        .item(&edit_menu)
        .item(&insert_menu)
        .item(&view_menu)
        .item(&window_menu)
        .item(&help_menu);

    builder.build()
}

pub fn set_language(app: &AppHandle, language: &str) -> Result<(), String> {
    *app.state::<AppState>().menu_language.lock().unwrap() = language.to_string();
    let menu = build_menu(app, language).map_err(|err| err.to_string())?;
    app.set_menu(menu).map_err(|err| err.to_string())?;
    Ok(())
}

pub fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "quit" => {
            app.exit(0);
            return;
        }
        "new-window" => {
            let _ = window::create_window(app, vec![], vec![]);
            return;
        }
        "close" => {
            if let Some(target) = window::focused_window(app) {
                let _ = target.close();
            }
            return;
        }
        _ => {}
    }

    if let Some(target) = window::focused_window(app) {
        let label = target.label().to_string();
        let state = app.state::<AppState>();
        if state.is_ready(&label) {
            let _ = app.emit_to(EventTarget::webview_window(label.as_str()), "menu:action", id);
        } else {
            state.push_pending_action(&label, id.to_string());
        }
    } else if NEW_WINDOW_ACTIONS.contains(&id) {
        let _ = window::create_window(app, vec![], vec![id.to_string()]);
    }
}
