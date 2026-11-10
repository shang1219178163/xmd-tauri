import { describe, expect, it } from 'vitest'
import {
  bentPath,
  curveMidpoint,
  defaultControls,
  pointFromControls,
  projectToControls,
  relationshipControls,
  toCurveControls
} from './relationship'

const a = { x: 0, y: 0 }
const b = { x: 100, y: 0 }

describe('关系线曲线', () => {
  it('默认控制点沿弦方向伸出 45%', () => {
    expect(defaultControls(a, b)).toEqual({ c1: { x: 45, y: 0 }, c2: { x: 55, y: 0 } })
  })

  it('比例/偏移与世界坐标可互相转换', () => {
    const point = pointFromControls(a, b, 0.3, 12)
    expect(point.x).toBeCloseTo(30)
    expect(point.y).toBeCloseTo(12)
    const back = projectToControls(a, b, point)
    expect(back.t).toBeCloseTo(0.3)
    expect(back.o).toBeCloseTo(12)
  })

  it('自定义控制点覆盖默认值', () => {
    const { c1, c2 } = relationshipControls(a, b, { t1: 0.2, o1: 30, t2: 0.8, o2: -30 })
    expect(c1.x).toBeCloseTo(20)
    expect(c1.y).toBeCloseTo(30)
    expect(c2.x).toBeCloseTo(80)
    expect(c2.y).toBeCloseTo(-30)
  })

  it('默认曲线可固化为比例/偏移', () => {
    const fixed = toCurveControls(a, b)
    expect(fixed.t1).toBeCloseTo(0.45)
    expect(fixed.o1).toBeCloseTo(0)
    expect(fixed.t2).toBeCloseTo(0.55)
  })

  it('生成三次贝塞尔路径', () => {
    expect(bentPath(a, b, { t1: 0.3, o1: 0, t2: 0.7, o2: 0 })).toBe('M 0 0 C 30 0, 70 0, 100 0')
  })

  it('标题取三次贝塞尔中点', () => {
    const mid = curveMidpoint(a, b, { t1: 0.3, o1: 40, t2: 0.7, o2: 40 })
    expect(mid.x).toBeCloseTo(50)
    expect(mid.y).toBeCloseTo(30)
  })
})
