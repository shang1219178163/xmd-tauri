//! HTML → PDF and printing through the platform webview.
//!
//! The renderer builds a printable HTML document (one section per sheet) and
//! hands it to the host. On macOS we load it in an off-screen WKWebView.
//!
//! PDF generation goes through `WKWebView.createPDFWithConfiguration:` which
//! does not require a printing session (unlike `NSPrintOperation`, which fails
//! on machines without a default printer even when saving to PDF). Printing
//! still uses the native print operation, falling back to a PDF preview when
//! no printer is configured.

use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

struct Prepared {
    window: WebviewWindow,
    file: PathBuf,
}

impl Prepared {
    fn cleanup(self) {
        let _ = self.window.close();
        let _ = std::fs::remove_file(self.file);
    }
}

fn stamp() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn temp_html(app: &AppHandle, html: &str) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|err| format!("无法定位缓存目录：{err}"))?;
    std::fs::create_dir_all(&dir).map_err(|err| format!("无法创建缓存目录：{err}"))?;
    let path = dir.join(format!("xmd-render-{}.html", stamp()));
    std::fs::write(&path, html).map_err(|err| format!("无法写入临时文件：{err}"))?;
    Ok(path)
}

/// Loads `html` into an off-screen window and waits until layout settles.
async fn prepare(app: &AppHandle, html: &str) -> Result<Prepared, String> {
    let file = temp_html(app, html)?;
    let url = tauri::Url::from_file_path(&file).map_err(|_| "无法构造临时文件 URL".to_string())?;
    let label = format!("render-{}", stamp());

    let (load_tx, load_rx) = mpsc::channel::<()>();
    let load_tx = Arc::new(Mutex::new(load_tx));

    let window = match WebviewWindowBuilder::new(app, label.as_str(), WebviewUrl::External(url))
        .title("xmd Renderer")
        .visible(false)
        .decorations(false)
        .skip_taskbar(true)
        .inner_size(900.0, 1200.0)
        .on_page_load(move |_window, payload| {
            if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                if let Ok(sender) = load_tx.lock() {
                    let _ = sender.send(());
                }
            }
        })
        .build()
    {
        Ok(window) => window,
        Err(err) => {
            let _ = std::fs::remove_file(&file);
            return Err(format!("无法创建渲染窗口：{err}"));
        }
    };

    let loaded = tauri::async_runtime::spawn_blocking(move || {
        load_rx.recv_timeout(Duration::from_secs(30))
    })
    .await;

    if !matches!(loaded, Ok(Ok(()))) {
        let _ = window.close();
        let _ = std::fs::remove_file(&file);
        return Err("打印内容加载超时".to_string());
    }

    // Give WebKit a moment to finish layout/paint before capturing.
    tokio::time::sleep(Duration::from_millis(400)).await;
    Ok(Prepared { window, file })
}

