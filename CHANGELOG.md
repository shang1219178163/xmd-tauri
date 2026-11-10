# Changelog

## 2026-11-10 14:35

### 调整：关于弹窗移除右下角关闭按钮

- 「关于 xmd」对话框去掉底部的「关闭」按钮，保留标题栏右上角的关闭图标与 Esc 关闭。

## 2026-11-10 14:32

### 调整：xmd-config.json 的 updatedAt 改为字符串

- `UserConfig.updatedAt` 由毫秒时间戳（number）改为 ISO 8601 字符串，如 `"2026-11-10T06:30:00.000Z"`。
- 写入侧（更改配置、导入、重置、导出）统一使用 `new Date().toISOString()`。
- 读取旧配置时，数字时间戳自动转换为 ISO 字符串，保持向后兼容。

## 2026-11-10 14:29

### 调整：创建关系线不再弹出提示

- 移除「点击目标主题以创建关系线」「已创建关系线」toast。
- 右键菜单里的「插入关系线」不再提示「点击目标主题以完成关系线」。
- 连接模式下画布上的提示文字不再显示；未选中主题时的错误提示保留。

## 2026-11-10 14:25

### 调整：保存成功不再弹提示

- 移除 `useFileOps` 中保存成功后的「已保存」toast；失败仍提示「保存失败：…」。
- 状态栏右侧的「未保存 / 已保存」状态文字保持不变。

## 2026-11-10 14:23

### 调整：图标内容尺寸改为 108px（相对 128px 画布）

- `app-icon.svg` 缩放 0.82 → 0.836（留白 92.16 → 83.968px）。
- 重新生成图标，128px 图标内容实测 108×108。
- 本地重新打包 `xmd.app` 并打开验证。

## 2026-11-10 14:21

### 调整：应用图标内容与系统图标一致

- 实测 `/System/Applications/Music.app` 图标内容占画布 106/128（≈82.8%）。
- `app-icon.svg` 缩放由 0.8047 改为 0.82（四周留白 92.16px），重新生成全平台图标。
- 生成后 128px 图标内容为 106×106，与系统图标一致；`icon.png` 仍为 150×150。
- 本地重新打包 `xmd.app`（12.87 MiB）验证 Dock 效果。

## 2026-11-10 14:15

### 调整：应用图标改为 macOS 系统图标网格

- `app-icon.svg` 内容缩放由 90% 改为 Apple 标准网格 824/1024（≈80.47%），四周留白 100px。
- 重新生成 `src-tauri/icons` 全平台图标；`icon.png` 仍保持 150×150。
- 实测 128px 图标内容区域约 104px（81%），与系统图标观感一致。

## 2026-11-10 14:06

### 发布：v1.0.0 重新构建（覆盖旧包）

- 删除旧的 `v1.0.0` Release 与 tag，同时清理了此前的 `v1.0.1` tag/Release。
- `develop` 合入 `main`（`89bba08`），重新打 `v1.0.0` 触发 Actions，构建完成后 `develop` 回灌。
- 版本号文件（`package.json`、`src-tauri/tauri.conf.json`）回退到 `1.0.0` 与 tag 对齐，提交 `89c461f`。
- Actions 全绿：Apple Silicon 1m48s、Intel 6m28s。
- Release：https://github.com/shang1219178163/xmd-tauri/releases/tag/v1.0.0
- 产物：`xmd_1.0.0_aarch64.dmg`、`xmd_1.0.0_x64.dmg`，以及 `xmd_{aarch64,x64}.app.tar.gz`。
- 该版本包含关系线可视化编辑（弧度控制点、颜色、删除）等全部最新改动。

## 2026-11-10 13:29

### 新增：关系线可视化编辑

- 曲线改为三次贝塞尔，悬停或选中关系线时显示**两个控制点**（白心圆点）与端点切线，拖动任一控制点即可调整弧度。
- 控制点以「沿弦比例 `t` + 法线偏移 `o`」存储（`Relationship.curve`），节点移动后曲线自动跟随；整次拖动只记一步撤销。
- 线条默认为**黑色虚线 + 同色箭头**；样式面板（样式页）新增「关系线」区块，选中关系线后可改颜色（默认 `#1f2937`），线、箭头、控制点、切线同步变色。
- 箭头改为按颜色动态生成 marker；SVG/PNG 导出同步（实线→虚线、颜色、控制点曲线、标题位置）。
- 删除：选中关系线后按 `Delete` / `Backspace`，或右键选择「删除关系线」；右键菜单另有「修改关系线颜色」。

### 修复

- 点击关系线时 `pointerdown` 冒泡到画布根节点，触发框选并调用 `setPointerCapture`，导致随后的 `click` 落不到线上、关系线无法真正选中（Delete 因此无效）。改为在命中路径上拦截并直接选中。

### 备注

- 开发过程中确认：React Fast Refresh 不会重跑 `useEffect`，键盘监听类改动必须整页重载（重启 `npm start`）才能验证，HMR 日志不能作为生效依据。

## 2026-11-10 10:03

### 发布：v1.0.1

- 版本号 1.0.0 → 1.0.1（`package.json`、`src-tauri/tauri.conf.json`）。
- 发布流程：`release/1.0.1` → `main` → tag `v1.0.1` → 回流 `develop`。
- GitHub Actions 全绿：Apple Silicon 5m48s、Intel 8m2s。
- Release：https://github.com/shang1219178163/xmd-tauri/releases/tag/v1.0.1
- 产物：`xmd_1.0.1_aarch64.dmg`、`xmd_1.0.1_x64.dmg`，以及 `xmd_{aarch64,x64}.app.tar.gz`。
- 本版包含：文件选择器通配符修复、附件可点击打开（含目录回退）、右侧图标统一布局、中心主题概要/边界修复、编辑态描边与背景修复。

## 2026-11-10 08:48

### 修复：文件选择框里所有文件不可选（`b75c5ee`）

- 根因：`rfd` 在 macOS 用 `setAllowedFileTypes` 限制类型，`"*"` 被当成字面扩展名，导致没有任何文件匹配、全部置灰。
- 含通配符的过滤器不再传给系统（等于允许全部文件）；「打开 Xmind 文件」对话框移除无意义的 `All Files`。

### 新增：附件可点击打开（`7bd5a95`）

- 节点角标改为矢量纸夹图标：原 `⧉`（U+29C9）在系统字体中无字形，实际显示为空白；现热区半径 11px、悬停变色。
- 单个带路径的附件直接打开；多个附件或无路径时打开附件列表；列表每行新增「打开」。
- `open_external` 对本地路径打开失败时回退到所在目录（文件不存在、无关联程序等），超链接里的本地路径同样生效。
- 附件选择器不限格式，标签改为「所有文件」。

### 改进：右侧图标统一预留宽度（`bd3f706`）

- 链接与附件共用一条右侧图标列：右外边距 8px、图标 13px、图标间距 5px，文字与最左图标恒留 8px。
- `measureTopic` 按图标数量增加节点宽度（`rightIconReserve`），Canvas 文字区域按 `rightTextInset` 同步右缩。

### 修复：选中中心主题时「概要」「边界」无响应（`8968104`）

- 两个动作都依赖「选中主题的父级」，选中中心主题时静默返回。
- 现在改为汇总 / 包围中心主题的全部子主题；没有子主题时提示错误。

### 其他

- 单元测试 19 个文件、242 项全部通过。

## 2026-11-09 19:33

### 修复：编辑态描边与节点背景之间的白缝

- `outline-offset` 由 1px 改为 0：`outline` 画在盒子外，1px 偏移会透出画布白底。
- 编辑框圆角改为跟随节点形状（`rect` / `capsule` / `ellipse` 取 `shape.rx × zoom`，方角为 0），避免四角露出底色。
- 提交：`25d4d9a`。

## 2026-11-09 19:30

### 改进：主题超链接标记

- 链接标记由 9px 的 `↗` 文本（且 `pointer-events: none`，本就点不动）改为 External Link 描边图标：不封闭方框 + 右上箭头，颜色跟随主题文字色，悬停变淡，热区半径 11px。
- 点击通过新增的 `open_external` 命令交给系统默认程序：`http(s)` / `mailto` 直接打开，`~/` 展开家目录，绝对路径按文件打开，裸域名补 `https://`；失败提示「无法打开链接」。
- 图标位于节点最右侧：右外边距 8px、与文字间距 8px。`measureTopic` 为带链接的主题增加 17px 宽度（`LINK_RESERVE`），文字区域按 `LINK_TEXT_INSET = 29` 右缩，文字不再与图标重叠。
- 备注 ✎ 与附件 ⧉ 角标在存在链接时自动左移避让。
- 提交：`59e3873`（图标与打开）、`e09fbbf`（独立宽度）。

