import { useMemo, useRef } from 'react'
import { layoutSheet } from '../../layout'
import { braceVerticalPath } from '../../model/edge-path'
import { useMapStore } from '../../store/mapStore'

export default function NavigatorPanel() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const viewport = useMapStore((s) => s.viewport)
  const setViewport = useMapStore((s) => s.setViewport)
  const selection = useMapStore((s) => s.selection)
  const layout = useMemo(() => layoutSheet(sheet), [sheet])
  const svgRef = useRef<SVGSVGElement>(null)
  const { bounds } = layout
  const pad = 40
  const viewBox = `${bounds.x - pad} ${bounds.y - pad} ${Math.max(bounds.width + pad * 2, 100)} ${Math.max(bounds.height + pad * 2, 100)}`

  const canvasWidth = typeof document !== 'undefined' ? document.querySelector<HTMLElement>('.canvas-wrap')?.clientWidth ?? 900 : 900
  const canvasHeight = typeof document !== 'undefined' ? document.querySelector<HTMLElement>('.canvas-wrap')?.clientHeight ?? 620 : 620
  const viewRect = {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: canvasWidth / viewport.zoom,
    height: canvasHeight / viewport.zoom
  }

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return
    const world = point.matrixTransform(matrix.inverse())
    setViewport({
      zoom: viewport.zoom,
      x: canvasWidth / 2 - world.x * viewport.zoom,
      y: canvasHeight / 2 - world.y * viewport.zoom
    })
  }

  return (
    <div>
      <section className="panel-section">
        <h3 className="panel-title">
          导航
          <span className="hint">点击定位</span>
        </h3>
        <div className="navigator">
          <svg ref={svgRef} className="navigator-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" onClick={handleClick}>
            <rect x={bounds.x - pad} y={bounds.y - pad} width={bounds.width + pad * 2} height={bounds.height + pad * 2} fill="var(--bg-canvas)" />
            {layout.decorations.map((decoration) => {
              const [start, end] = decoration.points
              if (!start || !end) return null
              const path =
                decoration.kind === 'brace'
                  ? braceVerticalPath(start, end)
                  : `M ${start.x} ${start.y} L ${end.x} ${end.y}`
              return (
                <path
                  key={decoration.id}
                  d={path}
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            })}
            {layout.edges.map((edge) => {
              const points = edge.points
              if (points.length < 2) return null
              return (
                <line
                  key={edge.id}
                  x1={points[0].x}
                  y1={points[0].y}
                  x2={points[points.length - 1].x}
                  y2={points[points.length - 1].y}
                  stroke="var(--line-strong)"
                  strokeWidth={3}
                />
              )
            })}
            {Array.from(layout.nodes.values()).map((node) => (
              <rect
                key={node.id}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={8}
                fill={selection.includes(node.id) ? 'var(--accent)' : 'var(--ink-faint)'}
                opacity={selection.includes(node.id) ? 0.95 : 0.42}
              />
            ))}
            <rect className="nav-viewport" x={viewRect.x} y={viewRect.y} width={viewRect.width} height={viewRect.height} rx={8} />
          </svg>
        </div>
        <div className="empty-state" style={{ padding: '10px 0 0', textAlign: 'left' }}>
          {layout.nodes.size} 个主题 · 缩放 {Math.round(viewport.zoom * 100)}%
        </div>
      </section>
    </div>
  )
}
