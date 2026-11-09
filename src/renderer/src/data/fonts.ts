/**
 * Font helpers for the font picker: system family labels, recent selections,
 * and a small set of built-in stacks.
 */
import { FONT_STACK, HAND_FONT_STACK } from '../model/style'

export interface FontChoice {
  key: string
  label: string
  value: string
  family?: string
}

export const SERIF_FONT_STACK = '"Songti SC", "SimSun", Georgia, serif'

export const FONT_PRESETS: FontChoice[] = [
  { key: 'preset:system', label: '系统字体', value: FONT_STACK },
  { key: 'preset:hand', label: '手写', value: HAND_FONT_STACK },
  { key: 'preset:serif', label: '衬线', value: SERIF_FONT_STACK }
]

/** Fallback list used in a plain browser or if the host cannot enumerate fonts. */
export const FALLBACK_FONT_FAMILIES = [
  'PingFang SC',
  'Heiti SC',
  'Songti SC',
  'Kaiti SC',
  'Hiragino Sans GB',
  'STSong',
  'STKaiti',
  'Avenir Next',
  'Helvetica Neue',
  'Inter',
  'Georgia',
  'Times New Roman',
  'Menlo',
  'Monaco',
  'Courier New',
  'Bradley Hand',
  'Microsoft YaHei',
  'SimSun'
]

/** Localised display names for common macOS / Windows CJK families. */
const FONT_LABELS: Record<string, string> = {
  'PingFang SC': '苹方-简',
  'PingFang TC': '苹方-繁',
  'PingFang HK': '苹方-港',
  'Hiragino Sans GB': '冬青黑体简体中文',
  'Hiragino Sans': '冬青黑体',
  'Heiti SC': '黑体-简',
  'Heiti TC': '黑体-繁',
  'Songti SC': '宋体-简',
  'Songti TC': '宋体-繁',
  'Kaiti SC': '楷体-简',
  'Kaiti TC': '楷体-繁',
  'Yuanti SC': '圆体-简',
  'Yuanti TC': '圆体-繁',
  STHeiti: '华文黑体',
  STSong: '华文宋体',
  STKaiti: '华文楷体',
  STFangsong: '华文仿宋',
  STXihei: '华文细黑',
  STZhongsong: '华文中宋',
  'Baoli SC': '报隶-简',
  'Hannotate SC': '手札体-简',
  'Hannotate TC': '手札体-繁',
  'HanziPen SC': '翩翩体-简',
  'HanziPen TC': '翩翩体-繁',
  'Lantinghei SC': '兰亭黑-简',
  'Lantinghei TC': '兰亭黑-繁',
  'Libian SC': '隶变-简',
  'Wawati SC': '娃娃体-简',
  'Wawati TC': '娃娃体-繁',
  'Weibei SC': '魏碑-简',
  'Weibei TC': '魏碑-繁',
  'Xingkai SC': '行楷-简',
  'Xingkai TC': '行楷-繁',
  'Yuppy SC': '雅痞-简',
  'Yuppy TC': '雅痞-繁',
  'Microsoft YaHei': '微软雅黑',
  SimSun: '宋体',
  SimHei: '黑体',
  KaiTi: '楷体',
  FangSong: '仿宋',
  NSimSun: '新宋体',
  'Microsoft JhengHei': '微软正黑体',
  MingLiU: '细明体',
  PMingLiU: '新细明体',
  'Apple LiGothic': '苹果俪黑',
  'Apple LiSung': '苹果俪宋',
  'Noto Sans CJK SC': '思源黑体-简',
  'Noto Sans CJK TC': '思源黑体-繁',
  'Noto Sans CJK HK': '思源黑体-港',
  'Noto Sans CJK JP': '思源黑体-日',
  'Noto Sans CJK KR': '思源黑体-韩',
  'Noto Serif CJK SC': '思源宋体-简',
  'Noto Serif CJK TC': '思源宋体-繁',
  'Noto Serif CJK HK': '思源宋体-港',
  'Noto Serif CJK JP': '思源宋体-日',
  'Noto Serif CJK KR': '思源宋体-韩',
  'Source Han Sans SC': '思源黑体-简',
  'Source Han Sans TC': '思源黑体-繁',
  'Source Han Serif SC': '思源宋体-简',
  'Source Han Serif TC': '思源宋体-繁'
}

export function labelForFamily(family: string): string {
  return FONT_LABELS[family] ?? family
}

const CJK_CHAR_PATTERN = /[㐀-鿿豈-﫿]/

