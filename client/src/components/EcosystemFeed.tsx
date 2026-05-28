import { useEffect, useState } from 'react'
import { EcosystemArticle } from '../types'

export default function EcosystemFeed() {
  const [articles, setArticles] = useState<EcosystemArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/news/ecosystem')
      .then((r) => {
        if (!r.ok) throw new Error('failed')
        return r.json() as Promise<EcosystemArticle[]>
      })
      .then((data) => {
        setArticles(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (!loading && articles.length === 0) return null

  return (
    <div className="px-6 lg:px-10 mb-8 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-full border border-white/[0.10] bg-white/[0.04] px-5 py-2 hover:bg-white/[0.07] hover:border-white/[0.18] transition-all"
      >
        <span className="text-xs font-semibold text-white/45 uppercase tracking-widest">
          AI in the News
        </span>
        <span className="flex items-center gap-1.5">
          {!loading && (
            <span className="text-xs text-white/25">{articles.length} articles</span>
          )}
          <svg
            className="w-3.5 h-3.5 text-white/30 transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      <div
        className="w-full overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? `${articles.length * 52}px` : '0px' }}
      >
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 mx-4 my-2 rounded-lg bg-white/5 animate-pulse" />
              ))
            : articles.map((article, i) => (
                <a
                  key={`${article.url}-${i}`}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined }}
                >
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: article.sourceColor, background: `${article.sourceColor}22` }}
                  >
                    {article.sourceLabel}
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-white/70 leading-snug group-hover:text-white transition-colors line-clamp-1">
                    {article.title}
                  </span>
                  <span className="shrink-0 text-xs text-white/25">
                    {new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </a>
              ))}
        </div>
      </div>
      </div>
    </div>
  )
}
