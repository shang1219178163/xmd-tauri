# xmd（Tauri 版）

一个完全离线的思维导图桌面应用，参照 Xmind 的工作方式重建。**无登录、无订阅、无云同步、无联网依赖**，所有导图只保存在本机。

本项目是 `../xmd/app`（Electron 版）的 Tauri 2 复刻：渲染层、文档模型、布局引擎、文件格式与导出逻辑完整保留，桌面能力由 Rust 后端重新实现。

![license](https://img.shields.io/badge/license-MIT-blue)

## 功能

- **编辑器** — 中心主题 / 分支主题 / 子主题 / 自由主题；`Tab`、`Enter`、`F2`、方向键、双击内联编辑；拖拽移动与排序；框选与多选；折叠/展开；撤销/重做；复制/剪切/粘贴；查找定位。
- **邻近吸附** — 拖动到其他主题附近（72px 间隙）高亮目标并以子主题吸附；拖离父节点 112px 以上自动变为自由主题；幽灵预览保持 12px 碰撞间隙；整次拖动只算一步撤销。
- **文件格式** — 读写 `.xmind` 工作簿（ZIP：`content.json`、`metadata.json`、`manifest.json`，并兼容 `content.xml`）；多画布、最近文件、自动保存、另存为、未保存提示。
- **8+ 结构** — 思维导图、不平衡导图、逻辑图（左右）、组织架构图（上下）、树形图（左右）、水平/垂直时间轴、鱼骨图（左右）、矩阵、树形表格、括号图、表格布局。
- **样式** — 30 套原创主题、单主题字体/颜色/填充/边框/分支线、字体选择弹窗（最近使用 + 系统字体搜索 + 实时生效）、形状、手绘模式、复制/粘贴样式。
- **元素** — 79 个标记（9 组）、标签、备注、超链接、附件、图片、关系线、边界、摘要。
- **视图** — 大纲视图、搜索、备注、标记、导航缩略图、ZEN 专注模式、Pitch 演示模式。
- **导入/导出** — PNG、SVG、PDF、Markdown、纯文本、Word（.docx）、Excel（.xlsx）、PowerPoint（.pptx）、OPML；导入 Markdown / OPML / Word；打印。
- **模板库** — 20 个原创模板（项目计划、会议、SWOT、OKR、旅行、学习等）。
- **桌面集成** — macOS 原生菜单与快捷键、多窗口、文件关联（双击 `.xmind` 打开）、深浅外观、中英双语、窗口位置/大小记忆、未保存关闭拦截。

## 技术栈

Tauri 2 · Rust · React 19 · TypeScript 5.9 · Vite 8 · Zustand 5 · JSZip · fast-xml-parser · docx · xlsx · pptxgenjs · mammoth · lucide-react · Vitest

## 开始使用

```bash
npm install
npm start          # 启动开发版（Tauri + Vite）
```

其他脚本：

```bash
npm run typecheck    # TypeScript 检查
npm test             # Vitest 单元测试
npm run build        # 构建前端
npm run package      # 构建安装包（.app / .dmg）
npm run package:mac  # 同上，macOS 原生架构
npm run package:universal  # 通用二进制（需先安装 aarch64 目标）
```

打包产物位于 `src-tauri/target/release/bundle/`：

- `macos/xmd.app` — 可直接运行的 macOS 应用（约 13 MB）
- `dmg/xmd_1.0.0_x64.dmg` — 拖入“应用程序”的安装包（约 4.1 MB）

> 首次在另一台 Mac 上运行未签名应用时，请右键 → 打开。构建需要 Rust 工具链（`rustup`）与 Xcode Command Line Tools。

## 快捷键

| 操作 | 快捷键 |
| --- | --- |
| 添加子主题 | `Tab` |
| 添加同级主题 | `Enter` |
| 编辑主题 | `F2` / 双击 |
| 删除主题 | `Delete` / `Backspace` |
| 撤销 / 重做 | `⌘Z` / `⇧⌘Z` |
| 复制 / 剪切 / 粘贴 | `⌘C` / `⌘X` / `⌘V` |
| 全选 | `⌘A` |
| 查找 | `⌘F` |
| 保存 / 另存为 | `⌘S` / `⇧⌘S` |
| 打开 | `⌘O` |
| 放大 / 缩小 / 实际大小 | `⌘+` / `⌘-` / `⌘0` |
| 适应画布 | `⇧⌘H` |
| 主题面板 / 格式面板 | `⇧⌘T` / `⇧⌘F` |
| 大纲视图 | `⇧⌘O` |
| 演示模式 | `⇧⌘P` |
| 命令面板 | `⌘K` |
| 平移画布 | `Space` + 拖动，或中键拖动 |
| 缩放画布 | `⌘` + 滚轮 |

## 目录结构

```
xmd-tauri/
├── src/
│   ├── renderer/          React 界面（与 Electron 版一致）
│   │   └── src/
│   │       ├── components/ 画布、工具栏、检查器、对话框、演示模式
│   │       ├── data/       主题、模板、标记、快捷键
│   │       ├── file/       .xmind / XML / Markdown / OPML 读写
│   │       ├── export/     SVG、PNG、PDF、DOCX、XLSX、PPTX 导出
│   │       ├── layout/     纯函数布局引擎（所有结构）
│   │       ├── model/      主题树与样式解析
│   │       ├── hooks/      键盘、菜单、文件操作
│   │       ├── store/      Zustand 文档与 UI 状态
│   │       └── desktop.ts  Tauri 版 window.desktop 桥接
│   └── shared/            类型、默认值、结构定义
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs         应用启动、事件循环
│   │   ├── commands.rs    文件对话框、读写、导出、剪贴板 IPC
│   │   ├── menu.rs        原生菜单（中英双语）
│   │   ├── window.rs      多窗口、窗口状态、脏关闭
│   │   ├── print.rs       原生打印 / HTML→PDF（WKWebView）
│   │   ├── settings.rs    设置与最近文件
│   │   └── state.rs       跨窗口状态
│   ├── capabilities/      Tauri 权限
│   └── tauri.conf.json    窗口、打包、文件关联
└── vitest.config.ts
```

## `.xmind` 兼容性

工作簿是一个 ZIP：

| 条目 | 用途 |
| --- | --- |
| `content.json` | 画布、主题、样式、标记、备注、关系线 |
| `metadata.json` | 创建者与当前画布 id |
| `manifest.json` | 文件条目清单 |
| `content.xml` | 旧版 XMind 8 大纲（可读可写） |
| `Thumbnails/thumbnail.png` | 预览图 |

读取端同时接受现代 `[sheet, …]` 数组与旧式 `[{ "0": sheet }]` 包裹结构；写入端输出现代数组。图片以内联 data URL 保存，导图始终自包含。

## 与 Electron 版的差异

- 桌面桥接由 `src/preload` + Electron IPC 改为 `src/renderer/src/desktop.ts` + Tauri 命令，渲染层调用方式不变。
- 菜单、窗口、文件对话框、剪贴板、最近文件、设置与窗口状态由 Rust 实现；行为对齐原版。
- PDF 导出使用 macOS 原生 `WKWebView.createPDF`（不依赖打印会话，保留系统中文字体）；多画布导出为包含全部画布的单一长页 PDF。
- 打印使用系统打印面板；即使没有配置打印机，也可以在面板中选择“存储为 PDF”。
- 非 macOS 平台的 PDF/打印暂未实现原生渲染（会返回明确的错误提示）；文件、编辑、导出（PNG/SVG/Markdown/Word/Excel/PowerPoint/OPML）等功能跨平台可用。

## 隐私

应用完全离线运行：不要求账号、不上传导图、不含统计。导出与打印只写入你选择的文件。

## 说明

- 本项目基于对本地已停止维护的 Xmind 版本的授权研究重建，未复制任何专有代码、图标、图片或文案；主题、模板、图标与界面文案均为原创。
- 已知限制与原版一致：矩阵 / 表格结构使用近似布局，Pitch 模式为按分支的简易幻灯片，音频备注与快捷键自定义未实现，旧版 `content.xml` 的样式支持有限（完整数据仍在 `content.json` 中）。
