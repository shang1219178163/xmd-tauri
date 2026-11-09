/**
 * Keyboard shortcut reference shown in the help panel. `keys` uses the
 * platform-neutral "Ctrl/Cmd" notation; the UI replaces it with the native
 * modifier label when needed.
 */
export interface ShortcutDef {
  keys: string
  zh: string
  en: string
  group: string
}

export const SHORTCUTS: ShortcutDef[] = [
  /* Editing ---------------------------------------------------------- */
  {
    keys: 'Tab',
    zh: '插入子主题',
    en: 'Insert child topic',
    group: 'editing'
  },
  {
    keys: 'Enter',
    zh: '插入同级主题',
    en: 'Insert sibling topic',
    group: 'editing'
  },
  {
    keys: 'Shift + Enter',
    zh: '在主题内换行',
    en: 'Insert a line break in a topic',
    group: 'editing'
  },
  {
    keys: 'Delete',
    zh: '删除选中的主题',
    en: 'Delete selected topics',
    group: 'editing'
  },
  {
    keys: 'F2',
    zh: '重命名主题',
    en: 'Rename topic',
    group: 'editing'
  },
  {
    keys: 'Ctrl/Cmd + Z',
    zh: '撤销',
    en: 'Undo',
    group: 'editing'
  },
  {
    keys: 'Ctrl/Cmd + Y',
    zh: '重做',
    en: 'Redo',
    group: 'editing'
  },
  {
    keys: 'Ctrl/Cmd + C',
    zh: '复制',
    en: 'Copy',
    group: 'editing'
  },
  {
    keys: 'Ctrl/Cmd + V',
    zh: '粘贴',
    en: 'Paste',
    group: 'editing'
  },
  {
    keys: 'Ctrl/Cmd + X',
    zh: '剪切',
    en: 'Cut',
    group: 'editing'
  },
  {
    keys: 'Ctrl/Cmd + A',
    zh: '全选',
    en: 'Select all',
    group: 'editing'
  },
  {
    keys: 'Ctrl/Cmd + F',
    zh: '查找主题',
    en: 'Find topics',
    group: 'editing'
  },

  /* Navigation ------------------------------------------------------- */
  {
    keys: '↑ / ↓ / ← / →',
    zh: '在主题之间移动',
    en: 'Move between topics',
    group: 'navigation'
  },
  {
    keys: 'Shift + ↑ / ↓ / ← / →',
    zh: '扩展选择范围',
    en: 'Extend the current selection',
    group: 'navigation'
  },
  {
    keys: 'Home',
    zh: '跳转到中心主题',
    en: 'Jump to the central topic',
    group: 'navigation'
  },

  /* View ------------------------------------------------------------- */
  {
    keys: 'Ctrl/Cmd + +',
    zh: '放大画布',
    en: 'Zoom in',
    group: 'view'
  },
  {
    keys: 'Ctrl/Cmd + -',
    zh: '缩小画布',
    en: 'Zoom out',
    group: 'view'
  },
  {
    keys: 'Ctrl/Cmd + 0',
    zh: '恢复实际大小',
    en: 'Reset zoom to 100%',
    group: 'view'
  },
  {
    keys: 'Shift + F',
    zh: '打开格式面板',
    en: 'Open the format panel',
    group: 'view'
  },
  {
    keys: 'Shift + T',
    zh: '打开主题面板',
    en: 'Open the theme panel',
    group: 'view'
  },
  {
    keys: 'Shift + O',
    zh: '切换大纲视图',
    en: 'Toggle outline view',
    group: 'view'
  },
  {
    keys: 'Shift + P',
    zh: '进入演示模式',
    en: 'Start pitch mode',
    group: 'view'
  },
  {
    keys: 'F11',
    zh: 'ZEN 专注模式',
    en: 'ZEN focus mode',
    group: 'view'
  },

  /* File ------------------------------------------------------------- */
  {
    keys: 'Ctrl/Cmd + N',
    zh: '新建导图',
    en: 'New mind map',
    group: 'file'
  },
  {
    keys: 'Ctrl/Cmd + O',
    zh: '打开文件',
    en: 'Open a file',
    group: 'file'
  },
  {
    keys: 'Ctrl/Cmd + S',
    zh: '保存',
    en: 'Save',
    group: 'file'
  },
  {
    keys: 'Ctrl/Cmd + Shift + S',
    zh: '另存为',
    en: 'Save as',
    group: 'file'
  },
  {
    keys: 'Ctrl/Cmd + Shift + E',
    zh: '导出',
    en: 'Export',
    group: 'file'
  }
]