/// Renders `html` to a PDF file using WKWebView's PDF export.
#[cfg(target_os = "macos")]
pub async fn render_html_to_pdf(
    app: &AppHandle,
    html: &str,
    _landscape: bool,
    output: &Path,
) -> Result<(), String> {
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent).map_err(|err| format!("无法创建目录：{err}"))?;
    }
    std::fs::remove_file(output).ok();

    let prepared = prepare(app, html).await?;
    let target = output.to_path_buf();
    let (done_tx, done_rx) = mpsc::channel::<Result<(), String>>();

    prepared
        .window
        .with_webview(move |platform_webview| {
            unsafe { start_create_pdf(platform_webview.inner(), target, done_tx) }
        })
        .map_err(|err| format!("无法调用 PDF 渲染：{err}"))?;

    let result = tauri::async_runtime::spawn_blocking(move || {
        done_rx.recv_timeout(Duration::from_secs(120))
    })
    .await
    .map_err(|err| err.to_string())?;

    prepared.cleanup();

    match result {
        Ok(Ok(())) => {}
        Ok(Err(message)) => {
            let _ = std::fs::remove_file(output);
            return Err(message);
        }
        Err(_) => {
            let _ = std::fs::remove_file(output);
            return Err("PDF 渲染超时".to_string());
        }
    }

    let size = std::fs::metadata(output).map(|meta| meta.len()).unwrap_or(0);
    if size == 0 {
        let _ = std::fs::remove_file(output);
        return Err("PDF 生成失败：文件为空".to_string());
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub async fn render_html_to_pdf(
    _app: &AppHandle,
    _html: &str,
    _landscape: bool,
    _output: &Path,
) -> Result<(), String> {
    Err("当前平台暂不支持原生 PDF 渲染".to_string())
}

/// Opens the system print dialog for the supplied HTML document.
#[cfg(target_os = "macos")]
pub async fn print_html(app: &AppHandle, html: &str) -> Result<bool, String> {
    let prepared = prepare(app, html).await?;
    let (done_tx, done_rx) = mpsc::channel::<bool>();
    let result = prepared.window.with_webview(move |platform_webview| unsafe {
        let ok = run_print_operation(platform_webview.inner(), true);
        let _ = done_tx.send(ok);
    });

    let ok = if result.is_ok() {
        tauri::async_runtime::spawn_blocking(move || {
            done_rx.recv_timeout(Duration::from_secs(300))
        })
        .await
        .ok()
        .and_then(|value| value.ok())
        .unwrap_or(false)
    } else {
        false
    };

    prepared.cleanup();
    Ok(ok)
}

#[cfg(not(target_os = "macos"))]
pub async fn print_html(_app: &AppHandle, _html: &str) -> Result<bool, String> {
    Err("当前平台暂不支持打印".to_string())
}

#[cfg(target_os = "macos")]
unsafe fn start_create_pdf(
    webview: *mut std::ffi::c_void,
    output: PathBuf,
    done: mpsc::Sender<Result<(), String>>,
) {
    use block2::RcBlock;
    use objc2::msg_send;
    use objc2::runtime::AnyObject;

    if webview.is_null() {
        let _ = done.send(Err("网页视图不可用".to_string()));
        return;
    }
    let webview = webview as *mut AnyObject;

    let available: bool = msg_send![
        webview,
        respondsToSelector: objc2::sel!(createPDFWithConfiguration:completionHandler:)
    ];
    if !available {
        let _ = done.send(Err("当前系统版本不支持 PDF 渲染".to_string()));
        return;
    }

    let config: *mut AnyObject = msg_send![objc2::class!(WKPDFConfiguration), new];
    if config.is_null() {
        let _ = done.send(Err("无法创建 PDF 配置".to_string()));
        return;
    }

    // WKPDFConfiguration's default rect (CGRectNull) captures the entire web
    // content. Note: WKWebView has no public `scrollView` on macOS, so the
    // content size must not be read through NSScrollView.

    let block = RcBlock::new(move |data: *mut AnyObject, error: *mut AnyObject| {
        if data.is_null() {
            let message = if error.is_null() {
                "PDF 生成失败".to_string()
            } else {
                let description: *mut AnyObject = msg_send![error, localizedDescription];
                if description.is_null() {
                    "PDF 生成失败".to_string()
                } else {
                    let bytes: *const std::os::raw::c_char = msg_send![description, UTF8String];
                    if bytes.is_null() {
                        "PDF 生成失败".to_string()
                    } else {
                        std::ffi::CStr::from_ptr(bytes)
                            .to_string_lossy()
                            .to_string()
                    }
                }
            };
            let _ = done.send(Err(message));
            return;
        }

        let bytes: *const u8 = msg_send![data, bytes];
        let length: usize = msg_send![data, length];
        if bytes.is_null() || length == 0 {
            let _ = done.send(Err("PDF 内容为空".to_string()));
            return;
        }
        let slice = std::slice::from_raw_parts(bytes, length);
        let result = std::fs::write(&output, slice)
            .map_err(|err| format!("无法写入 PDF：{err}"));
        let _ = done.send(result);
    });
    let _: () = msg_send![
        webview,
        createPDFWithConfiguration: config,
        completionHandler: &*block
    ];
    let _: () = msg_send![config, release];
}

#[cfg(target_os = "macos")]
unsafe fn run_print_operation(webview: *mut std::ffi::c_void, show_panel: bool) -> bool {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;
    use objc2_foundation::NSSize;

    if webview.is_null() {
        return false;
    }
    let webview = webview as *mut AnyObject;

    let shared: *mut AnyObject = msg_send![objc2::class!(NSPrintInfo), sharedPrintInfo];
    if shared.is_null() {
        return false;
    }
    let info: *mut AnyObject = msg_send![shared, copy];
    if info.is_null() {
        return false;
    }

    let paper = NSSize {
        width: 595.28,
        height: 841.89,
    };
    let margin: f64 = 28.35;
    let _: () = msg_send![info, setPaperSize: paper];
    let _: () = msg_send![info, setOrientation: 0i64];
    let _: () = msg_send![info, setTopMargin: margin];
    let _: () = msg_send![info, setBottomMargin: margin];
    let _: () = msg_send![info, setLeftMargin: margin];
    let _: () = msg_send![info, setRightMargin: margin];

    let operation: *mut AnyObject = msg_send![webview, printOperationWithPrintInfo: info];
    if operation.is_null() {
        let _: () = msg_send![info, release];
        return false;
    }

    let _: () = msg_send![operation, setShowsPrintPanel: show_panel];
    let _: () = msg_send![operation, setShowsProgressPanel: false];
    let _: () = msg_send![operation, setCanSpawnSeparateThread: false];
    let ok: bool = msg_send![operation, runOperation];

    let _: () = msg_send![info, release];
    ok
}
