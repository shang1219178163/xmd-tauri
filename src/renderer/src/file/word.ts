/**
 * Word (.docx) import helper: convert mammoth's HTML output into the
 * Markdown-ish outline consumed by `markdownToWorkbook`.
 *
 * Headings map to heading levels and list items to nested bullets. Word
 * documents that use plain paragraphs (no heading styles) still import:
 * the first paragraph becomes the root topic and later paragraphs become
 * its children.
 */
function listDepth(el: Element, root: Element): number {
  let depth = 1
  let parent = el.parentElement
  while (parent && parent !== root) {
    if (parent.tagName === 'UL' || parent.tagName === 'OL') depth += 1
    parent = parent.parentElement
  }
  return depth
}

function ownText(el: Element): string {
  if (el.tagName.toLowerCase() !== 'li') return el.textContent ?? ''
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll('ul,ol').forEach((list) => list.remove())
  return clone.textContent ?? ''
}

function cleanText(el: Element): string {
  return ownText(el)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[•·▪◦‣]\s*/, '')
    .trim()
}

export function htmlToOutline(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const lines: string[] = []
  let hasHeading = false
  let hasRoot = false

  doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li').forEach((el) => {
    const text = cleanText(el)
    if (!text) return
    const tag = el.tagName.toLowerCase()
    if (/^h[1-6]$/.test(tag)) {
      hasHeading = true
      hasRoot = true
      lines.push(`${'#'.repeat(Number(tag[1]))} ${text}`)
      return
    }
    if (tag === 'li') {
      const depth = Math.min(6, listDepth(el, doc.body))
      lines.push(`${'  '.repeat(depth - 1)}- ${text}`)
      return
    }
    // Plain paragraph: use the first one as the sheet root when the document
    // has no headings, otherwise nest it under the current heading.
    if (!hasHeading && !hasRoot) {
      hasRoot = true
      lines.push(`# ${text}`)
    } else {
      lines.push(`- ${text}`)
    }
  })
  return lines.join('\n')
}
