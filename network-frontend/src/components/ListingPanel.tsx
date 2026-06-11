import { useEffect, useMemo, useState } from 'react'
import type { EnrichedNode } from '../lib/houses'
import { getAnalytics } from '../lib/analytics'
import { panelBorderColor, statusTag } from '../lib/status'
import { useT, type TFn } from '../i18n'

interface ListingPanelProps {
  node: EnrichedNode | null
  onClose: () => void
  lang: string
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  const n = values.length
  const line = values
    .map((v, i) => {
      const x = n > 1 ? (i / (n - 1)) * 100 : 0
      const y = 34 - (v / max) * 30 - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const area = `0,36 ${line} 100,36`

  return (
    <svg className="spark" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
      <polygon className="spark__area" points={area} />
      <polyline className="spark__line" points={line} />
    </svg>
  )
}

function StatBar({ label, value, pct, tone }: { label: string; value: string; pct: number; tone: string }) {
  return (
    <div className="statbar">
      <div className="statbar__row">
        <span className="statbar__label">{label}</span>
        <span className="statbar__value">{value}</span>
      </div>
      <div className="statbar__track">
        <span
          className={`statbar__fill statbar__fill--${tone}`}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  )
}

function Analytics({ node, t, lang }: { node: EnrichedNode; t: TFn; lang: string }) {
  const a = useMemo(() => getAnalytics(node), [node])
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'
  const inceptionLabel = new Date(a.inception).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const reactPct = Math.round(a.reactRate * 100)
  const notForMePct = a.views > 0 ? Math.round((a.notForMe / a.views) * 100) : 0
  const lastCumulative = a.reactionsTimeline.at(-1)?.cumulative ?? 0

  return (
    <div className="analytics">
      <div className="analytics__head">
        <span className="analytics__title">{t('panel.analytics')}</span>
        <span className="analytics__since">
          {t('panel.openSince', { days: a.daysOpen })} · {inceptionLabel}
        </span>
      </div>

      <div className="analytics__block">
        <div className="analytics__blockhead">
          <span>{t('panel.reactionsOverTime')}</span>
          <span className="analytics__strong">{lastCumulative}</span>
        </div>
        <Sparkline values={a.reactionsTimeline.map((p) => p.cumulative)} />
      </div>

      <StatBar
        label={t('panel.views')}
        value={String(a.views)}
        pct={100}
        tone="cyan"
      />
      <StatBar
        label={t('panel.reactRate')}
        value={`${reactPct}% · ${a.clickedReact}`}
        pct={reactPct}
        tone="green"
      />
      <StatBar
        label={t('panel.notForMe')}
        value={`${notForMePct}% · ${a.notForMe}`}
        pct={notForMePct}
        tone="red"
      />

      <div className="analytics__grid">
        <div className="ministat">
          <span className="ministat__v">
            {a.housematesOnDibs}/{a.housematesTotal}
          </span>
          <span className="ministat__k">{t('panel.housemates')}</span>
        </div>
        <div className="ministat">
          <span className="ministat__v">{a.preSwiped}</span>
          <span className="ministat__k">{t('panel.preSwiped')}</span>
        </div>
      </div>
    </div>
  )
}

export function ListingPanel({ node, onClose, lang }: ListingPanelProps) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [node?.id])

  if (!node) {
    return null
  }

  const borderColor = panelBorderColor(node.status)
  const postcodeLine = [node.postcode, node.street].filter(Boolean).join(' · ')
  const description = node.bio
  const snippet = description.length > 64 ? `${description.slice(0, 64).trimEnd()}…` : description

  return (
    <aside className="listing-panel" style={{ borderColor }} data-status={node.status}>
      <div className="listing-panel__head">
        <div className="listing-panel__loc">
          <span className="listing-panel__city">
            {t('location.city')} <b>{(node.city || '—').toUpperCase()}</b>
          </span>
          <span className="listing-panel__postcode">
            {postcodeLine || `${t('location.postcode')} · ${t('location.pending')}`}
          </span>
        </div>
        <span className="state-tag" style={{ color: borderColor, borderColor }}>
          {statusTag(node, t)}
        </span>
        <button
          type="button"
          className="listing-panel__close"
          onClick={onClose}
          aria-label={t('panel.close')}
        >
          ×
        </button>
      </div>

      {node.neighborhood && (
        <p className="listing-panel__district">
          {t('location.district')} · <b>{node.neighborhood}</b>
        </p>
      )}

      <p className="listing-panel__name">{node.name || t('panel.unnamed')}</p>

      <button
        type="button"
        className={`listing-panel__desc ${expanded ? 'is-expanded' : ''}`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? description : snippet}
      </button>

      <div
        className="listing-panel__photo"
        style={{ backgroundImage: `url("${node.photo}")` }}
      >
        <span className="listing-panel__photo-tag">{t('panel.staging')}</span>
      </div>

      <Analytics node={node} t={t} lang={lang} />

      <div className="listing-panel__chips">
        <span className="chip chip--verified">✓ {t('panel.verified')}</span>
        <span className="chip chip--insta">◎ @dibshuis</span>
        <span className="chip">ID {node.id.slice(0, 8)}…</span>
      </div>

      <button type="button" className="listing-panel__more">
        {t('panel.seemore')}
      </button>
    </aside>
  )
}