### 修复：节点内联编辑框背景

- 编辑态背景由面板底色改为主题填充色 `fill`，文字色直接使用主题 `color`，移除浅色底下的深色文字补偿。提交：`8da2dd2`。

## 2026-11-09 19:10

### 修复（第二次，实机验证通过）：输入框粘贴剪贴板文本

- 上一版「输入框获得焦点时摘除菜单加速键」的方案**无效**：muda 的 `set_accelerator` 在参数为 `None` 时直接跳过，不会清除已设快捷键（`muda-0.20.0/src/platform_impl/macos/mod.rs:320`）。
- 改为**保留菜单加速键，由菜单事件按焦点分流**：`⌘C/⌘V/⌘X/⌘A/⌘Z` 仍先被菜单拦截，随后在渲染层判断 `document.activeElement` 是否为输入框，是则执行文本操作，否则才落到画布动作。
- 新增 Rust 命令 `read_clipboard_text` / `write_clipboard_text`（arboard），用于读写系统剪贴板纯文本。
- 新增 `src/renderer/src/editing.ts`：输入框 / 文本域的复制、剪切、粘贴、全选、撤销、重做；文本域通过 `setRangeText` + `input` 事件保持 React 受控组件同步。
- 删除上一版无效的快捷键摘除代码（`menu.rs` / `commands.rs` / `desktop.ts` / `useKeyboard.ts`）。
- 新增 `editing.test.ts` 5 项用例；单元测试总数 219，全部通过。实机确认超链接输入框 `⌘V` 可粘贴。

## 2026-11-09 18:30

### 修复：对话框输入框无法粘贴剪贴板文本

- 现象：插入超链接（以及标签、备注等所有文本输入）时，`⌘V` 无法把剪贴板字符串粘进输入框。
- 原因：`src-tauri/src/menu.rs` 给「撤销/重做/剪切/复制/粘贴/全选」绑定了原生加速键，macOS 会在按键送达 WebView 之前匹配菜单项，因此 `useKeyboard` 里 `isTextField` 的放行分支从未生效，`⌘V` 一律执行了「粘贴主题」。
- 修复：新增 `set_editing_shortcuts` 命令与 `menu::set_editing_accelerators`，文本输入获得焦点时临时摘除这 6 个菜单加速键，失焦后按原值恢复；`useKeyboard` 用 `focusin` / `focusout` 同步状态，切换输入框时只在状态变化时调用一次。
- 菜单项仍可点击执行画布操作，快捷键提示保持不变；`Menu::get` 不递归子菜单，查找改为深度优先。
- `tsc --noEmit`、`cargo check`、214 项单元测试全部通过。

> ⚠️ 本方案实机验证无效（muda 无法清除已设加速键），已由 19:10 条目取代。

## 2026-11-09 17:22

### 验证：v1.0.0 由 GitHub Actions 自动构建并发布

- 工作流 `Release` 全绿：`macOS · Apple Silicon` 5m40s、`macOS · Intel` 13m23s，均包含 `npm test` 与 `tauri build`。
- Release：https://github.com/shang1219178163/xmd-tauri/releases/tag/v1.0.0
- 上传产物：`xmd_1.0.0_aarch64.dmg`、`xmd_1.0.0_x64.dmg`，以及 tauri-action 附带的 `xmd_{aarch64,x64}.app.tar.gz` 更新包。
- 分支状态：`develop` 为默认分支，`main` 为 `v1.0.0` 发布基线，本地与远端一致。

## 2026-11-09 17:08

### 修复：CI 缺少 package-lock.json 与 .gitignore，并升级 Actions 版本

- 第二次 tag 构建在 `actions/setup-node` 步骤失败：`Dependencies lock file is not found`。
- 根因是 `~/.gitignore_global` 第 5、6 行分别忽略了 `package-lock.json` 与 `.gitignore`，两者从未进入仓库。
- `.gitignore` 内新增 `!.gitignore`、`!package-lock.json`（仓库级规则优先级高于全局），并补交这两个文件。
- `actions/checkout`、`actions/setup-node` 由 v4 升到 v5，避免 Node 20 弃用告警。

## 2026-11-09 17:07

### 修复：Release 工作流 runner 不可用导致 v1.0.0 构建被取消

- 首次推送 `v1.0.0` 后两个 job 均在 2 秒内 `cancelled`，报错 `The configuration 'macos-14-arm64-us-default' is not supported`。
- 原因：GitHub 已退役 `macos-14` 托管 runner，当前仅提供 `macos-26` / `macos-15` 及其 `-intel` 变体。
- 矩阵改为 Apple Silicon → `macos-15`、Intel → `macos-15-intel`，两者均为原生架构，无需交叉编译；README 同步更新。
- `v1.0.0` tag 尚未产生任何 Release，直接在修复后的 `main` 上重新打 tag 验证。

## 2026-11-09 16:41

### 新增：Gitflow 分支模型与 tag 自动发布

- 新增 `develop` 作为默认集成分支，`main` 只保留已发布版本；README 增加 Gitflow 分支表与常用命令。
- 新增 `.github/workflows/release.yml`：推送 `v*.*.*` tag 触发，校验格式后把版本号同步到 `package.json` 与 `src-tauri/tauri.conf.json`。
- 在 `macos-14` 上并行构建 Apple Silicon（`aarch64-apple-darwin`）与 Intel（`x86_64-apple-darwin`，交叉编译）两个 DMG，先跑 `npm test`，通过后由 `tauri-apps/tauri-action@v0` 创建 GitHub Release 并上传产物。
- 产物未签名；工作流只接受 `vX.Y.Z`，预发布后缀会在校验步骤失败。

## 2026-11-09 16:24

### 仓库：链接到 GitHub

- 本地初始化 git 仓库（`main` 分支），首次提交 179 个文件、2.5 MB；`node_modules`、`dist`、`src-tauri/target`、`src-tauri/gen` 均按 `.gitignore` 排除。
- 创建公开仓库 `shang1219178163/xmd-tauri`，远程 `origin` 使用 SSH，`main` 已跟踪 `origin/main`。
- 提交前做过密钥扫描，命中项均为代码里的 `token`（文本换行）变量，无敏感信息。

## 2026-11-09 16:18

### 构建：重新打包发布包（未清理缓存）

- `npm run package` 全程成功，产出 `xmd.app`（12.92 MiB）与 `xmd_1.0.0_x64.dmg`（4.12 MiB）。
- 打包环境需补充 `PATH=$HOME/.cargo/bin:$PATH`，否则 Tauri 找不到 `cargo` 而空跑。
- DMG 阶段使用 `CI=true`，跳过需要 Finder 自动化权限的 AppleScript 美化步骤；如需背景图与图标排布，需在「系统设置 → 隐私与安全性 → 自动化」授权终端控制 Finder 后重新打包。

## 2026-11-09 16:12

### 调整：导出的 icon.png 改为 150 × 150

- `src-tauri/icons/icon.png` 由 512 × 512 缩小为 150 × 150。
- 该文件未出现在 `tauri.conf.json` 的 `bundle.icon` 列表中，macOS 打包仍使用 `icon.icns`（1024 × 1024），因此应用图标外观不受影响。

## 2026-11-09 16:11

### 调整：app-icon 画布尺寸改为 150 × 150

- `app-icon.svg` 根节点 `width` / `height` 由 `1024` 改为 `150`，`viewBox` 仍为 `0 0 1024 1024`，图案坐标未变。
- 重新生成 `src-tauri/icons` 全部平台图标；因 `viewBox` 不变，各 PNG / ICNS / ICO 输出与上一版逐字节同尺寸、渲染结果一致。

## 2026-11-09 16:01

### 调整：应用图标缩小 10%

- `app-icon.svg` 内容整体缩放为 90%，居中并保留四周各 5% 透明边距。
- 重新生成 `src-tauri/icons` 下全部平台图标（PNG / ICNS / ICO / Android / iOS）。
- 重新构建发布包，使 `xmd.app` 与 DMG 使用新图标。

## 2026-11-09 15:40

### 重命名：项目名 xmind-studio → xmd

- npm 包名、Rust crate/库名、二进制名统一为 `xmd`；Tauri `productName` 改为 `xmd`，bundle identifier 改为 `app.xmd.desktop`。
- 窗口标题、原生菜单、关于对话框、命令面板、i18n、OPML/XMind 元数据、PPTX 署名与默认配置文件名统一为 `xmd`。
- 新增旧数据目录 `app.xmindstudio.desktop` → `app.xmd.desktop` 的一次性迁移（settings / recent / window-state / user-config），现有配置与窗口状态保留。
- 构建产物改为 `xmd.app` / `xmd_1.0.0_x64.dmg`。
- 历史 CHANGELOG 条目保留原项目名称，不作改写。

