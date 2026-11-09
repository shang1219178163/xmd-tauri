import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { attachedOf } from '../model/tree'
import { useMapStore } from '../store/mapStore'
import { useUiStore } from '../store/uiStore'

interface Slide {
  title: string
  eyebrow: string
  bullets: string[]
}

export default function PitchMode() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const setPitch = useUiStore((s) => s.setPitch)
  const settings = useUiStore((s) => s.pitchSettings)
  const [index, setIndex] = useState(0)

  const slides = useMemo<Slide[]>(() => {
    const root = sheet.rootTopic
    const mains = attachedOf(root)
    const cover: Slide = {
      title: root.title || sheet.title,
      eyebrow: sheet.title,
      bullets: mains.map((topic) => topic.title).filter(Boolean).slice(0, 8)
    }
    const list: Slide[] = []
    if (settings.themeSlide !== 'hide') list.push(cover)
    if (settings.listSlide !== 'hide') {
      for (const main of mains) {
        list.push({
          title: main.title || '未命名主题',
          eyebrow: sheet.title,
          bullets: attachedOf(main).map((topic) => topic.title).filter(Boolean).slice(0, 8)
        })
      }
    }
    return list.length ? list : [cover]
  }, [sheet, settings.themeSlide, settings.listSlide])

  useEffect(() => {
    const next = () => setIndex((current) => Math.min(slides.length - 1, current + 1))
    const prev = () => setIndex((current) => Math.max(0, current - 1))
    window.addEventListener('xmind:pitch-next', next)
    window.addEventListener('xmind:pitch-prev', prev)
    return () => {
      window.removeEventListener('xmind:pitch-next', next)
      window.removeEventListener('xmind:pitch-prev', prev)
    }
  }, [slides.length])

  useEffect(() => {
    if (index > slides.length - 1) setIndex(0)
  }, [index, slides.length])

  const slide = slides[index] ?? slides[0]

  const aspectRatio =
    settings.aspect === '16:9' ? '16 / 9' : settings.aspect === '4:3' ? '4 / 3' : undefined

  return (
    <div className={`pitch-overlay pitch-${settings.style}`}>
      <div className="pitch-stage" style={{ alignItems: settings.layout === 'bottom' ? 'flex-end' : settings.layout === 'top' ? 'flex-start' : 'center' }}>
        <div
          className={`pitch-card pitch-mode-${settings.mode}`}
          style={{
            aspectRatio,
            textAlign: settings.layout === 'center' ? 'center' : settings.layout === 'right' ? 'right' : 'left'
          }}
        >
          <div className="pitch-eyebrow">
            {slide?.eyebrow ?? ''} · {String(index + 1).padStart(2, '0')}
          </div>
          <h1 className="pitch-title">{slide?.title ?? ''}</h1>
          <div className="pitch-bullets">
            {(slide?.bullets ?? []).map((bullet) => (
              <div key={bullet} className="bullet">
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pitch-controls">
        <span className="pitch-progress">
          {index + 1} / {slides.length}
        </span>
        <div className="pitch-actions">
          <button onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}>
            <ChevronLeft size={14} style={{ verticalAlign: -2 }} /> 上一页
          </button>
          <button onClick={() => setIndex((current) => Math.min(slides.length - 1, current + 1))} disabled={index >= slides.length - 1}>
            下一页 <ChevronRight size={14} style={{ verticalAlign: -2 }} />
          </button>
          <button onClick={() => setPitch(false)}>
            <X size={14} style={{ verticalAlign: -2 }} /> 退出演示
          </button>
        </div>
      </div>
    </div>
  )
}
