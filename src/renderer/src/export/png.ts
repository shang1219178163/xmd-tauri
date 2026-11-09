/**
 * Rasterise an SVG string to a PNG data URL using an offscreen canvas.
 * Intended for the renderer process where `document`, `Image` and
 * `HTMLCanvasElement` are available.
 */

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('SVG 图像加载失败，无法导出 PNG'))
    image.src = url
  })
}

export async function svgToPngDataUrl(
  svg: string,
  width: number,
  height: number,
  scale = 2
): Promise<string> {
  if (typeof document === 'undefined' || typeof Image === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('当前环境不支持 PNG 导出（缺少 DOM/Canvas）')
  }

  const factor = Number.isFinite(scale) && scale > 0 ? scale : 1
  const canvasWidth = Math.max(1, Math.round(width * factor))
  const canvasHeight = Math.max(1, Math.round(height * factor))
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法创建 Canvas 2D 绘图上下文')
    context.clearRect(0, 0, canvasWidth, canvasHeight)
    context.drawImage(image, 0, 0, canvasWidth, canvasHeight)
    let dataUrl: string
    try {
      dataUrl = canvas.toDataURL('image/png')
    } catch {
      throw new Error('Canvas 导出 PNG 失败（图像可能跨域或已被污染）')
    }
    if (!dataUrl.startsWith('data:image/png')) {
      throw new Error('PNG 导出返回了意外的数据格式')
    }
    return dataUrl
  } finally {
    URL.revokeObjectURL(url)
  }
}
