import { describe, expect, it } from 'vitest'
import type { ThemePart, Topic } from '@shared/types'
import { countTopics, flattenTopics } from '@renderer/model/tree'
import { THEME_PRESETS, defaultPreset, themeById } from './themes'
import { TEMPLATES, TEMPLATE_CATEGORIES, templateById } from './templates'
import { MARKER_GROUPS, markerById } from './markers'
import { SHORTCUTS } from './shortcuts'

const REQUIRED_THEME_PARTS = [
  'centralTopic',
  'mainTopic',
  'subTopic',
  'floatingTopic',
  'summaryTopic',
  'calloutTopic',
  'importantTopic',
  'minorTopic',
  'boundary',
  'summary',
  'relationship',
  'map'
] as const

const REQUIRED_STYLE_KEYS = [
  'svg:fill',
  'fo:color',
  'fo:font-family',
  'fo:font-size',
  'fo:font-weight',
  'border-line-color',
  'border-line-width',
  'shape-class',
  'line-color',
  'line-width',
  'line-class'
]

function depthOf(topic: Topic): number {
  const children = topic.children?.attached ?? []
  if (!children.length) return 1
  return 1 + Math.max(...children.map(depthOf))
}

describe('theme presets', () => {
  it('ships at least 30 presets with unique sequential ids', () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(30)
    const ids = THEME_PRESETS.map((preset) => preset.id)
    expect(new Set(ids).size).toBe(ids.length)
    ids.forEach((id, index) => {
      expect(id).toBe(`preset-${String(index + 1).padStart(2, '0')}`)
    })
  })

  it('builds every theme part with XMind-style style keys', () => {
    const usedKeys = new Set<string>()

    for (const preset of THEME_PRESETS) {
      const theme = preset.theme
      const parts: Array<ThemePart | undefined> = [
        theme.centralTopic,
        theme.mainTopic,
        theme.subTopic,
        theme.floatingTopic,
        theme.summaryTopic,
        theme.calloutTopic,
        theme.importantTopic,
        theme.minorTopic,
        theme.boundary,
        theme.summary,
        theme.relationship,
        theme.map
      ]

      for (const part of parts) {
        expect(part).toBeDefined()
        expect(part?.properties).toBeTruthy()
        for (const key of Object.keys(part?.properties ?? {})) usedKeys.add(key)
      }

      for (const requiredKey of REQUIRED_STYLE_KEYS) {
        expect(usedKeys.has(requiredKey), `missing ${requiredKey}`).toBe(true)
      }

      expect(theme.map?.properties['svg:fill']).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.centralTopic?.properties['fo:font-family']).toBeTruthy()
      expect(theme.centralTopic?.properties['fo:color']).toBeTruthy()
      expect(theme.mainTopic?.properties['line-color']).toBeTruthy()
      expect(preset.accent.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('provides consistent parts on every preset', () => {
    for (const preset of THEME_PRESETS) {
      for (const partKey of REQUIRED_THEME_PARTS) {
        expect(preset.theme[partKey], `${preset.id} is missing ${partKey}`).toBeDefined()
      }
      expect(['map', 'logic', 'org', 'colorful', 'dark']).toContain(preset.group)
      expect(preset.name.zh.length).toBeGreaterThan(0)
      expect(preset.name.en.length).toBeGreaterThan(0)
    }
  })

  it('looks presets up by id and exposes a default', () => {
    expect(themeById('preset-01')).toBe(THEME_PRESETS[0].theme)
    expect(themeById('preset-30')).toBe(THEME_PRESETS[29].theme)
    expect(themeById('preset-99')).toBeUndefined()

    const fallback = defaultPreset()
    expect(fallback).toBeDefined()
    expect(fallback.theme).toBe(themeById(fallback.id))
    expect(fallback.theme.map?.properties['svg:fill']).toBeTruthy()
  })
})

describe('templates', () => {
  it('ships at least 20 unique templates in known categories', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(20)
    const ids = TEMPLATES.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)

    const categoryIds = new Set(TEMPLATE_CATEGORIES.map((category) => category.id))
    for (const template of TEMPLATES) {
      expect(categoryIds.has(template.category), `${template.id} category`).toBe(true)
      expect(template.name.zh.length).toBeGreaterThan(0)
      expect(template.name.en.length).toBeGreaterThan(0)
      expect(template.description.zh.length).toBeGreaterThan(0)
      expect(template.description.en.length).toBeGreaterThan(0)
      expect(template.accent.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('creates a valid populated sheet for every template', () => {
    const markerIds = new Set(
      MARKER_GROUPS.flatMap((group) => group.markers).map((marker) => marker.id)
    )

    for (const template of TEMPLATES) {
      const sheet = template.create()
      expect(sheet.rootTopic, `${template.id} rootTopic`).toBeDefined()
      expect(sheet.rootTopic.title.trim().length, `${template.id} root title`).toBeGreaterThan(0)
      expect(sheet.theme?.centralTopic, `${template.id} theme`).toBeDefined()
      expect(sheet.theme?.mainTopic, `${template.id} main theme`).toBeDefined()

      const nodes = flattenTopics(sheet.rootTopic)
      expect(nodes.length, `${template.id} topic count`).toBeGreaterThanOrEqual(5)
      expect(countTopics(sheet.rootTopic)).toBe(nodes.length)

      const depth = depthOf(sheet.rootTopic)
      expect(depth, `${template.id} depth`).toBeGreaterThanOrEqual(2)
      expect(depth, `${template.id} depth`).toBeLessThanOrEqual(4)

      expect(nodes.some((node) => (node.markers?.length ?? 0) > 0), `${template.id} markers`).toBe(
        true
      )
      expect(nodes.some((node) => (node.labels?.length ?? 0) > 0), `${template.id} labels`).toBe(
        true
      )
      expect(nodes.some((node) => Boolean(node.notes)), `${template.id} notes`).toBe(true)

      for (const node of nodes) {
        for (const marker of node.markers ?? []) {
          expect(
            markerIds.has(marker.markerId),
            `${template.id} uses unknown marker ${marker.markerId}`
          ).toBe(true)
        }
      }
    }
  })

  it('returns a fresh sheet with fresh ids on every call', () => {
    const template = templateById('project-plan')
    expect(template).toBeDefined()
    const first = template!.create()
    const second = template!.create()
    expect(first.id).not.toBe(second.id)
    expect(first.rootTopic.id).not.toBe(second.rootTopic.id)
    expect(first.rootTopic.children?.attached?.[0]?.id).not.toBe(
      second.rootTopic.children?.attached?.[0]?.id
    )
  })

  it('looks templates up by id', () => {
    expect(templateById('project-plan')?.id).toBe('project-plan')
    expect(templateById('blank-mind-map')?.id).toBe('blank-mind-map')
    expect(templateById('does-not-exist')).toBeUndefined()
    expect(TEMPLATE_CATEGORIES.length).toBeGreaterThanOrEqual(8)
  })
})

describe('markers', () => {
  it('ships at least 8 groups and 60 unique markers', () => {
    expect(MARKER_GROUPS.length).toBeGreaterThanOrEqual(8)

    const allMarkers = MARKER_GROUPS.flatMap((group) => group.markers)
    expect(allMarkers.length).toBeGreaterThanOrEqual(60)

    const ids = allMarkers.map((marker) => marker.id)
    expect(new Set(ids).size).toBe(ids.length)

    const requiredGroups = [
      'priority',
      'task',
      'flag',
      'star',
      'smiley',
      'symbol',
      'people',
      'arrow',
      'other'
    ]
    const groupIds = new Set(MARKER_GROUPS.map((group) => group.id))
    for (const groupId of requiredGroups) {
      expect(groupIds.has(groupId), `missing group ${groupId}`).toBe(true)
    }
  })

  it('keeps marker metadata complete and consistent', () => {
    for (const group of MARKER_GROUPS) {
      expect(group.label.zh.length).toBeGreaterThan(0)
      expect(group.label.en.length).toBeGreaterThan(0)
      expect(group.markers.length).toBeGreaterThan(0)
      for (const marker of group.markers) {
        expect(marker.group).toBe(group.id)
        expect(marker.icon.trim().length).toBeGreaterThan(0)
        expect(marker.label.zh.length).toBeGreaterThan(0)
        expect(marker.label.en.length).toBeGreaterThan(0)
      }
    }
  })

  it('looks markers up by id', () => {
    expect(markerById('priority-1')?.group).toBe('priority')
    expect(markerById('task-done')?.label.en).toBe('Done')
    expect(markerById('smiley-smile')?.icon).toBe('😀')
    expect(markerById('arrow-right')?.group).toBe('arrow')
    expect(markerById('not-a-marker')).toBeUndefined()
  })
})

describe('shortcuts', () => {
  it('covers the core editing, navigation, view and export keys', () => {
    const keys = SHORTCUTS.map((shortcut) => shortcut.keys)
    const required = [
      'Tab',
      'Enter',
      'Shift + Enter',
      'Delete',
      'F2',
      'Ctrl/Cmd + Z',
      'Ctrl/Cmd + Y',
      'Ctrl/Cmd + C',
      'Ctrl/Cmd + V',
      'Ctrl/Cmd + X',
      'Ctrl/Cmd + A',
      'Ctrl/Cmd + F',
      'Ctrl/Cmd + +',
      'Ctrl/Cmd + -',
      'Ctrl/Cmd + 0',
      'Shift + F',
      'Shift + T',
      'Shift + O',
      'Shift + P',
      'F11',
      'Ctrl/Cmd + Shift + E'
    ]

    for (const key of required) {
      expect(keys, `missing shortcut ${key}`).toContain(key)
    }
    expect(keys.some((key) => key.includes('↑'))).toBe(true)
    expect(SHORTCUTS.some((shortcut) => /ZEN/i.test(shortcut.zh) || /ZEN/i.test(shortcut.en))).toBe(
      true
    )
    expect(SHORTCUTS.some((shortcut) => /export/i.test(shortcut.en))).toBe(true)
  })

  it('keeps shortcut metadata complete', () => {
    expect(SHORTCUTS.length).toBeGreaterThanOrEqual(20)
    for (const shortcut of SHORTCUTS) {
      expect(shortcut.keys.trim().length).toBeGreaterThan(0)
      expect(shortcut.zh.trim().length).toBeGreaterThan(0)
      expect(shortcut.en.trim().length).toBeGreaterThan(0)
      expect(shortcut.group.trim().length).toBeGreaterThan(0)
    }
  })
})
