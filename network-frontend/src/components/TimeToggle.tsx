import { useT } from '../i18n'

interface TimeToggleProps {
  active: boolean
  onToggle: () => void
}

export function TimeToggle({ active, onToggle }: TimeToggleProps) {
  const t = useT()
  const label = active ? t('time.disable') : t('time.enable')

  return (
    <button
      type="button"
      className={`icon-btn time-toggle ${active ? 'is-active' : ''}`}
      onClick={onToggle}
      aria-pressed={active}
      title={label}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 9.2v4l2.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M9 2.5h6M5.5 5l1.6 1.6M18.5 5l-1.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  )
}