## 2026-11-09 15:15

### 完善：用户配置与三个标签页菜单一一对应

- 配置结构升级为 v2：样式页 16 个属性 + 宽度、演播 6 项、画布 12 个设置 + 骨架/主题/背景全部常驻 JSON，不再只在修改后出现。
- 旧版或旧导出的 JSON 会自动升级为完整结构；每次启动都会把 `user-config.json` 重写为完整 schema。
- 主题菜单值统一为主题 id（`themeId` + 完整 `theme` 快照）；画布布尔设置（手绘、彩虹、六个布局开关）存储明确的 true/false。
- 样式颜色/字体/字号/字重/边框与分支线宽、背景、宽度使用 `null` 表示“跟随主题/自动”；其余菜单为具体值。
- 重置默认 JSON：骨架「逻辑图（右）」、`fill-pattern: none`（纯色）、`line-class: curve`（曲线）、默认主题，所有字段齐全。
- 单元测试 214 项全部通过；实机验证修改控件只更新对应字段，重置写入完整默认 JSON。

## 2026-11-09 14:49

### 新增：用户配置导入 / 重置

- 画布 → 用户配置新增「导出配置」「导入配置」「重置」三个按钮。
- 导入：选择之前导出的 JSON；解析成功覆盖本地 `user-config.json`；格式错误或无关 JSON 提示「解析失败」，不修改原配置。
- 重置：用内置默认 JSON 覆盖 `user-config.json`：骨架「逻辑图（右）」、样式背景「纯色」（`fill-pattern: none`）、线条「曲线」（`line-class: curve`）。
- 导入/重置在下次启动时应用到新的默认导图；打开已有 `.xmind` 仍以文档内容为准。
- 新增导入/重置/默认配置测试；单元测试总数 214，全部通过。
- 实机验证：无效 JSON → 「解析失败」且配置不变；有效 JSON → 配置被覆盖；重置 → 默认 JSON 写入；重启后样式为「圆角矩形 / 纯色 / 曲线」，骨架为「逻辑图（右）」。

## 2026-11-09 14:24

### 新增：用户配置文件（样式 / 演播 / 画布）

- 新增本地 `user-config.json`（应用数据目录），自动记录样式、演播、画布三个标签页的最后选项；修改后 200ms 防抖写入，首次启动自动创建默认文件。
- 下次启动时把配置应用到新的默认导图：中心主题样式、结构、画布主题/背景/设置、演播参数；打开已有 `.xmind` 时仍以文档内容为准，不覆盖文档。
- 画布 → 用户配置新增“导出配置 JSON”，可将当前配置另存到任意位置。
- 新增 Rust `user_config_get` / `user_config_save` 命令与 6 项配置测试；单元测试总数 210，全部通过。
- 实机验证：修改三个标签页选项 → 写入 JSON → 重启恢复（形状/填充/字重/字体/结构、演播长宽比/方式、画布主题/全局字体/线宽/手绘/中日韩字体）→ 导出 JSON 内容正确。

## 2026-11-09 14:03

### 文档：CHANGELOG 改为时间倒序

- 全部历史条目（含追加的 Electron 历史）按日期时间倒序排列，最新在前。

## 2026-11-09 14:02

### 文档：合并 Electron 原项目历史

- 将 `/Users/shang/GitHub/xmd/CHANGELOG.md` 的全部历史记录合并在本文件末尾。
- 保留原日期、时间与条目内容；以下历史条目按时间倒序排列。原 `# CHANGELOG` 标题移除，原有 `## 日期` 标题降为 `###`，置于「附：Electron 原项目历史记录」之下。

## 2026-11-09 13:55

### 测试：三个标签页的弹窗/选项切换

- **样式页（10 项）**：形状（圆角矩形→矩形→椭圆）、填充（纯色→斜线）、边框（无→细）、线条（曲线→折线）、字体弹窗（搜索并切换字体）、字重（常规→中等）、结构（逻辑图右→逻辑图左）、方向（向右→向左）、分支线（曲线→折线）、分支粗细（默认→中），全部切换成功。
- **演播页（4 项）**：长宽比（自动→16:9）、主题幻灯片（自动→显示）、列表幻灯片（自动→显示）、演说方式（逐一出现并钻入→推入），全部切换成功。
- **画布页**：骨架弹窗（逻辑图左→时间轴水平）、配色方案下拉（彩虹→雪刷）、主题卡片（经典）、全局字体（默认→手写）、分支线粗细（默认→中）、彩虹配色弹窗（选中柔和并关闭）、中日韩字体（默认→黑体）；手绘模式、彩虹分支复选开关往返切换正常。
- 测试后已退出并重新启动应用，恢复干净默认地图。
- 说明：颜色选择器调用 macOS 系统颜色面板，不属于下拉选项切换；未纳入本次自动化切换测试。

## 2026-11-09 13:35

### 字体列表排序：中文字体优先

- 「全部字体」按“中文字体 → 其他 CJK（日文 / 韩文）→ 英文字体”排序。
- 中文字体显示本地化名称并按中文名称排序；日/韩字体与英文字体按字体名排序。
- 补充思源黑体/宋体（Noto、Source Han）、微软正黑、细明体等中文字体名称映射。
- 新增 2 项排序回归测试，单元测试总数 204，全部通过。

## 2026-11-09 13:30

### 新增：字体选择弹窗

- 样式 → 文本 → 字体改为自定义弹窗：顶部为“最近使用”，下方为“预设”和“全部字体”列表。
- 字体列表由 Rust 通过 `NSFontManager` 枚举系统已安装字体（非 macOS 使用内置常用字体兜底），常见中文字体显示中文名（如 黑体-简、宋体-简、冬青黑体简体中文）。
- 支持按中英文名搜索、回车选中、点击外部或 `Esc` 关闭；选中后立即写入主题样式并重绘画布。
- 最近使用字体保存在 `localStorage`（最多 8 个），跨窗口保留。
- 新增 `list_font_families` 命令、`DesktopApi.listFonts()` 桥接与 7 项字体辅助测试（单元测试总数 202）。
- 修复标题栏拖拽缺失权限：补充 `core:window:allow-start-dragging` 与 `core:window:allow-internal-toggle-maximize`。

## 2026-11-09 12:10

### 修复：所有骨架的默认填充改为纯色

- 默认主题（彩虹 / 手绘）的根主题与主分支不再硬编码 `fill-pattern: diagonal` 与 `pattern-color`。
- 彩虹配色模式不再在画布渲染和 SVG 导出时强制补上斜线，改为尊重主题与单主题设置。
- 格式面板的“填充”下拉框改为读取解析后的实际样式（`style.fillPattern`），修复“面板显示纯色、画布显示斜线”的不一致。
- 保留手动选择“斜线 / 交叉”的能力；用户显式设置的图案仍会渲染，面板也会正确显示。
- 新增 2 项回归测试：遍历全部骨架结构断言默认导出 SVG 无 hatch 图案；显式图案仍然生效。单元测试总数 195，全部通过。

## 2026-11-09 11:58

### 发布包验证

- `npm run package` 通过：`Xmind Studio.app`（12.97 MiB）与 `Xmind Studio_1.0.0_x64.dmg`（4.11 MiB）。
- 安装包 Info.plist 已注册 `.xmind` 文件关联（CFBundleDocumentTypes，角色 Editor）。
- 冷启动 `open -a "Xmind Studio" file.xmind`：单窗口打开文件，最近文件更新。
- 发布版 PDF 导出验证：`WkWebView.createPDF` 生成 1 页有效 PDF，文本包含工作表标题与主题文本；进程无崩溃。
- 发布版菜单动作（深色外观、快捷键对话框）验证通过；`Cmd+Q` 正常退出。
- 清理测试产物与应用数据，保留干净的首次启动状态。

## 2026-11-09 11:45

### 验证与修复