/** Family names of common Chinese / Japanese / Korean fonts. */
const CJK_FAMILY_PATTERN = new RegExp(
  [
    '^(PingFang|Hiragino|Heiti|Songti|Kaiti|Yuanti|ST(Heiti|Song|Kaiti|Fangsong|Xihei|Zhongsong))',
    '^(Baoli|Hannotate|HanziPen|Lantinghei|Libian|Wawati|Weibei|Xingkai|Yuppy)',
    '^(LiSong|LiHei|LiGothic|LiSung|BiauKai|Apple Li(Gothic|Sung))',
    '^(Apple (SD Gothic Neo|Myungjo|Gothic))',
    '^(Noto (Sans|Serif) (CJK|SC|TC|HK|JP|KR)|Source Han|WenQuanYi)',
    '^(Microsoft (YaHei|JhengHei)|SimSun|SimHei|KaiTi|FangSong|NSimSun|MingLiU|PMingLiU)',
    '^(Yu ?(Gothic|Mincho)|MS (Gothic|Mincho)|Meiryo|Kozuka|Toppan|Klee|Tsukushi|Osaka)',
    '^(Nanum|Malgun|Gulim|Dotum|Batang|Gungsuh|HY)'
  ].join('|'),
  'i'
)

export function isCjkFontFamily(family: string): boolean {
  if (!family) return false
  if (CJK_CHAR_PATTERN.test(family)) return true
  const label = FONT_LABELS[family]
  if (label && CJK_CHAR_PATTERN.test(label)) return true
  return CJK_FAMILY_PATTERN.test(family)
}

/**
 * 0 = Chinese fonts (localised label), 1 = other CJK fonts, 2 = Latin fonts.
 * The font list is ordered by this rank so Chinese fonts come first.
 */
export function fontSortRank(family: string): number {
  const label = labelForFamily(family)
  if (CJK_CHAR_PATTERN.test(label) || CJK_CHAR_PATTERN.test(family)) return 0
  if (isCjkFontFamily(family)) return 1
  return 2
}

export function sortFontFamilies(families: string[]): string[] {
  return [...families].sort((a, b) => {
    const rankA = fontSortRank(a)
    const rankB = fontSortRank(b)
    if (rankA !== rankB) return rankA - rankB
    const labelA = labelForFamily(a)
    const labelB = labelForFamily(b)
    if (rankA === 0) {
      const byLabel = labelA.localeCompare(labelB, 'zh-Hans-CN')
      return byLabel !== 0 ? byLabel : a.localeCompare(b)
    }
    return a.localeCompare(b, 'en')
  })
}

/** Extract the first family from a CSS font stack, stripping quotes. */
export function primaryFontFamily(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const quote = trimmed[0]
    const end = trimmed.indexOf(quote, 1)
    if (end > 0) return trimmed.slice(1, end).trim()
  }
  return (trimmed.split(',')[0] ?? '').trim()
}

/** CSS-ready quoted family name. */
export function fontCssValue(family: string): string {
  return JSON.stringify(family)
}

export function currentFontKey(value: string): string {
  const preset = FONT_PRESETS.find((choice) => choice.value === value)
  if (preset) return preset.key
  const family = primaryFontFamily(value)
  return family ? `font:${family}` : 'preset:system'
}

export function labelForValue(value: string): string {
  const preset = FONT_PRESETS.find((choice) => choice.value === value)
  if (preset) return preset.label
  const family = primaryFontFamily(value)
  return family ? labelForFamily(family) : '系统字体'
}

export function fontChoicesFromFamilies(families: string[]): FontChoice[] {
  return families.map((family) => ({
    key: `font:${family}`,
    label: labelForFamily(family),
    value: fontCssValue(family),
    family
  }))
}

export function matchesFontChoice(choice: FontChoice, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (
    choice.label.toLowerCase().includes(needle) ||
    (choice.family?.toLowerCase().includes(needle) ?? false) ||
    choice.value.toLowerCase().includes(needle)
  )
}

const RECENT_KEY = 'xmind:recent-fonts'
const RECENT_LIMIT = 8

function isFontChoice(value: unknown): value is FontChoice {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.key === 'string' &&
    typeof record.label === 'string' &&
    typeof record.value === 'string' &&
    (record.family === undefined || typeof record.family === 'string')
  )
}

export function loadRecentFontChoices(): FontChoice[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isFontChoice).slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

export function rememberFontChoice(choice: FontChoice): FontChoice[] {
  const kept = loadRecentFontChoices().filter((item) => item.key !== choice.key)
  const next = [choice, ...kept].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* storage may be unavailable; recents are best-effort */
  }
  return next
}

let familiesPromise: Promise<string[]> | undefined

/** Loads installed font families once per window. */
export function loadFontFamilies(): Promise<string[]> {
  if (!familiesPromise) {
    familiesPromise = (async () => {
      try {
        const families = await window.desktop?.listFonts?.()
        if (Array.isArray(families) && families.length) {
          const unique = Array.from(
            new Set(families.filter((name): name is string => typeof name === 'string' && name.trim().length > 0))
          )
          return sortFontFamilies(unique)
        }
      } catch {
        /* fall through to the built-in list */
      }
      return sortFontFamilies([...FALLBACK_FONT_FAMILIES])
    })()
  }
  return familiesPromise
}
