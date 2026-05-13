import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import NewsStrip from '../components/NewsStrip'
import ResourceCard from '../components/ResourceCard'
import { Resource } from '../types'

export default function Home() {
  const focusRef = useRef<number | null>(null)
  const [newsExpanded, setNewsExpanded] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/resources')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load resources.')
        return r.json() as Promise<Resource[]>
      })
      .then((data) => {
        setResources(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    resources.forEach((r) => {
      if (r.category) counts[r.category] = (counts[r.category] || 0) + 1
    })
    return counts
  }, [resources])

  const filtered = useMemo(() => {
    if (!selectedCategory) return resources
    return resources.filter((r) => r.category === selectedCategory)
  }, [resources, selectedCategory])

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground focusRef={focusRef} />

      <div className="relative z-10 pt-24 pb-16">
        {/* Hero */}
        <div className="text-center mb-10 px-6">
          <h1 className="text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-[#77F2A1] via-white to-[#4F76F6] bg-clip-text text-transparent">
            AI Resources
          </h1>
          <p className="text-white/50 text-lg">Community-curated links for the class</p>
        </div>

        <NewsStrip focusRef={focusRef} onExpandChange={setNewsExpanded} />

        {loading && <p className="text-center text-white/35 text-sm px-6">Loading resources...</p>}
        {error   && <p className="text-center text-red-400 text-sm px-6">{error}</p>}

        {!loading && !error && resources.length === 0 && (
          <p className="text-center text-white/35 text-sm px-6">
            No resources yet —{' '}
            <Link to="/submit" className="text-[#4F76F6] hover:underline">
              submit the first one
            </Link>
            .
          </p>
        )}

        {!loading && !error && resources.length > 0 && (
          <div
            className="flex gap-0 px-6 lg:px-10 transition-opacity duration-300"
            style={{ opacity: newsExpanded ? 0.12 : 1 }}
          >

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <aside className="hidden lg:flex flex-col w-48 shrink-0 mr-8 sticky top-20 self-start">
              <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-4 px-1">
                Categories
              </p>
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left ${
                    selectedCategory === null
                      ? 'bg-gradient-to-r from-[#4F76F6]/20 to-[#77F2A1]/20 border border-[#4F76F6]/30 text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>All</span>
                  <span className="text-xs text-white/30">{resources.length}</span>
                </button>

                {Object.entries(categoryCounts).map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-[#4F76F6]/20 to-[#77F2A1]/20 border border-[#4F76F6]/30 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-xs text-white/30">{count}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* ── Main content ─────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">

              {/* Mobile category pills */}
              <div className="flex lg:hidden gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    selectedCategory === null
                      ? 'bg-gradient-to-r from-[#4F76F6]/20 to-[#77F2A1]/20 border-[#4F76F6]/40 text-white'
                      : 'border-white/10 text-white/50'
                  }`}
                >
                  All
                </button>
                {Object.keys(categoryCounts).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-[#4F76F6]/20 to-[#77F2A1]/20 border-[#4F76F6]/40 text-white'
                        : 'border-white/10 text-white/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((r, index) => (
                    <ResourceCard key={r.id} resource={r} index={index} />
                  ))}
                </div>
              )}

              {filtered.length === 0 && selectedCategory && (
                <p className="text-white/35 text-sm text-center py-12">
                  No {selectedCategory} resources yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
