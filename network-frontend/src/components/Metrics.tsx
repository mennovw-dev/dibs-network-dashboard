import { useT } from '../i18n'

interface MetricsProps {
  nodeCount: number
  plottedCount: number
  source: string | null
  lastUpdated: Date | null
  lang: string
}

export function Metrics({
  nodeCount,
  plottedCount,
  source,
  lastUpdated,
  lang,
}: MetricsProps) {
  const t = useT()
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'

  return (
    <div className="metrics">
      <div className="met">
        <span className="met-k">{t('metric.nodes')}</span>
        <span className="met-v">{nodeCount}</span>
      </div>
      <div className="met">
        <span className="met-k">{t('metric.plotted')}</span>
        <span className="met-v">{plottedCount}</span>
      </div>
      <div className="met">
        <span className="met-k">{t('metric.source')}</span>
        <span className="met-v met-v--sm">{source ?? '—'}</span>
      </div>
      <div className="met">
        <span className="met-k">{t('metric.update')}</span>
        <span className="met-v met-v--sm">
          {lastUpdated
            ? lastUpdated.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : '—'}
        </span>
      </div>
    </div>
  )
}