- 修复菜单/文件事件跨窗口串扰：渲染层改为 `WebviewWindow.listen`，事件只投递到目标窗口。
- 修复 PDF 导出：`NSPrintOperation` 即使“保存为 PDF”也要求打印会话，在未配置打印机的机器上返回 -30872；改用不依赖打印机的 `WKWebView.createPDF`。
- 修复 PDF 崩溃：macOS 的 `WKWebView` 没有公开 `scrollView` 选择器，改为使用 `WKPDFConfiguration` 默认的整页捕获；多画布内容完整进入 PDF。
- 打印保留系统打印面板；无打印机时可在面板内“存储为 PDF”。
- 修复启动竞态：新增 `app_ready` 握手与待打开文件/菜单动作队列，窗口在 React 挂载后才显示。
- 实机验证：新建/编辑→保存 `.xmind`（ZIP 结构完整）→最近文件更新→第二实例打开文件→PNG 导出→PDF 导出并读取文本→打印面板→多窗口→未保存关闭拦截。
- 修复多窗口事件串扰：菜单动作、文件打开与关闭请求改为按窗口 label 定向投递（`app.emit_to`），不再广播。
- 修复 macOS 冷启动双击/`open -a` 打开 `.xmind` 时出现两个窗口：系统 open 事件可能早于 `setup`，此时已创建主窗口，`setup` 不再重复创建。
- 清理调试代码；发布包构建通过。

## 2026-11-09 11:20

### 新增：Tauri 2 复刻 Xmind Studio

- 从 `../xmd/app`（Electron 版）完整迁移渲染层、文档模型、布局引擎、文件格式与导出逻辑。
- 新增 `src/renderer/src/desktop.ts`，以 Tauri 命令实现原 `window.desktop` preload API（对话框、读写、导出、设置、剪贴板、窗口生命周期）。
- 新增 Rust 后端：
  - `commands.rs`：文件对话框、原始字节读写、PNG/SVG/文本/PDF 导出、剪贴板图片、设置与最近文件。
  - `menu.rs`：macOS 原生菜单与全部快捷键，中英双语，支持运行时切换。
  - `window.rs`：多窗口、窗口位置/大小记忆、离屏校正、未保存关闭拦截。
  - `print.rs`：基于 WKWebView 的原生打印与 HTML→PDF（A4 分页、保留中文字体）。
  - `settings.rs` / `state.rs`：设置、最近文件、跨窗口状态。
- `tauri.conf.json`：文件关联（`.xmind`）、窗口配置、打包标识、图标。
- 文件关联、单实例转发、macOS `RunEvent::Opened` / `Reopen`、Dock 重新打开窗口。
- 保留 Vitest 测试：13 个测试文件、193 项测试全部通过；`tsc --noEmit` 通过。

---

# 附：Electron 原项目历史记录

> 合并自 `/Users/shang/GitHub/xmd/CHANGELOG.md`。保留原日期、时间与条目内容；以下条目按时间倒序排列（最新在前）。原 `## 日期` 标题降为 `###` 以避免标题冲突。

### 2026-11-09 10:46
- 需求：拖动节点与一级节点上下平行时，连接虚线应优先连到根节点。
- 实现：拖拽吸附候选携带布局深度（根 0、一级 1）；当最近目标为根或一级节点，且拖拽节点与某个一级节点同列（水平重叠 ≥ 较小宽度 50%）、位于其上方或下方（垂直重叠 ≤ 较小高度 35%）、距离在吸附阈值内时，目标改为根节点。拖到一级节点侧边时仍按最近目标挂为其子主题。
- 测试：新增 4 项（平行优先根、侧边不误判、超出阈值不跳转、无深度信息保持原行为）；全量 Vitest 13 个文件 193 项通过；TypeScript 与生产构建通过。
- 实机验证：二级节点拖到一级节点上方 → 虚线连根、提示“松开挂到「中心主题」下”，松手成为一级节点；拖到一级节点右侧 → 虚线连该一级节点，松手成为其子主题；已有一级节点拖到兄弟上方 → 提示“已在「中心主题」下”，结构不变。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版复验平行拖拽时虚线终点为根主题中心，侧边拖放仍挂为一级主题的子主题。

### 2026-11-09 10:33
- 需求：每次打开应用保持上次用户调整过的窗口大小。
- 实现：主进程新增窗口状态持久化（`userData/window-state.json`），记录位置、宽高与最大化状态；移动/缩放后 400ms 防抖写入，关闭窗口时立即写入；应用启动与“新建窗口”均按保存状态恢复，最大化一并恢复。
- 安全处理：恢复前校验窗口是否落在任一显示器可见区域，避免外接屏断开后窗口出现在屏幕外；宽高不低于 960×620。
- 验证：调整到 1200×760@(200,150) 后退出重开，位置与尺寸一致；新建窗口继承当前尺寸；最大化后重开仍最大化且保留正常尺寸；把状态改成屏幕外坐标 (5000,5000) 后启动会回落到屏幕内并回写状态；全量 Vitest 189 项、TypeScript 与生产构建通过。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版实测 1150×720@(260,180) 退出重开后一致，新建窗口继承同尺寸。

### 2026-11-09 10:22
- 主题库/模板库逐套验收：
  - 主题库 31 项（彩虹预设 + 30 套主题）：逐套应用后，中央主题填充/边框/文字色、画布背景、字体、形状（圆角/矩形/椭圆）、分支线型（曲线/折线/直线）与线条颜色全部与预设定义一致，差异 0。
  - 主题面板：下拉 31 项与卡片 31 张（中英文名、配色预览、当前勾选）正常；“显示全部”、卡片点击、Toast、撤销/重做均通过。
  - 多画布主题互不影响并按画布保存；保存后重开颜色/背景/字体还原；主题变更可撤销、重做。
  - 模板库 20 套：逐套新建，根主题、主题数（16–38）与画布配色全部符合定义，20/20 通过；分类筛选（全部 20、规划 4、工作 2、分析 2、生活 3、学习 2、创意 2、个人 4、通用 1）正确；20 张缩略图与描述正常。
  - 模板富内容渲染：项目计划 28 个主题、20 个主题带标记（共 21 枚）、8 个标签、1 个备注图标、风险区边界均正常显示；未保存时套用模板会弹出“替换前确认”。
- 补齐 2 个无入口的既有功能：
  1. “手绘模式”：画布面板新增开关（写入画布设置 `handDrawn`），Canvas 与 SVG/PNG/PDF 导出一致应用粗糙滤镜，随画布保存、重开后保持，可撤销/重做。
  2. “复制样式 / 粘贴样式”：右键菜单与命令面板新增入口，实测将主题 1 的填充样式复制到主题 2。
- 测试：新增 2 项（手绘导出、样式复制粘贴）；全量 Vitest 13 个文件 189 项通过；TypeScript（node + web）与生产构建通过。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版复验 31 套主题、项目计划模板（28 主题/20 个带标记主题/8 标签）、手绘开关（28 个粗糙滤镜）与右键“复制样式/粘贴样式”入口。

### 2026-11-09 09:54
- 原生菜单与文件操作审计：
  - 验证文件菜单全部入口：新建空白图/示例图/模板、打开、保存、另存为、导入（Markdown/OPML/Word）、导出（9 种）、打印、关闭窗口。
  - 验证编辑菜单：撤销/重做/剪切/复制/粘贴/删除/全选；插入菜单：主题/同级/自由主题/备注/标签/标记/关系线/边界/摘要/图片/附件；视图菜单：缩放/实际大小/适应画布/各面板/ZEN/演播/深色外观/大纲视图；帮助菜单：快捷键（28 条）/关于。
  - 文件闭环实测：保存→另存为→打开→最近文件→自动保存（30 秒）→多画布保存与重开→二次实例传入 .xmind 路径→菜单语言切换。
- 修复 8 个问题：
  1. 关闭第二个窗口后所有原生菜单动作静默失效（`Object has been destroyed`）：`closed` 事件里访问已销毁的 `webContents.id`，且菜单兜底取到已销毁窗口。改为创建时缓存 webContents id，并只向可用窗口发送动作。
  2. 关闭全部窗口后 macOS 菜单中的“新建空白图/示例图/模板/新建窗口”无反应：现在会自动创建窗口并补发待执行动作。
  3. “实际大小”实际执行了“适应画布”，缩放停在适应比例：新增 `xmind:actual-size` 事件，在画布内以当前视野中心恢复到 100%。
  4. “新建画布”克隆第一个画布内容：改为创建空白画布（中心主题），复制画布仍保留原行为。
  5. Markdown 导入忽略有序列表：`1.` / `1)` 与 `-` 一样解析为子主题。
  6. Word 导入纯段落文档得到空图：首个段落作为根主题、其余段落作为子主题，并剥离残留项目符号与嵌套列表文本。
  7. 未保存时新建/打开/套用模板/导入会静默丢弃修改：新增统一“替换前确认”（保存/不保存/取消）。最近文件按 realpath 去重，避免 `/tmp` 与 `/private/tmp` 重复项。
  8. 应用运行但无窗口时，从 Finder/命令行打开 `.xmind` 只入队不建窗口：现在会自动创建窗口并打开文件。
