import { useEffect, useState } from 'react'
import { Resource } from '../types'

const TOKEN_STORAGE_KEY = 'ai-resource-admin-token'

export default function Admin() {
  const [tokenInput, setTokenInput] = useState('')
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? '')
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadResources() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/resources')
      if (!res.ok) throw new Error('Failed to load resources.')
      setResources(await res.json() as Resource[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (adminToken) {
      void loadResources()
    }
  }, [adminToken])

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = tokenInput.trim()
    if (!trimmed) return
    sessionStorage.setItem(TOKEN_STORAGE_KEY, trimmed)
    setAdminToken(trimmed)
    setTokenInput('')
  }

  function handleLock() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    setAdminToken('')
    setResources([])
    setError(null)
  }

  async function handleDelete(resource: Resource) {
    const confirmed = window.confirm(`Delete "${resource.title}"?`)
    if (!confirmed) return

    setDeletingId(resource.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/resources/${resource.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Delete failed.' })) as { error?: string }
        throw new Error(data.error ?? 'Delete failed.')
      }
      setResources((prev) => prev.filter((item) => item.id !== resource.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!adminToken) {
    return (
      <main
        className="min-h-screen pt-24 pb-16 px-6"
        style={{
          background:
            'radial-gradient(ellipse at 15% 60%, rgba(119,242,161,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 40%, rgba(79,118,246,0.07) 0%, transparent 55%), #0a1520',
        }}
      >
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-white">Admin</h1>
          <p className="text-white/45 text-sm mb-8">Enter the admin token to manage submitted resources.</p>

          <form
            onSubmit={handleUnlock}
            className="rounded-2xl p-6 border border-white/10 bg-[#1f2b37]/90 space-y-4"
          >
            <label className="block text-sm text-white/70">
              Admin token
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="mt-2 w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 border border-white/10 bg-white/5 focus:outline-none focus:border-[#4F76F6]/60 focus:ring-1 focus:ring-[#4F76F6]/40 transition"
                placeholder="Paste token"
              />
            </label>
            <button
              type="submit"
              className="w-full py-3 rounded-lg font-semibold text-sm text-[#1F2B37] bg-[#77F2A1] hover:opacity-90 transition"
            >
              Unlock Admin
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-6 bg-[#0a1520]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">Admin</h1>
            <p className="text-white/45 text-sm">Delete resources from the public list.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadResources()}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 transition"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={handleLock}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 border border-white/10 hover:text-white hover:bg-white/5 transition"
            >
              Lock
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg px-4 py-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1f2b37]/80">
          {resources.length === 0 && !loading ? (
            <p className="px-5 py-10 text-center text-sm text-white/40">No resources found.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {resources.map((resource) => (
                <div key={resource.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-base font-semibold text-white truncate">{resource.title}</h2>
                      {resource.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-white/75 bg-[#4F76F6]/20 border border-[#4F76F6]/30">
                          {resource.category}
                        </span>
                      )}
                    </div>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-[#4F76F6]/80 hover:text-[#77F2A1] truncate"
                    >
                      {resource.url}
                    </a>
                    {resource.description && (
                      <p className="mt-2 text-sm text-white/50 line-clamp-2">{resource.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(resource)}
                    disabled={deletingId === resource.id}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-red-200 border border-red-400/20 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 transition"
                  >
                    {deletingId === resource.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
