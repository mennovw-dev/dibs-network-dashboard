import { useT } from '../i18n'

interface ViewSettingsProps {
  buildings3d: boolean
  onToggle3d: (value: boolean) => void
}

export function ViewSettings({ buildings3d, onToggle3d }: ViewSettingsProps) {
  const t = useT()

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
    </div>
  )
}
