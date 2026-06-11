import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { LangToggle } from './LangToggle'
import { Metrics } from './Metrics'

interface SettingsMenuProps {
  buildings3d: boolean
  onToggle3d: (value: boolean) => void
  nodeCount: number
  plottedCount: number
  source: string | null
  lastUpdated: Date | null
  lang: string
}

export function SettingsMenu({
  buildings3d,
  onToggle3d,
  nodeCount,
  plottedCount,
  source,
  lastUpdated,
  lang,
}: SettingsMenuProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="settings-menu" ref={rootRef}>
      <button
        type="button"
        className={`icon-btn ${open ? 'is-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('settings.title')}
        aria-label={t('settings.open')}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 2.6v2.3M12 19.1v2.3M21.4 12h-2.3M4.9 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6 17 17M7 7 5.4 5.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="settings-dropdown" role="menu">
          <section className="settings-section">
            <span className="settings-kick">{t('settings.language')}</span>
            <LangToggle />
          </section>

          <section className="settings-section">
            <span className="settings-kick">{t('settings.view')}</span>
            <label className="settings-row">
              <span className="settings-row__label">
                {t('view.3d')}
                <span className="settings-row__hint">{t('view.3d.hint')}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={buildings3d}
                className={`switch ${buildings3d ? 'is-on' : ''}`}
                onClick={() => onToggle3d(!buildings3d)}
              >
                <span className="switch__knob" />
              </button>
            </label>
          </section>

          <section className="settings-section">
            <span className="settings-kick">{t('settings.data')}</span>
            <Metrics
              nodeCount={nodeCount}
              plottedCount={plottedCount}
              source={source}
              lastUpdated={lastUpdated}
              lang={lang}
            />
            <span className="staging-badge">
              <i aria-hidden="true" />
              {t('topbar.staging')}
            </span>
          </section>
        </div>
      )}
    </div>
  )
}
