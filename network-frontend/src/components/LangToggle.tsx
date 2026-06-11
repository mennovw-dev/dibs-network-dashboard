import { useI18n, type Lang } from '../i18n'

const OPTIONS: Lang[] = ['nl', 'en']

export function LangToggle() {
  const { lang, setLang } = useI18n()

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`lang-toggle__btn ${lang === opt ? 'is-active' : ''}`}
          aria-pressed={lang === opt}
          onClick={() => setLang(opt)}
        >
          {opt === 'nl' ? 'NL' : 'ENG'}
        </button>
      ))}
    </div>
  )
}
