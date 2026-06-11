import { useEffect, useRef, useState } from 'react'
import type { TimeWindow } from './ViewSettings'
import { useT } from '../i18n'

interface TimelineProps {
  timeWindow: TimeWindow
  asOf: number
  onAsOf: (ts: number) => void
  lang: string
}

const DAYS: Record<Exclude<TimeWindow, 'live'>, number> = { '7d': 7, '30d': 30, '90d': 90 }

export function Timeline({ timeWindow, asOf, onAsOf, lang }: TimelineProps) {
  const t = useT()
  const rafRef = useRef<number | null>(null)
  const [playing, setPlaying] = useState(false)

  const now = Date.now()
  const days = timeWindow === 'live' ? 30 : DAYS[timeWindow]
  const min = now - days * 86_400_000
  const max = now
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'
  const atNow = asOf >= max - 1000

  const stop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setPlaying(false)
  }

  useEffect(() => stop, [])

  const play = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
    }
    setPlaying(true)
    const startTs = asOf >= max - 1000 ? min : asOf
    const startWall = performance.now()
    const durationMs = 6000
    const step = (wall: number) => {
      const progress = Math.min(1, (wall - startWall) / durationMs)
      onAsOf(startTs + (max - startTs) * progress)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        setPlaying(false)
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  return (
    <div className="timeline">
      <button
        type="button"
        className="timeline__play"
        onClick={() => (playing ? stop() : play())}
        aria-label={t('timeline.play')}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <input
        className="timeline__range"
        type="range"
        min={min}
        max={max}
        step={3_600_000}
        value={Math.min(Math.max(asOf, min), max)}
        onChange={(e) => {
          stop()
          onAsOf(Number(e.target.value))
        }}
      />
      <span className="timeline__label">
        {atNow
          ? t('timeline.now')
          : new Date(asOf).toLocaleDateString(locale, {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
      </span>
      {!atNow && (
        <button
          type="button"
          className="timeline__now"
          onClick={() => {
            stop()
            onAsOf(max)
          }}
        >
          {t('timeline.tonow')}
        </button>
      )}
    </div>
  )
}
