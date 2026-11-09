/**
 * PDF export via the desktop bridge: build a printable HTML document with one
 * SVG per sheet and let the main process render it to PDF.
 */
import type { Workbook } from '@shared/types'
import { sheetToSvg, type SvgResult } from './svg'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inlineSvg(svg: string): string {
  return svg.replace(/^<\?xml[^>]*\?>\s*/i, '')
}

export function buildPdfHtml(workbook: Workbook, landscape: boolean): string {
  const pages = workbook.sheets.map((sheet) => {
    const result: SvgResult = sheetToSvg({ ...workbook, activeSheetId: sheet.id })
    return { sheet, result }
  })
  const sections = pages
    .map(
      ({ sheet, result }) => `<section class="page">
  <h2 class="sheet-title">${escapeHtml(sheet.title || sheet.rootTopic.title || 'Sheet')}</h2>
  <div class="graphic">${inlineSvg(result.svg)}</div>
</section>`
    )
    .join('\n')
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(workbook.sheets[0]?.rootTopic.title ?? 'Mind Map')}</title>
<style>
  @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
  .page { box-sizing: border-box; width: 100%; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-after: always; page-break-inside: avoid; }
  .page:last-child { page-break-after: auto; }
  .sheet-title { margin: 0 0 6mm; font-size: 14pt; font-weight: 600; color: #334155; }
  .graphic { flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 0; }
  .graphic svg { max-width: 100%; max-height: 100%; height: auto; width: auto; }
</style>
</head>
<body>
${sections}
</body>
</html>`
}

export async function exportPdf(
  workbook: Workbook,
  defaultName: string
): Promise<{ canceled: boolean; filePath?: string }> {
  if (typeof window === 'undefined' || !window.desktop?.exportPdf) {
    throw new Error('PDF 导出需要桌面应用环境')
  }
  const active =
    workbook.sheets.find((sheet) => sheet.id === workbook.activeSheetId) ?? workbook.sheets[0]
  const activeResult = active ? sheetToSvg({ ...workbook, activeSheetId: active.id }) : undefined
  const landscape = activeResult ? activeResult.width > activeResult.height : false
  const html = buildPdfHtml(workbook, landscape)
  const result = await window.desktop.exportPdf({ html, defaultName, landscape })
  return { canceled: result.canceled, filePath: result.filePath }
}