- 测试：新增 4 项（有序列表、Word 大纲 2 项、新建空白画布）；全量 Vitest 13 个文件 187 项通过；TypeScript（node + web）与生产构建通过。
- 实机验收：9 种导出产物均可打开（PNG 1278×900、SVG 639×450、PDF 单画布 1 页 / 三画布 3 页、DOCX/XLSX/PPTX 归档与文本正常、MD/TXT/OPML 内容正确）；打印对话框可打开并取消；多窗口状态互相独立；未保存关闭提示的取消/保存/不保存均正确。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版复验命令行传入 `.xmind` 直接打开、关闭第二个窗口后“新建空白图”仍生效。
- 已知限制（不阻塞）：文档级未保存确认覆盖新建/打开/模板/导入；关闭窗口仍走消息框；打印仅验证到系统打印面板。

### 2026-11-08 16:29
- 工具栏与对话框审计：
  - 验证全部工具栏按钮：主题、子主题、联系、概要、外框、标记、插入菜单（14 项）、ZEN、演播。
  - 验证标题栏更多菜单（搜索、导出、菜单语言、深浅色、快捷键、关于）、状态栏主题数/字数/缩放/适应画布。
  - 验证对话框：标签、超链接、图片、附件、快捷键（28 条）、关于、模板（20 套/9 分类）、导出（9 种格式）。
  - 修复“导出”对话框无入口：命令面板新增“导出…”，标题栏更多菜单新增“导出…”；实测 9 个导出选项。
  - 语言切换实际只影响原生菜单：文案改为“切换菜单语言为 English / Switch menu language to 简体中文”，提示同步调整。
- 测试：全量 Vitest 13 个文件 183 项通过；TypeScript（node + web）与生产构建通过。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版复验更多菜单“导出…”与 9 种导出选项、菜单语言文案正常。

### 2026-11-08 15:23
- 鱼骨图子主题排布对齐 Xmind：一级分支的子主题改为放在分支远离头部的一侧、沿斜骨区域堆叠，并与分支水平直线连接；左右头自动镜像；子分支不再触发 13px 分叉主干。
- 实现：`layout/fishbone.ts` 新增 `placeFishboneChildren`（主分支节点手动放置 + 子主题水平排布）；`edgeAnchors` 的鱼骨深层分支改为水平锚点并去除方向字段。
- 测试：新增水平锚点、左右头子主题位置与连线共 3 项；全量 Vitest 13 个文件 183 项通过；TypeScript 与生产构建通过。
- 实机验证：鱼骨左/右头子主题均在分支侧向堆叠，连线水平，主轴/斜骨保持不变。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版复验鱼骨子主题侧向排布与水平连线正常。

### 2026-11-08 14:35
- 浮动面板审计与修复（搜索 / 备注 / 标记 / 导航 / 大纲）：
  - 修复 Cmd+F 打开搜索后输入框未聚焦：搜索面板挂载时主动聚焦。
  - 修复搜索与“所有备注”结果点击后主题可能不在视野内：新增 `xmind:center-topic` 事件，Canvas 将目标主题移到画布中心。
  - 浮动大纲面板此前没有任何入口（死代码）：命令面板新增“打开大纲面板”，视图菜单新增“大纲面板”。
  - 导航缩略图补画鱼骨主轴、括号大括号等布局装饰。
- 验证：搜索聚焦/结果居中、备注保存与重开、79 个标记切换、标签提交、导航点击定位与结构刷新、全屏大纲编辑/Enter 新增/Tab 缩进/Shift+Tab 反缩进/字数统计/Esc 返回均通过；全量 Vitest 13 个文件 180 项通过；TypeScript 与生产构建通过。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版验证搜索框聚焦、命令面板“打开大纲面板”与视图菜单入口均正常。

### 2026-11-08 14:16
- 完成第二阶段结构专用线型与锚点：
  - 鱼骨图：新增水平主轴装饰 + 一级分支斜骨关节锚点；主轴从头部延伸到最远关节外 24px，一级分支强制直线并从主轴关节出发。
  - 括号图：每个有子主题的节点绘制共享垂直大括号（尖端朝左）+ 父主题引线；括号图不再输出逐条分支边；浮动子树同样生成括号。
  - 矩阵/树形表格/电子表格：分支线强制正交（elbow）；树形表格父右→子左；电子表格根右→子左、深层下→上；矩阵沿用最近边锚点。
  - level3 线型：布局主题部件选择 depth ≥ 3 使用 `theme.level3`，导入主题的 line-class/color/width 生效。
- 新增 `LayoutDecoration` 模型与 `layout/decorations.ts`；Canvas 与 SVG 导出渲染主轴/大括号；新增 `braceVerticalPath`。
- 测试：新增 `decorations.test.ts` 3 项、锚点/kind 4 项、level3 1 项、括号/鱼骨导出 1 项、竖向括号路径 1 项；全量 Vitest 13 个文件 180 项通过；TypeScript 与生产构建通过。
- 实机验证：鱼骨（左/右头）主轴+斜骨、括号图分组大括号与引线（含浮动子树）、树形表格/电子表格正交连线均正常；矩阵仍为近似布局但连线正交。
- 设计说明/计划：`docs/superpowers/specs/2026-11-08-structure-anchors-design.md`、`docs/superpowers/plans/2026-11-08-structure-anchors.md`。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版复验括号图 12 个装饰/0 条普通边、鱼骨图 1 条主轴/11 条边，控制台无报错。

### 2026-11-08 13:32
- 实现画布页 6 个布局开关（此前仅保存状态、无任何效果）：
  - 自动平衡布局：关闭后思维导图主主题全部排在右侧；开启时左右交替。
  - 紧凑型布局：层级/同级/时间轴/鱼骨/矩阵/表格间距缩小到 65%。
  - 同级主题对齐：关闭后逻辑图/树形图/括号图按各父主题宽度独立缩进，不再共用同层列锚点。
  - 分支自由布局：开启后拖动不再吸附，任何有效拖动都会把分支转为自由主题。
  - 灵活自由主题：关闭后忽略自由主题保存位置，自动在根主题右侧排列。
  - 主题层叠：开启后拖动与双击新建自由主题不再做碰撞避让，允许重叠。
- 实现：新增 `layout/settings.ts`（设置解析与间距缩放），`LayoutContext` 携带 settings/spacing；map/logic/primitives/org/timeline/fishbone/matrix/table/floating 全部改用可缩放间距；`drag.ts` 增加 `avoidCollisions`；Canvas 接入 freeBranch/topicOverlap。
- 测试：`layout.test.ts` 新增 4 项开关测试，`drag.test.ts` 新增 2 项；全量 Vitest 12 个文件 170 项通过；TypeScript（node + web）与生产构建通过。
- 实机验收：自动平衡（左右→全右）、紧凑（间距 44/25 → 23/17）、同级对齐（同列 → 独立缩进）、灵活自由主题（位置切换）、自由布局（小幅拖动 4→4 边 vs 4→3 边）、主题层叠（拖到 B 上可重叠/被推开）均通过。
- 设计说明：`docs/superpowers/specs/2026-11-08-layout-switches-design.md`。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版聚焦复验自由布局（默认关闭 4→4 边，开启后 4→3 边）及自动平衡/紧凑/对齐/自由主题均正常。

### 2026-11-08 13:24
- 侧边栏设置项全面审计（样式 / 演播 / 画布），修复 6 类无效或错误设置：
  - 填充“交叉”与“斜线”视觉相同：Canvas 与 SVG 导出的 hatch 模式按 fill-pattern 区分，交叉绘制第二条线。
  - 全局字体“默认”无效：现在恢复当前主题预设的默认字体。
  - “中日韩字体”下拉从未接线下发：改为受控并写入 `cjkFont`，按黑体/宋体/楷体应用对应字体栈；默认恢复主题字体。
  - 演播“主题幻灯片 / 列表幻灯片”无效果：PitchMode 按设置过滤封面页与列表页（隐藏主题后 3 页，隐藏列表后 1 页）。
  - 彩虹分支不改变连线：布局层统一计算彩虹线色，Canvas 与导出连线颜色与分支主题一致。
  - 选中根主题时“分支”颜色/粗细无效：布局层优先使用父主题显式 `line-color`/`line-width`，子主题显式样式仍优先。
