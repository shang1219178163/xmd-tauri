/**
 * Markdown import/export.
 *
 * The first heading of each section becomes the sheet root topic. Deeper
 * headings (up to level 6) and indented bullet/ordered lists become child topics.
 * Multiple sheets are separated by horizontal rules (`---`).
 */
import type { Sheet, Topic, Workbook } from '@shared/types'
import { createEmptyWorkbook, createSheet, createTopic } from '@shared/defaults'

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim() || 'Untitled'
}

function writeTopic(topic: Topic, depth: number, lines: string[]): void {
  const title = cleanTitle(topic.title)
  if (depth <= 5) {
    lines.push(`${'#'.repeat(depth + 1)} ${title}`)
  } else {
    // Markdown only supports six heading levels; nest deeper topics as bullets.
    lines.push(`${'  '.repeat(depth - 6)}- ${title}`)
  }
  for (const child of topic.children?.attached ?? []) writeTopic(child, depth + 1, lines)
}

/** Render the workbook as Markdown headings and bullet lists. */
export function workbookToMarkdown(workbook: Workbook): string {
  if (!workbook.sheets.length) return '# Central Topic\n'
  return workbook.sheets
    .map((sheet) => {
      const lines: string[] = [`# ${cleanTitle(sheet.rootTopic.title)}`]
      for (const child of sheet.rootTopic.children?.attached ?? []) writeTopic(child, 1, lines)
      return lines.join('\n')
    })
    .join('\n\n---\n\n')
}

function attach(parent: Topic, child: Topic): void {
  const attached = parent.children?.attached ?? []
  parent.children = {
    ...(parent.children ?? { detached: [] }),
    attached: [...attached, child]
  }
}

function expandIndent(indent: string): number {
  let width = 0
  for (const char of indent) width += char === '\t' ? 4 : 1
  return width
}

interface HeadingEntry {
  level: number
  topic: Topic
}

interface BulletEntry {
  indent: number
  topic: Topic
}

/** Parse Markdown headings and bullet lists into a workbook. */
export function markdownToWorkbook(md: string): Workbook {
  const lines = md.replace(/^﻿/, '').split(/\r?\n/)
  const sheets: Sheet[] = []
  let sheet: Sheet | undefined
  let headingStack: HeadingEntry[] = []
  let bulletStack: BulletEntry[] = []
  let currentHeading: Topic | undefined

  const startSheet = (title: string, level: number): void => {
    const rootTitle = cleanTitle(title)
    const created = createSheet(rootTitle, rootTitle)
    created.title = rootTitle
    created.rootTopic.title = rootTitle
    sheets.push(created)
    sheet = created
    headingStack = [{ level, topic: created.rootTopic }]
    bulletStack = []
    currentHeading = created.rootTopic
  }

  for (const raw of lines) {
    if (!raw.trim()) continue
    // Horizontal rule separating sheets.
    if (/^\s*([-*_])\1{2,}\s*$/.test(raw)) continue

    const headingMatch = /^(#{1,6})[ \t]+(.*)$/.exec(raw)
    if (headingMatch) {
      const level = headingMatch[1].length
      const title = cleanTitle(headingMatch[2].replace(/\s+#+\s*$/, ''))
      bulletStack = []
      if (!sheet || level === 1) {
        startSheet(title, level)
        continue
      }

      // Pop headings that are at the same or deeper level, then attach to the
      // closest shallower heading (or the sheet root for out-of-order levels).
      let parent: Topic | undefined
      while (headingStack.length) {
        const top = headingStack[headingStack.length - 1]
        if (top.level < level) {
          parent = top.topic
          break
        }
        headingStack.pop()
      }
      if (!parent) parent = sheet.rootTopic

      const topic = createTopic(title)
      attach(parent, topic)
      headingStack.push({ level, topic })
      currentHeading = topic
      continue
    }

    const bulletMatch = /^([ \t]*)(?:[-*+]|\d+[.)])[ \t]+(.*)$/.exec(raw)
    if (bulletMatch) {
      if (!sheet) startSheet('Central Topic', 1)
      const activeSheet = sheet
      if (!activeSheet) continue
      const indent = expandIndent(bulletMatch[1])
      const title = cleanTitle(bulletMatch[2])
      while (bulletStack.length && bulletStack[bulletStack.length - 1].indent >= indent) {
        bulletStack.pop()
      }
      const parent = bulletStack[bulletStack.length - 1]?.topic ?? currentHeading ?? activeSheet.rootTopic
      const topic = createTopic(title)
      attach(parent, topic)
      bulletStack.push({ indent, topic })
      continue
    }
    // Other prose is ignored so ordinary notes do not become topics.
  }

  if (!sheets.length) return createEmptyWorkbook()

  // Guard against a parse that only contained stray prose.
  if (!sheets[0].rootTopic.title) sheets[0].rootTopic.title = 'Central Topic'
  return { sheets, activeSheetId: sheets[0].id }
}
