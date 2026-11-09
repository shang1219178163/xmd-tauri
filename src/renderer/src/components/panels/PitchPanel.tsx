import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, ChevronDown } from 'lucide-react'
import { useMapStore } from '../../store/mapStore'
import { useUiStore } from '../../store/uiStore'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="insp-row">
      <span>{label}</span>
      {children}
    </div>
  )
}

function Select({
  value,
  onChange,
  options
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="field-select-wrap" style={{ flex: 1 }}>
      <select className="field-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="field-chevron" />
    </label>
  )
}

export default function PitchPanel() {
  const sheet = useMapStore((s) => s.getActiveSheet())
  const settings = useUiStore((s) => s.pitchSettings)
  const setPitchSettings = useUiStore((s) => s.setPitchSettings)
  const setPitch = useUiStore((s) => s.setPitch)

  const previewStyle = settings.style
  const title = sheet.rootTopic.title || sheet.title

  return (
    <div>
      <section className="insp-section open">
        <div className="insp-section-head static">
          <span>演说模式预览</span>
        </div>
        <div className="insp-section-body">
          <div className={`pitch-preview ${previewStyle}`}>
            <span>{title}</span>
          </div>
          <button
            className="wide-btn"
            onClick={() => {
              const order: Array<'dark' | 'light' | 'color'> = ['dark', 'light', 'color']
              const next = order[(order.indexOf(settings.style) + 1) % order.length]
              setPitchSettings({ style: next })
            }}
          >
            更换风格
          </button>
        </div>
      </section>

      <section className="insp-section open">
        <div className="insp-section-head static">
          <span>幻灯片</span>
        </div>
        <div className="insp-section-body">
          <Row label="长宽比">
            <Select
              value={settings.aspect}
              onChange={(value) => setPitchSettings({ aspect: value as typeof settings.aspect })}
              options={[
                { value: 'auto', label: '自动' },
                { value: '16:9', label: '16:9' },
                { value: '4:3', label: '4:3' }
              ]}
            />
          </Row>
          <Row label="主题幻灯片">
            <Select
              value={settings.themeSlide}
              onChange={(value) => setPitchSettings({ themeSlide: value as typeof settings.themeSlide })}
              options={[
                { value: 'auto', label: '自动' },
                { value: 'show', label: '显示' },
                { value: 'hide', label: '隐藏' }
              ]}
            />
          </Row>
          <Row label="列表幻灯片">
            <Select
              value={settings.listSlide}
              onChange={(value) => setPitchSettings({ listSlide: value as typeof settings.listSlide })}
              options={[
                { value: 'auto', label: '自动' },
                { value: 'show', label: '显示' },
                { value: 'hide', label: '隐藏' }
              ]}
            />
          </Row>
          <Row label="演说方式">
            <Select
              value={settings.mode}
              onChange={(value) => setPitchSettings({ mode: value as typeof settings.mode })}
              options={[
                { value: 'fade', label: '逐一出现并钻入' },
                { value: 'push', label: '推入' },
                { value: 'none', label: '无动画' }
              ]}
            />
          </Row>
          <Row label="布局">
            <div className="seg-row pitch-layout">
              {[
                { key: 'left', icon: <AlignLeft size={14} /> },
                { key: 'center', icon: <AlignCenter size={14} /> },
                { key: 'right', icon: <AlignRight size={14} /> },
                { key: 'top', icon: <ArrowUp size={14} /> },
                { key: 'bottom', icon: <ArrowDown size={14} /> }
              ].map((item) => (
                <button
                  key={item.key}
                  className={`seg-btn ${settings.layout === item.key ? 'active' : ''}`}
                  onClick={() => setPitchSettings({ layout: item.key as typeof settings.layout })}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </Row>
        </div>
      </section>

      <div className="insp-section-body">
        <button className="wide-btn primary" onClick={() => setPitch(true)}>
          开始演播
        </button>
      </div>
    </div>
  )
}