- 审计结论：样式页其余控件（形状/填充/宽度/边框/线型/字体/字号/字重/颜色/BIUS/对齐/结构/方向）正常；画布页配色方案、背景、全局字体、分支粗细、彩虹开关与调色板、骨架弹窗正常；演播页更换风格、长宽比、演说方式、布局、开始/翻页/退出正常。
- 未实现（待决定）：画布页 6 个布局开关（自动平衡布局、紧凑型布局、同级主题对齐、分支自由布局、灵活自由主题、主题层叠）目前仅保存状态，布局引擎未消费，切换无任何效果。
- 测试：新增 3 条 `edges.test.ts` 与 2 条 `export.test.ts`；全量 Vitest 12 个文件 164 项通过；TypeScript（node + web）与生产构建通过。

### 2026-11-08 13:07
- 修复：选中子主题后切换“骨架”，画布内容不实时改变。
- 原因：`layoutSheet` 只读取根主题的 `structureClass`，而画布面板（骨架弹窗）与样式面板（结构/方向下拉）把新结构写到当前选中主题；选中子主题时标签变了，布局仍按根主题旧结构渲染。
- 修复：`setStructure` 改为 sheet 级操作 `setStructure(key)`，始终写入根主题；两个面板的结构显示与写入都统一使用根主题，避免“显示已切换、画布未变”。
- 回归测试：`mapStore.test.ts` 新增用例，验证选中子主题后 `setStructure('orgDown')` 写入根主题且 `layoutSheet(sheet).structure === 'orgDown'`；全量 Vitest 12 个文件 159 项通过；TypeScript（node + web）与生产构建通过。
- 实机验证：选中子主题后通过骨架弹窗切换“组织架构图（下）”→“逻辑图（左）”，以及样式面板切换到“思维导图”，画布均立即重排，方向/连线正确。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版复验选中子主题切换骨架，画布立即重排。

### 2026-11-08 09:02
- 完成第一阶段扩展分支线型（计划：`docs/superpowers/plans/2026-11-07-extra-branch-line-types.md`）：
  - `EdgeKind` 扩展为 curve/straight/elbow/roundedElbow/bight/fold/roundedFold/brace/tapered；`LayoutEdge` 移除 `split`、新增 `orientation`。
  - `edgeKindFromLineClass` 与 `lineKindOf` 支持全部线型，圆角变体优先匹配；一级分支不再强制 curve，主题/子主题的 bight/fold/roundedElbow 直接生效。旧测试中两条相反断言按新规格更新。
  - `layout/edges.ts` 按方向生成 13px 分叉与主干（curve/straight/elbow/roundedElbow/bight/fold/roundedFold）；brace/tapered 不参与分叉；回退结构 `split = start`；`EdgeAnchors` 增加 orientation。
  - 新增 `model/edge-path.ts` 的 `edgeToPath`，统一生成 9 种 SVG 路径（数值保留 2 位小数）；Canvas 与 SVG 导出共用，删除重复的 `edgePath`/`layoutEdgePath`/`branchCurvePoints`/`edgePoints`。
  - 格式面板“线条”下拉（边框与分支两处）统一为 9 个选项。
