import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { NewsSource } from '../types'

const SOURCE_CONFIG: Record<
  NewsSource['source'],
  { label: string; color: string; logoIndex: number }
> = {
  anthropic: { label: 'Anthropic', color: '#ff6b35', logoIndex: 0 },
  google:    { label: 'Google AI', color: '#EA4335', logoIndex: 1 },
  openai:    { label: 'OpenAI',    color: '#4F76F6', logoIndex: 2 },
}

const SOURCES: NewsSource['source'][] = ['anthropic', 'google', 'openai']

interface Props {
  focusRef: MutableRefObject<number | null>
  onExpandChange: (expanded: boolean) => void
}

export default function NewsStrip({ focusRef, onExpandChange }: Props) {
  const [sources, setSources] = useState<(NewsSource | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<NewsSource['source'] | null>(null)
  const [selectedSource, setSelectedSource] = useState<NewsSource['source']>('anthropic')

  // expandTimer: delays showing extra articles (intent confirmation)
  // leaveTimer: delays releasing camera focus (smooths card-to-card transition)
  const expandTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/news')
      .then((r) => {
        if (!r.ok) throw new Error('failed')
        return r.json() as Promise<(NewsSource | null)[]>
      })
      .then((data) => {
        setSources(data)
        setSelectedSource(data.find((source) => source?.articles?.length)?.source ?? 'anthropic')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="px-6 lg:px-10 mb-8">
        <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-3">
          Latest from the Labs
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const selectedConfig = SOURCE_CONFIG[selectedSource]
  const selectedData = sources.find((s) => s?.source === selectedSource) ?? null
  const selectedArticles = selectedData?.articles ?? []

  return (
    <div className="px-6 lg:px-10 mb-8">
      <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-3">
        Latest from the Labs
      </p>

      <div className="sm:hidden">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1">
          {SOURCES.map((source) => {
            const cfg = SOURCE_CONFIG[source]
            const isSelected = selectedSource === source

            return (
              <button
                key={source}
                type="button"
                onClick={() => setSelectedSource(source)}
                className="min-h-9 rounded-md px-2 text-[11px] font-semibold transition-colors"
                style={{
                  color: isSelected ? cfg.color : 'rgba(255,255,255,0.55)',
                  background: isSelected ? `${cfg.color}1f` : 'transparent',
                  border: `1px solid ${isSelected ? `${cfg.color}66` : 'transparent'}`,
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>

        <div
          className="mt-3 overflow-hidden rounded-lg border bg-white/[0.04]"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            borderLeftColor: selectedConfig.color,
            borderLeftWidth: '2px',
          }}
        >
          {selectedArticles.length > 0 ? (
            selectedArticles.map((article, index) => (
              <a
                key={`${article.url}-${index}`}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block px-4 py-3 transition-colors hover:bg-white/[0.05]"
                style={{
                  borderTop: index > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                }}
              >
                {index === 0 && (
                  <span
                    className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: selectedConfig.color }}
                  >
                    Latest
                  </span>
                )}
                <p className="text-sm leading-snug text-white/75 transition-colors group-hover:text-white">
                  {article.title}
                </p>
                <p className="mt-1 text-xs text-white/30">
                  {new Date(article.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </a>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-white/30">No recent news</p>
          )}
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-3 gap-3 items-start">
        {SOURCES.map((source) => {
          const cfg      = SOURCE_CONFIG[source]
          const data     = sources.find((s) => s?.source === source) ?? null
          const articles = data?.articles ?? []
          const isOpen   = hovered === source

          return (
            <div
              key={source}
              onMouseEnter={() => {
                if (leaveTimer.current) clearTimeout(leaveTimer.current)
                if (expandTimer.current) clearTimeout(expandTimer.current)
                expandTimer.current = setTimeout(() => {
                  focusRef.current = cfg.logoIndex
                  setHovered(source)
                  onExpandChange(true)
                }, 220)
              }}
              onMouseLeave={() => {
                if (expandTimer.current) clearTimeout(expandTimer.current)
                setHovered(null)
                onExpandChange(false)
                leaveTimer.current = setTimeout(() => { focusRef.current = null }, 200)
              }}
              className="relative rounded-xl bg-white/[0.04] border border-white/[0.07] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12]"
              style={{
                borderLeftColor: cfg.color,
                borderLeftWidth: '2px',
                opacity: hovered && !isOpen ? 0.15 : 1,
              }}
            >
              {/* Company label */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                {articles.length > 1 && (
                  <span
                    className="text-[10px] text-white/30 transition-opacity duration-300"
                    style={{ opacity: isOpen ? 0 : 1 }}
                  >
                    ↓ {articles.length - 1} more
                  </span>
                )}
              </div>

              {/* Latest article — always a link */}
              {articles[0] ? (
                <a
                  href={articles[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-1 px-4 pb-3 transition-colors"
                >
                  <p className="text-sm text-white/75 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                    {articles[0].title}
                  </p>
                  <p className="text-xs text-white/30">
                    {new Date(articles[0].date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </a>
              ) : (
                <p className="text-sm text-white/30 px-4 pb-3">No recent news</p>
              )}

              {/* Extra articles — absolutely positioned so they float over content below */}
              <div
                className="absolute left-0 right-0 overflow-hidden transition-all duration-300 ease-in-out z-20 rounded-b-xl border-x border-b border-white/[0.07]"
                style={{
                  top: '100%',
                  maxHeight: isOpen ? `${articles.slice(1).length * 90}px` : '0px',
                  borderLeftColor: cfg.color,
                  borderLeftWidth: '2px',
                  background: 'rgba(10, 21, 32, 0.85)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {articles.slice(1).map((article, i) => (
                  <a
                    key={i}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-1 px-4 py-3 border-t border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                  >
                    <p className="text-sm text-white/60 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                      {article.title}
                    </p>
                    <p className="text-xs text-white/25">
                      {new Date(article.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
