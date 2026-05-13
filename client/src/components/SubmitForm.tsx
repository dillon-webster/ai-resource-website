import { useState } from 'react'
import { Resource } from '../types'
import { parseGithubRepo } from '../utils/parseGithubUrl'

const CATEGORIES = ['Article', 'Video', 'Tool', 'Tutorial', 'Paper', 'Claude Code Plugin', 'Other']

interface FormState {
  title: string
  url: string
  description: string
  category: string
  tags: string
  submitterName: string
}

interface Errors {
  title?: string
  url?: string
}

interface Props {
  onSuccess: (resource: Resource) => void
}

const EMPTY_FORM: FormState = {
  title: '',
  url: '',
  description: '',
  category: '',
  tags: '',
  submitterName: '',
}

export default function SubmitForm({ onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [stars, setStars] = useState<number | undefined>(undefined)
  const [githubRepo, setGithubRepo] = useState<string | undefined>(undefined)
  const [githubStatus, setGithubStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  function validate(): Errors {
    const errs: Errors = {}
    if (!form.title.trim()) errs.title = 'Title is required.'
    if (!form.url.trim() || !/^https?:\/\//i.test(form.url.trim())) {
      errs.url = 'URL must start with http:// or https://'
    }
    return errs
  }

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (field === 'title' || field === 'url') {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
      if (field === 'category') {
        setStars(undefined)
        setGithubRepo(undefined)
        setGithubStatus('idle')
      }
    }
  }

  async function handleUrlBlur() {
    if (form.category !== 'Claude Code Plugin') return
    const parsed = parseGithubRepo(form.url)
    if (!parsed) return

    setGithubStatus('loading')
    try {
      const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json() as {
        name: string
        description: string | null
        stargazers_count: number
        full_name: string
      }
      setForm((prev) => ({
        ...prev,
        title: data.name,
        description: data.description ?? '',
      }))
      setStars(data.stargazers_count)
      setGithubRepo(data.full_name)
      setGithubStatus('idle')
    } catch {
      setGithubStatus('error')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMessage(null)
    setServerError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, stars, githubRepo }),
      })
      const data: Resource | { error: string } = await res.json()

      if (!res.ok) {
        setServerError((data as { error: string }).error || 'Submission failed.')
      } else {
        onSuccess(data as Resource)
        setSuccessMessage('Resource submitted! Thanks for contributing.')
        setForm(EMPTY_FORM)
      }
    } catch {
      setServerError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputBase =
    'w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#4F76F6]/60 focus:ring-1 focus:ring-[#4F76F6]/40 transition'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {successMessage && (
        <div className="rounded-lg px-4 py-3 text-sm text-green-300 bg-green-500/10 border border-green-500/20">
          {successMessage}
        </div>
      )}
      {serverError && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20">
          {serverError}
        </div>
      )}

      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={handleChange('title')}
          placeholder="e.g. Attention Is All You Need"
          className={`${inputBase} bg-white/5`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          {form.category === 'Claude Code Plugin' ? 'GitHub Repo URL' : 'URL'}{' '}
          <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.url}
          onChange={handleChange('url')}
          onBlur={handleUrlBlur}
          placeholder={form.category === 'Claude Code Plugin' ? 'https://github.com/owner/repo' : 'https://...'}
          className={`${inputBase} bg-white/5`}
        />
        {errors.url && <p className="mt-1 text-xs text-red-400">{errors.url}</p>}
        {githubStatus === 'loading' && (
          <p className="mt-1 text-xs text-white/40">Fetching repo info...</p>
        )}
        {githubStatus === 'error' && (
          <p className="mt-1 text-xs text-white/40">Couldn't fetch repo info — fill in manually.</p>
        )}
        {githubStatus === 'idle' && githubRepo && (
          <p className="mt-1 text-xs text-[#77F2A1]/80">✓ {githubRepo} · ★ {stars?.toLocaleString()}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">Description</label>
        <textarea
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Brief summary of what this resource covers..."
          rows={3}
          className={`${inputBase} bg-white/5 resize-none`}
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">Category</label>
        <select
          value={form.category}
          onChange={handleChange('category')}
          className={`${inputBase} bg-[#0a1520]`}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} style={{ background: '#0a1520' }}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          Tags <span className="text-white/30 text-xs">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={form.tags}
          onChange={handleChange('tags')}
          placeholder="e.g. llm, transformers, paper"
          className={`${inputBase} bg-white/5`}
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1.5">
          Your Name <span className="text-white/30 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          value={form.submitterName}
          onChange={handleChange('submitterName')}
          placeholder="Anonymous"
          className={`${inputBase} bg-white/5`}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-lg font-semibold text-sm text-[#1F2B37] bg-[#77F2A1] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {submitting ? 'Submitting...' : 'Submit Resource'}
      </button>
    </form>
  )
}
