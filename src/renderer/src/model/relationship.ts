import type { Point } from '@shared/types'

/** 关系线曲线的两个控制点，以「沿弦的比例 t + 法线偏移 o」表示。 */
export interface CurveControls {
  t1: number
  o1: number
  t2: number
  o2: number
}

function chord(a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { len, ux: dx / len, uy: dy / len, nx: -dy / len, ny: dx / len }
}

/** 默认控制点：与旧版 S 曲线一致，沿轴向伸出 45% 跨度。 */
export function defaultControls(a: Point, b: Point): { c1: Point; c2: Point } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    const c = Math.max(24, Math.abs(dx) * 0.45)
    return { c1: { x: a.x + c, y: a.y }, c2: { x: b.x - c, y: b.y } }
  }
  const c = Math.max(24, Math.abs(dy) * 0.45)
  return { c1: { x: a.x, y: a.y + c }, c2: { x: b.x, y: b.y - c } }
}

/** 由比例/偏移还原世界坐标点。 */
export function pointFromControls(a: Point, b: Point, t: number, o: number): Point {
  const { len, ux, uy, nx, ny } = chord(a, b)
  return { x: a.x + ux * t * len + nx * o, y: a.y + uy * t * len + ny * o }
}

/** 把世界坐标点投影为沿弦比例 t 与法线偏移 o。 */
export function projectToControls(a: Point, b: Point, p: Point): { t: number; o: number } {
  const { len, ux, uy, nx, ny } = chord(a, b)
  const dx = p.x - a.x
  const dy = p.y - a.y
  return { t: (dx * ux + dy * uy) / len, o: dx * nx + dy * ny }
}

/** 当前生效的控制点：优先用保存值，否则用默认 S 曲线。 */
export function relationshipControls(
  a: Point,
  b: Point,
  curve?: CurveControls
): { c1: Point; c2: Point } {
  if (!curve) return defaultControls(a, b)
  return {
    c1: pointFromControls(a, b, curve.t1, curve.o1),
    c2: pointFromControls(a, b, curve.t2, curve.o2)
  }
}

/** 把默认 S 曲线固化成可编辑的比例/偏移。 */
export function toCurveControls(a: Point, b: Point, curve?: CurveControls): CurveControls {
  if (curve) return curve
  const { c1, c2 } = defaultControls(a, b)
  const first = projectToControls(a, b, c1)
  const second = projectToControls(a, b, c2)
  return { t1: first.t, o1: first.o, t2: second.t, o2: second.o }
}

export function bentPath(a: Point, b: Point, curve?: CurveControls): string {
  const { c1, c2 } = relationshipControls(a, b, curve)
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`
}

/** 三次贝塞尔 t = 0.5 处的点，用于放置关系线标题。 */
export function curveMidpoint(a: Point, b: Point, curve?: CurveControls): Point {
  const { c1, c2 } = relationshipControls(a, b, curve)
  return {
    x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8,
    y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8
  }
}
