import { useT } from '../i18n'

export type TimeWindow = 'live' | '7d' | '30d' | '90d'

export const TIME_WINDOWS: TimeWindow[] = ['live', '7d', '30d', '90d']

interface ViewSettingsProps {
  buildings3d: boolean
  onToggle3d: (value: boolean) => void
  timeWindow: TimeWindow
  onTimeWindow: (value: TimeWindow) => void
}

export function ViewSettings({
  buildings3d,
  onToggle3d,
  timeWindow,
  onTimeWindow,
}: ViewSettingsProps) {
  const t = useT()
  const overTime = timeWindow !== 'live'

  return (
    <div className="view-settings">
      <span className="view-settings__title">{t('view.settings')}</span>

      <label className="view-settings__row">
        <span className="view-settings__label">
          {t('view.3d')}
          <span className="view-settings__hint">{t('view.3d.hint')}</span>
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

      <div className="view-settings__divider" />

      <label className="view-settings__row">
        <span className="view-settings__label">
          {t('view.time')}
          <span className="view-settings__hint">{t('view.time.hint')}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={overTime}
          className={`switch ${overTime ? 'is-on' : ''}`}
          onClick={() => onTimeWindow(overTime ? 'live' : '30d')}
        >
          <span className="switch__knob" />
        </button>
      </label>

      {overTime && (
        <div className="view-settings__radios" role="radiogroup" aria-label={t('view.time')}>
          {TIME_WINDOWS.filter((w) => w !== 'live').map((w) => (
            <label key={w} className={`radio ${timeWindow === w ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="time-window"
                value={w}
                checked={timeWindow === w}
                onChange={() => onTimeWindow(w)}
              />
              <span>{t(`view.time.${w}`)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