- 测试：新增 `edge-path.test.ts` 7 项、`layout/style.test.ts` 2 项；更新 `edges.test.ts` 27 项、`model/style.test.ts` 9 项、`export.test.ts` 12 项；全量 Vitest 12 个文件 158 项通过；TypeScript（node + web）与生产构建通过。
- 实机验收：9 种线型逐一切换并截图，与公式核对（分叉主干、圆角、锥形实心填充均正确）；logicLeft 与 orgDown 连线方向正确；构造 mainTopic `line-class=bight` 的 `.xmind`，一级分支显示 bight；组拖动、撤销、主题 bight 导出路径回归通过。
- 打包：首次自动签名因 Apple 时间戳服务不可用失败，改用 `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package:mac` 成功；`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，checksum VALID）与 `.zip`（130MB，完整性通过）；打包版 roundedElbow/bight/brace 冒烟与开发版一致。
- 第二阶段（鱼骨图主轴/斜骨、括号图分组大括号、矩阵/树形表格/电子表格专用锚点、导入 level3 线型解析）尚未开始。

### 2026-11-07 16:23
- 需求：实现 Xmind 的 bight/fold/brace 等额外线型，并将鱼骨图、括号图、矩阵、表格的锚点与线型一同修改。
- 已确认分两阶段：第一阶段完整实现线型（roundedElbow/bight/fold/roundedFold/brace，curve 改为 Xmind 二次贝塞尔，格式面板/导入/导出/测试）；第二阶段再做鱼骨图主轴与斜骨、括号图分组大括号、矩阵/树形表格/电子表格专用锚点。
- 参考 Xmind 源码确认：curve 为二次贝塞尔；fold 折点为 2/3；roundedFold 折点为 1/2、圆角半径 `min(|dx|,|dy|)/4`；roundedElbow 圆角半径 8；brace 由两段 Q + 中心竖线组成；主题实际使用 roundedElbow 30、curve 27、straight 20、bight 14、fold 11、elbow 5、roundedFold 2。
- 已确认 brace 第一阶段按单边括号绘制，分组共享大括号留到第二阶段。
- 设计规格：`docs/superpowers/specs/2026-11-07-extra-branch-line-types-design.md`。

### 2026-11-07 14:38
- 最终审查修复：Canvas 锥形（tapered）分支线被 `.edge-path { fill: none }` 覆盖，只显示 0.5px 轮廓；改为 tapered 边内联 `fill`，画布与 SVG 导出一致。
- 实机验证：格式面板切换到“锥形”后，路径 `computed fill` 为线条色，显示实心锥形；TypeScript 与 144 项测试通过。
- 打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（136MB，checksum VALID）与 `.zip`（132MB，完整性通过）；打包版应用实测 3 条分支边、其中 1 条带 13px 短主干，线宽 2.67px，连线方向与开发版一致。

### 2026-11-07 14:15
- 按 Xmind 实现完成分支连线改造：
  - 方向化锚点：逻辑图/树形图按结构左右；思维导图按子节点左右侧；组织架构图上下；时间轴一级沿轴、深层垂直于轴；浮动子树强制水平；其余结构统一走 `geometricAnchors` 几何回退。
  - 父节点外 13px 作为同方向共享分叉点；只有该方向最后一条曲线绘制短主干，其余曲线从分叉点直接散开。
  - 曲线控制点改为 Xmind 公式（`dx/3`、`|dx|/5`、`|dx|/6`），`LayoutEdge.split` 记录主干顶点。
  - 最终线型在布局层解析并固化到 `edge.kind`；Canvas 与 SVG 导出直接使用，删除重复的 `resolveBranchKind` 二次解析。
  - Canvas/SVG 统一 curve（含 split）、elbow（完整折点）、straight、tapered 路径；导出虚线间隔 6 5、linejoin round 与画布一致。
  - 默认主分支线宽 3pt → 2pt（`DEFAULT_THEME` 与主题工厂），实测约 2.67px。
- 测试：`edges.test.ts` 23 项、`export.test.ts` 14 项；全量 Vitest 10 个文件、144 项通过；TypeScript（node + web）与生产构建通过。
- 实机验收：逻辑图右/左、组织架构图下、思维导图双侧的连线方向、扇出与线宽均正确；13px 分叉与短主干生效；无横向长走线、根部重叠或 13px 断线。
- 遗留说明（不阻塞）：布局层主题部件选择尚未读取 `theme.level3`（导入含 level3 线型的 Xmind 主题时可能与旧渲染不同）；Navigator 缩略图仍以首点绘制，非主干边有 13px 视觉偏移。

### 2026-11-07 12:58
- 需求：节点连线观感别扭，参考 `/Applications/Xmind.app` 的实现方式重做连线样式与绘制。
- 已定位：当前按“最近边”选锚点，根主题到分支 1/3 会从上/下边出发；曲线控制点在水平中点，形成先水平后急弯的平台；三条线在根节点重叠；主分支线宽 3pt 偏粗。
- 参考 Xmind 源码：锚点按结构方向固定；父节点外 13px 为共享分叉点；同组只有最后一条分支绘制短主干；曲线控制点按 `dx/3`、`|dx|/5`、`|dx|/6` 计算；参考线宽约 2pt。
- 已确认方案 A：方向化锚点 + 13px 共享分叉/短主干 + Xmind 控制点 + 默认线宽 2pt，并同步 SVG/PNG/PDF 导出。
- 设计规格：`docs/superpowers/specs/2026-11-07-xmind-branch-lines-design.md`。

### 2026-11-07 11:19
- 完成多选整组拖动与即时断线全部实现、审查与实机验收。
- 实机验收通过：整组挂接（2 个主题，按画布 y/x 顺序）、整组自由（相对位置保持）、浮动+挂接混合组空放后整组保持选中、即时断线（跨 112px 连线立即消失、拖回立即恢复）、一级主题拖离为自由主题、全选后点击中心主题收敛为单选、撤销/重做一步恢复整组操作。
- 吸附边界验收通过：组包围盒内的兄弟节点不再成为零吸附目标；盒子外 24px 的邻近目标仍正常吸附整组；目标为当前父主题时提示“已在「…」下”且不产生结构变更。
- 最终验证：TypeScript（node + web）通过；Vitest 9 个测试文件、115 项测试通过；生产构建通过。
- 打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（136MB，checksum VALID）与 `app/dist/Xmind Studio-1.0.0-x64.zip`（132MB，完整性通过）；打包后的独立应用完成整组拖动、断线与撤销冒烟验证。
- 已知限制（不阻塞）：Canvas 指针事件生命周期尚无组件级自动化测试；拖拽中键盘快捷键、嵌套 detached 导入文件语义、每帧全量 Canvas 重渲染等列为后续优化项。

### 2026-11-07 09:45
- 最终审查修复（组拖动吸附与落点决策）：
  - `model/drag.ts` 吸附规则改为：候选不得被组包围盒完全包含，且须与至少一个成员边缘距离不超过 `snapDistance`，取最近成员距离；不再调用 `findSnapTarget`（保留 `SnapCandidate` 类型）；更新 JSDoc。
  - 新增 `DragDropPlan`/`planDragDrop` 纯函数，统一落点决策（有目标按 y、x 排序返回 `targetIds`；空放拆分 floating 位置更新与断线条目）；Canvas `onPointerUp` 改用该计划。
  - `drag.test.ts`：替换旧包围盒吸附用例，新增“包围盒内候选不吸附”两条、`planDragDrop` 两条，并调整“同帧吸附+断线”用例避免候选与成员完全重叠。
  - `mapStore.ts`：`reset`/`loadWorkbook` 清空 `transactionSnapshot`；`moveTopics` 移动后清除目标主题遗留的 `position`。
  - `mapStore.test.ts`：单步撤销增加历史长度断言；浮动重挂测试增加 `position` 已清除断言。
- 验证：`drag.test.ts` + `mapStore.test.ts` 24 项测试通过；全量 Vitest 9 个文件 115 项测试通过；`npm run typecheck`（node + web）通过；`npm run build` 通过。

### 2026-11-07 09:16
- 质量审查修复（组拖动性能与交互边界）：
  - `model/tree.ts` 新增 `excludedTopicIds` 预计算成员及其全部后代集合，Canvas 在按下时构建并缓存到 `Interaction.excludedIds`，拖动帧内不再逐个节点遍历树；新增 2 项单元测试。
  - `DragPreview` 增加 `memberIds`，`dragging-source` 改为集合判定；ghost 取标题改用 `nodeMap`，避免每帧 `findTopic`。
  - 根主题处于多选区时点击根主题会收敛为仅选中根主题。
  - 无吸附目标落点提交后恢复整组选区；新增 `cancelDrag` 并在 `pointercancel`/`lostpointercapture` 时取消拖动，组件卸载时结束未完成事务。
  - 删除 `buildDragSources` 未使用的 `anchorId` 参数、`Interaction.dropId` 死字段及 `.detach-preview-line` CSS。
  - 吸附目标即成员当前父主题时提示“已在「…」下”，并按实际可移动成员数显示数量。
- 验证：`tree.test.ts` 6 项、全量 Vitest 9 个文件 112 项测试通过；`npm run typecheck`（node + web）通过；`npm run build` 通过。

### 2026-11-07 09:04
- Task 5 Canvas 多选拖动：`Canvas.tsx` 新增 `buildDragSources`，按下时按最上层选中集合构建组拖动源；点击未选中节点仅拖该节点，点击已选节点拖整组，未移动松手则收缩为单选；根主题不拖动；Shift/Cmd/Ctrl 追加选择时若取消选中则不进入拖动。
- 拖动预览改为组级 `DragPreview`（anchor、members、bbox、targetId、willDetachIds、hint）：整组 ghost、吸附虚线按组包围盒绘制，提示文案区分“挂到目标下（N 个主题）/ 断开 N 个连接 / 移动 N 个主题”。
- Task 6 落点提交：有吸附目标时整组 `moveTopics`（按 y、x 排序）；无目标时浮动成员 `updateTopicPositions`、断线成员 `detachTopics`；整次拖动由 `beginTransaction`/`endTransaction` 合并为一步撤销。
- 即时断线：拖动中 `willDetachIds` 命中的入边直接隐藏，移除旧的半透明虚线断线提示；节点 `dragging-source` 改为整组变暗。
- 移除旧导入 `findSnapTarget`、`rectDistance`；保留 `resolveRectCollision` 供双击新建自由主题使用。
- 验证：`npm run typecheck:web` 通过；`npm test` 9 个测试文件、110 项测试全部通过。

### 2026-11-07 08:58
- 质量审查修复：`moveTopics` 改为按目标 `attached` 列表判断是否已挂接，浮动主题（位于父节点 `detached`）即使 `findParent` 命中目标也能重新挂接；目标位于移动选中集合内部时整体拒绝移动，避免部分移动。
- `updateTopicPositions` 仅更新真实浮动主题，并只把这些主题保留在选中集合；导出 `TopicPositionEntry` 供 Task 5 复用，三个批量签名补充事务契约注释；导入 `isDescendant`。
- `mapStore.test.ts` 由 5 项增至 8 项：新增浮动主题重新挂接、目标在选中集合内整体拒绝、只保留现存浮动主题 3 项测试；重写“跳过已挂接主题”用例以真正区分跳过逻辑。
- 验证：`mapStore.test.ts` 8 项通过；全量 Vitest 9 个文件、110 项测试通过；TypeScript 渲染进程检查通过。

### 2026-11-07 08:51
- Task 4 Store 批量操作：`mapStore.ts` 新增 `moveTopics`、`detachTopics`、`updateTopicPositions` 三个批量方法，均通过 `selectionRoots` 只处理最上层选中主题，默认不写入历史（由拖拽的 `beginTransaction`/`endTransaction` 合并为一个撤销步骤）；导入 `detachedOf`、`selectionRoots`。
- 新建 `store/mapStore.test.ts` 5 项测试；因默认工作簿自带 3 个分支主题，测试 `setup()` 先 `reset()` 为空工作簿，断言与计划一致。
- 验证：5 项新测试通过；全量 Vitest 9 个文件、107 项测试通过；`tsc --noEmit -p tsconfig.web.json` 通过。

### 2026-11-07 08:49
- Task 3 收尾（行为不变）：修正 `drag.ts` JSDoc，准确描述障碍物过滤规则（仅考虑与成员在 `collisionPadding` 内接触的障碍物；被包围盒完全包含者仅在成员真实重叠时保留）。
- `drag.test.ts` 增加 1px 位移防方向翻转断言，以及“包围盒内仅 padding 级接触不位移”用例；共 13 项测试通过，全量 Vitest 8 个文件、102 项测试通过，TypeScript 渲染进程检查通过。

### 2026-11-07 08:46
- 修复组拖动严重缺陷：包围盒包住中心主题等非成员节点时，刚体平移无法清除被完全包含的障碍物，会触发碰撞兜底导致整组瞬移。现仅对成员实际接触且未被包围盒完全包含的障碍物做避让（已被成员真实重叠的障碍物仍参与避让，以保留原有碰撞行为）。
- 补充 5 条回归测试：包围盒包住非成员不位移、成员接触障碍仍避让、混合组仅附着成员断线、同帧吸附与断线、按整组包围盒吸附；并修正 floating 用例传入真实父矩形以覆盖保护分支。
- 验证：`drag.test.ts` 12 项测试通过；全量 Vitest 8 个文件、101 项测试通过；TypeScript 渲染进程检查通过。

### 2026-11-07 08:35
- Task 3 组拖动状态计算：新增纯函数模块 `model/drag.ts`（`computeDragState`），整组平移后对包围盒做碰撞避让并将修正量应用到全部成员，同时计算吸附目标与断线成员集合。
- TDD 验证：先写 `drag.test.ts` 确认模块缺失导入失败，再实现；7 项测试全部通过，全量 Vitest 8 个文件、96 项测试通过，TypeScript 渲染进程检查通过。

### 2026-11-07 08:32
- Task 2 组几何纯函数：`model/geometry.ts` 新增 `unionRect`（空数组返回 undefined）与 `translateRect`（平移不改变尺寸）。
- TDD 验证：先写失败测试确认未导出，再实现；`geometry.test.ts` 14 项测试全部通过，TypeScript 渲染进程检查通过。

### 2026-11-07 08:19
- 需求：补全拖拽交互——多选整组拖动（整组重挂或整组转为自由主题）与拖动中超过阈值即时断线（拖回恢复、松手提交）。
- 已确认规则：组成员只取最上层选中节点；一级主题允许拖离为自由主题，单节点规则同步放开；一次拖动合并为一个撤销步骤。
- 设计规格：`docs/superpowers/specs/2026-11-07-multi-drag-detach-design.md`。

### 2026-11-06 20:10
- 调研 GitHub 高 star 交互实现：Excalidraw（箭头绑定约 15px、超距断开）、tldraw（约 8px 命中 margin 的箭头 binding）、React Flow（Proximity Connect 150px 预览、松手建边；d3-force 防重叠）、SimpleMindMap/mind-elixir（拖拽重挂、线型）。
- 新增节点邻近父子吸附：
  - 拖动时显示半透明 ghost，实时检测最近目标；72px 内高亮并显示直线虚线预览与“松开挂到…下”提示。
  - 松开后把节点挂为目标主题的子主题；拖离当前父主题超过 112px 时显示“松开断开连接”，松开后变回自由主题。
  - Ghost 与落点做矩形碰撞避让，保留 12px 间距；新建自由主题也先避让。
  - 一次拖动（吸附/断开/避让）合并为一个撤销步骤；已验证撤销/重做。
- 混合线型：主分支保持曲线；深层分支按主题/单主题线型显示曲线、直线或折线；吸附预览固定直线虚线；样式面板切换线型已生效；SVG/PNG/PDF 导出同步。
- 新增 `model/geometry.ts`（矩形距离、吸附目标、碰撞分离）与 `model/style.ts` 线型解析测试；Vitest 6 个文件、82 项测试全部通过。
- 设计规格：`docs/superpowers/specs/2026-11-06-proximity-snapping-design.md`。
- 打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB，校验和有效）与 `.zip`（130MB，完整性通过）。

### 2026-11-06 15:10
- 根据新增的结构弹窗与大纲截图完成第二组 UI 调整：
  - “骨架”卡片改为打开独立的结构选择弹窗：按思维导图/逻辑图/括号图/组织结构图/树形图/时间轴/鱼骨图/树形表格/矩阵图/电子表格分组，3 列缩略图、蓝色选中框、可滚动、点击空白/Esc 关闭。
  - 状态栏“大纲”改为进入全屏文档式大纲视图：顶部缩进/减少缩进/插入/标记工具栏，正文为可编辑的标题 + 项目符号列表，支持回车新增同级、Tab 缩进、Shift+Tab 减少缩进、空行退格删除、Esc 返回；底部显示字数、100%、思维导图返回按钮。
  - 大纲字数统计排除空格，与参考图一致（19 字）。
  - 大纲、结构弹窗尺寸/间距按截图收紧；结构切换重复选择同一结构不再标记未保存。
- 大纲模式头部与标题栏合并为 68px 单行：左侧文档标题，中间缩进/减少缩进/插入，右侧标记与更多；与参考截图一致。
- 大纲同时收录浮动（detached）主题，避免自由主题丢失。
- 验证：TypeScript 通过、Vitest 64 项通过、生产构建通过；实机截图与参考图对照完成。
- 最终打包并校验：`Xmind Studio-1.0.0-x64.dmg`（134MB，校验和有效）与 `.zip`（130MB，完整性通过）；打包后的应用验证结构弹窗 16 个结构、大纲 3 行、字数 19、返回思维导图均正常。

### 2026-11-06 13:20
- 根据 `/Users/shang/Desktop/Xmind screenshots` 的 4 张 Xmind 截图重做 UI：
  - 蓝色强调色、极简标题栏与“更多”菜单。
  - 顶部居中“图标 + 文字”工具栏：主题、子主题、联系、概要、外框、标记、插入，右侧 ZEN/演播；其余功能收进“插入”下拉菜单。
  - 右侧检查器改为“样式 / 演播 / 画布”三个标签；样式面板按形状、边框、文本、结构、分支分组；画布面板加入骨架下拉、配色方案、主题六宫格、背景/字体/线宽、彩虹分支、布局选项；新增演播设置面板。
  - 纯白画布、默认手绘彩虹主题（深蓝中心主题 + 红/橙/黄分支、斜线填充、手绘边缘）。
  - 大纲/搜索/备注/标记/导航改为浮动面板，单画布时隐藏画布标签栏。
  - 状态栏改为“主题: 1/4 · 100% · 大纲”样式。
- 默认示例改为截图中的“中心主题 + 分支主题 1/2/3”逻辑图，适应画布上限 100%。
- SVG/PNG/PDF 导出同步彩虹分支、斜线填充与手绘滤镜。
- 验证：TypeScript 检查通过、Vitest 64 项测试通过、生产构建通过；实机截图与参考截图逐项对照完成。
- 重新打包并校验：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB）与 `.zip`（130MB）已包含新 UI，DMG 校验和有效、ZIP 完整性通过；打包后的独立应用启动验证通过。

### 2026-11-06 11:25
- 生成界面截图并加入 `app/docs/screenshots/`（启动示例图、真实模板、Pitch 演示），README 增加截图与打包产物说明。
- 最终校验：TypeScript 检查通过、Vitest 64 项测试通过、生产构建通过；DMG 校验和有效、ZIP 完整性校验通过。

### 2026-11-06 11:22
- 打包完成：`app/dist/Xmind Studio-1.0.0-x64.dmg`（134MB）与 `Xmind Studio-1.0.0-x64.zip`（78MB），同时产出 `dist/mac/Xmind Studio.app`。
- 已验证打包后的独立应用可正常启动并显示启动示例图、主题面板与全部界面。
- 应用源码约 1.4 万行；`npm run dev` 开发启动、`npm test` 64 项测试、`npm run build`、`npm run package:mac` 均通过。

### 2026-11-06 11:12
- 实机运行 Electron 并完成自动化界面验收：主题应用、格式面板结构切换、模板库、键盘新建与编辑、Pitch 演示、ZEN、命令面板、真实 `.xmind` 打开→保存→重开、关闭前未保存提示均通过。
- 修复旧版 `content.json` 的 numeric-wrapper 画布被误选问题，恢复画布标题与关系线；新增回归测试。
- 修复长标题在固定宽度下被字符硬拆的问题，改为按单词换行；根据换行行数计算节点高度。
- 修复边界旧式数字范围 `(0,1)` 的解析；边界改为半透明并置于连线之后绘制。
- 修复“格式”等工具栏面板无法切换活动面板的问题，增加显式 `activePanel` 状态。
- 最终验证：TypeScript 检查通过；Vitest 4 个文件、64 项测试全部通过；`npm run build` 成功。
- 正在执行 `electron-builder` macOS 打包（跳过代码签名）。

### 2026-11-06 10:40
- 完成 `app/` 工程骨架（Electron 45 + React 19 + TypeScript 5.9 + Vite 8 + electron-vite 6）。
- 完成核心数据模型、Zustand 文档状态、撤销/重做、主题样式解析。
- 并行完成：16 种结构布局引擎、`.xmind`/XML/Markdown/OPML 读写、PNG/SVG/PDF/Word/Excel/PPT 导出、30 套主题、20 个模板、79 个标记。
- 完成画布渲染与交互、工具栏、标题栏、画布标签、状态栏、主题/格式/大纲/搜索/备注/标记/导航面板、模板与导出对话框、命令面板、Pitch 演示、ZEN 模式、中英双语与深浅色外观。
- 验证：TypeScript 主进程与渲染进程类型检查通过；Vitest 4 个测试文件、63 项测试全部通过；`npm run build` 成功产出 `out/`。

### 2026-11-06 10:05
- 创建 Craft Anything 重建项目（`craft.json`，应用目录 `app/`），请求覆盖完整思维导图功能并去除登录/付费/云依赖。
- 后台无人值守构建被安全策略拦截；经用户选择，改为当前会话多 agent 实现，Craft Anything 继续作为研究取证工具。

### 2026-11-06 10:03
- 恢复“重建 Xmind”任务，整理已有研究结论：Electron 架构、`.xmind` ZIP 文件格式、30 套内置模板、30 套主题、1700 条界面文案、全部结构类型。
- 将 brief、计划、4 条发现与交接说明写入调查账本 `craft/xmind-rebuild.cany`。
- 确定重建技术栈：Electron + React + TypeScript + Vite，离线运行，不包含登录、订阅与付费功能。

### 2026-11-06 09:57
- 建立调查项目 `craft/xmind-rebuild.cany`，打开 `/Applications/Xmind.app`（Xmind 22.11.3656），完成 app.asar 映射与归档盘点。
