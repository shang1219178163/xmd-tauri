import { beforeEach, describe, expect, it } from 'vitest'
import {
  FONT_PRESETS,
  currentFontKey,
  fontChoicesFromFamilies,
  fontCssValue,
  isCjkFontFamily,
  labelForFamily,
  labelForValue,
  loadRecentFontChoices,
  matchesFontChoice,
  primaryFontFamily,
  rememberFontChoice,
  sortFontFamilies
} from './fonts'

describe('font helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('extracts the primary family from a CSS stack', () => {
    expect(primaryFontFamily('Inter, "PingFang SC", system-ui, sans-serif')).toBe('Inter')
    expect(primaryFontFamily('"Songti SC", "SimSun", Georgia, serif')).toBe('Songti SC')
    expect(primaryFontFamily('')).toBe('')
  })

  it('quotes family names for CSS', () => {
    expect(fontCssValue('PingFang SC')).toBe('"PingFang SC"')
  })

  it('localises common CJK font families', () => {
    expect(labelForFamily('Heiti SC')).toBe('黑体-简')
    expect(labelForFamily('Hiragino Sans GB')).toBe('冬青黑体简体中文')
    expect(labelForFamily('NeverMind Hand')).toBe('NeverMind Hand')
  })

  it('identifies the active preset or family', () => {
    expect(currentFontKey(FONT_PRESETS[0].value)).toBe(FONT_PRESETS[0].key)
    expect(currentFontKey('"PingFang SC", sans-serif')).toBe('font:PingFang SC')
    expect(labelForValue('"PingFang SC", sans-serif')).toBe('苹方-简')
  })

  it('builds choices from family names', () => {
    const choices = fontChoicesFromFamilies(['Heiti SC', 'NeverMind Hand'])
    expect(choices[0]).toEqual({
      key: 'font:Heiti SC',
      label: '黑体-简',
      value: '"Heiti SC"',
      family: 'Heiti SC'
    })
  })

  it('matches labels, raw family names and values', () => {
    const choice = { key: 'font:Heiti SC', label: '黑体-简', value: '"Heiti SC"', family: 'Heiti SC' }
    expect(matchesFontChoice(choice, '黑体')).toBe(true)
    expect(matchesFontChoice(choice, 'heiti')).toBe(true)
    expect(matchesFontChoice(choice, 'songti')).toBe(false)
    expect(matchesFontChoice(choice, '')).toBe(true)
  })

  it('detects CJK font families', () => {
    expect(isCjkFontFamily('PingFang SC')).toBe(true)
    expect(isCjkFontFamily('Songti SC')).toBe(true)
    expect(isCjkFontFamily('Hiragino Kaku Gothic ProN')).toBe(true)
    expect(isCjkFontFamily('Apple SD Gothic Neo')).toBe(true)
    expect(isCjkFontFamily('Noto Sans CJK JP')).toBe(true)
    expect(isCjkFontFamily('Al Bayan')).toBe(false)
    expect(isCjkFontFamily('Academy Engraved LET')).toBe(false)
  })

  it('sorts Chinese fonts before other CJK and Latin fonts', () => {
    const families = [
      'Al Bayan',
      'Songti SC',
      'Academy Engraved LET',
      'Heiti SC',
      'Hiragino Kaku Gothic ProN',
      'PingFang SC',
      'Georgia',
      'Apple SD Gothic Neo'
    ]
    const sorted = sortFontFamilies(families)
    const chinese = ['Songti SC', 'Heiti SC', 'PingFang SC']
    const otherCjk = ['Hiragino Kaku Gothic ProN', 'Apple SD Gothic Neo']
    const latin = ['Al Bayan', 'Academy Engraved LET', 'Georgia']
    const lastChinese = Math.max(...chinese.map((family) => sorted.indexOf(family)))
    const firstOtherCjk = Math.min(...otherCjk.map((family) => sorted.indexOf(family)))
    const lastOtherCjk = Math.max(...otherCjk.map((family) => sorted.indexOf(family)))
    const firstLatin = Math.min(...latin.map((family) => sorted.indexOf(family)))

    expect(lastChinese).toBeLessThan(firstOtherCjk)
    expect(lastOtherCjk).toBeLessThan(firstLatin)
  })

  it('remembers recent choices without duplicates and within the limit', () => {
    expect(loadRecentFontChoices()).toEqual([])
    const system = FONT_PRESETS[0]
    const hand = FONT_PRESETS[1]
    rememberFontChoice(hand)
    rememberFontChoice(system)
    const list = rememberFontChoice(hand)
    expect(list[0].key).toBe(hand.key)
    expect(list).toHaveLength(2)
    expect(loadRecentFontChoices().map((choice) => choice.key)).toEqual([hand.key, system.key])

    for (let index = 0; index < 12; index += 1) {
      rememberFontChoice({ key: `font:F${index}`, label: `F${index}`, value: `"F${index}"` })
    }
    expect(loadRecentFontChoices()).toHaveLength(8)
  })
})
