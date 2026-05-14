import { useEffect, useRef, useState } from 'react'
import { Resource, Comment } from '../types'

const VOTED_KEY = 'ai-resource-voted-ids'
const NEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000
const COMMENTER_NAME_KEY = 'ai-resource-commenter-name'
const ADMIN_TOKEN_KEY = 'ai-resource-admin-token'

interface Props {
  resource: Resource
  index: number
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function getVotedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveVotedId(id: string) {
  const ids = getVotedIds()
  ids.add(id)
  localStorage.setItem(VOTED_KEY, JSON.stringify([...ids]))
}

export default function ResourceCard({ resource, index }: Props) {
  const cardRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [votes, setVotes] = useState(resource.votes ?? 0)
  const [hasVoted, setHasVoted] = useState(() => getVotedIds().has(resource.id))
  const [voting, setVoting] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [posting, setPosting] = useState(false)
  const [commentName, setCommentName] = useState(() => localStorage.getItem(COMMENTER_NAME_KEY) ?? '')
  const [commentBody, setCommentBody] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY)

  const isNew = Date.now() - new Date(resource.createdAt).getTime() < NEW_THRESHOLD_MS

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setIsVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  async function handleVote() {
    if (hasVoted || voting) return
    setVoting(true)
    setVotes((v) => v + 1)
    setHasVoted(true)
    saveVotedId(resource.id)
    try {
      const res = await fetch(`/api/resources/${resource.id}/vote`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json() as { votes: number }
        setVotes(data.votes)
      } else {
        setVotes((v) => v - 1)
        setHasVoted(false)
      }
    } catch {
      setVotes((v) => v - 1)
      setHasVoted(false)
    } finally {
      setVoting(false)
    }
  }

  async function fetchComments() {
    try {
      const res = await fetch(`/api/resources/${resource.id}/comments`)
      if (res.ok) setComments(await res.json() as Comment[])
    } finally {
      setCommentsLoaded(true)
    }
  }

  function toggleComments() {
    setCommentsOpen((prev) => {
      if (!prev && !commentsLoaded) void fetchComments()
      return !prev
    })
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setCommentError(null)
    const trimmedName = commentName.trim()
    const trimmedBody = commentBody.trim()
    if (!trimmedName || !trimmedBody) return
    setPosting(true)
    try {
      const res = await fetch(`/api/resources/${resource.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: trimmedName, body: trimmedBody }),
      })
      const data = await res.json().catch(() => null) as Comment | { error?: string } | null
      if (res.ok && data) {
        setComments((prev) => [...prev, data as Comment])
        setCommentBody('')
        localStorage.setItem(COMMENTER_NAME_KEY, trimmedName)
      } else {
        setCommentError((data as { error?: string } | null)?.error ?? 'Failed to post.')
      }
    } catch {
      setCommentError('Failed to post.')
    } finally {
      setPosting(false)
    }
  }

  async function handleDeleteComment(id: string) {
    if (!adminToken) return
    setDeletingCommentId(id)
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': encodeURIComponent(adminToken) },
      })
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeletingCommentId(null)
    }
  }

  return (
    <article
      ref={cardRef}
      className={`rounded-xl p-5 border transition-all duration-500 ease-out hover:border-[#4F76F6]/60 hover:shadow-[0_0_28px_rgba(79,118,246,0.18)] group flex flex-col gap-3 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{
        background: 'rgba(31, 43, 55, 0.95)',
        borderColor: 'rgba(255,255,255,0.08)',
        transitionDelay: isVisible ? `${Math.min(index % 3, 2) * 70}ms` : '0ms',
      }}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-base font-semibold text-white group-hover:text-[#4F76F6] transition-colors leading-snug">
            {resource.title}
          </h2>
          {isNew && (
            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#77F2A1]/15 text-[#77F2A1] border border-[#77F2A1]/30">
              New
            </span>
          )}
        </div>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#4F76F6]/80 hover:text-[#77F2A1] transition-colors block truncate"
        >
          {resource.url}
        </a>
      </div>

      {resource.description && (
        <p className="text-sm text-white/55 leading-relaxed">{resource.description}</p>
      )}

      {(resource.category || (resource.tags && resource.tags.length > 0)) && (
        <div className="flex flex-wrap gap-1.5">
          {resource.category && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white/80 bg-[#4F76F6]/20 border border-[#4F76F6]/30">
              {resource.category}
            </span>
          )}
          {resource.tags?.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full text-white/50 bg-white/5 border border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-white/35 mt-auto pt-1">
        <span>{resource.submitterName ? `by ${resource.submitterName}` : ''}</span>
        <div className="flex items-center gap-3">
          {resource.stars !== undefined && resource.stars > 0 && (
            <span className="text-[#77F2A1]/70">★ {resource.stars.toLocaleString()}</span>
          )}
          <button
            onClick={handleVote}
            disabled={hasVoted || voting}
            title={hasVoted ? 'Already voted' : 'Upvote'}
            className={`flex items-center gap-1 transition-colors ${
              hasVoted
                ? 'text-[#77F2A1]/80 cursor-default'
                : 'hover:text-[#77F2A1] cursor-pointer'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 1L11 7H7.5V11H4.5V7H1L6 1Z" />
            </svg>
            <span>{votes}</span>
          </button>
          <button
            onClick={toggleComments}
            title={commentsOpen ? 'Hide comments' : 'Show comments'}
            className={`flex items-center gap-1 transition-colors cursor-pointer ${
              commentsOpen ? 'text-[#4F76F6]' : 'hover:text-[#4F76F6]'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M1 1.5h10v6.5H7L4.5 11V8H1V1.5z" />
            </svg>
            {commentsLoaded && <span>{comments.length}</span>}
          </button>
          <span>{timeAgo(resource.createdAt)}</span>
        </div>
      </div>

      {commentsOpen && (
        <div className="border-t border-white/[0.08] pt-3 mt-1 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Comments</span>
            <button
              onClick={toggleComments}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              Hide ↑
            </button>
          </div>

          {!commentsLoaded && (
            <p className="text-xs text-white/30">Loading comments…</p>
          )}

          {commentsLoaded && comments.length === 0 && (
            <p className="text-xs text-white/30">No comments yet.</p>
          )}

          {commentsLoaded && comments.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-semibold text-white/70">{comment.authorName}</span>
                      <span className="text-[10px] text-white/25">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{comment.body}</p>
                  </div>
                  {adminToken && (
                    <button
                      onClick={() => void handleDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id}
                      title="Delete comment"
                      className="shrink-0 mt-0.5 text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/[0.06] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-2">Add a comment</p>
          <form onSubmit={(e) => void handlePost(e)} className="flex flex-col gap-2">
            <input
              type="text"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="First name *"
              maxLength={50}
              className="w-full px-2.5 py-1.5 rounded text-xs text-white placeholder-white/25 bg-white/5 border border-white/10 focus:outline-none focus:border-[#4F76F6]/60 focus:ring-1 focus:ring-[#4F76F6]/40 transition"
            />
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Leave a comment…"
              maxLength={1000}
              rows={2}
              className="w-full px-2.5 py-1.5 rounded text-xs text-white placeholder-white/25 bg-white/5 border border-white/10 focus:outline-none focus:border-[#4F76F6]/60 focus:ring-1 focus:ring-[#4F76F6]/40 transition resize-none"
            />
            {commentError && <p className="text-xs text-red-400">{commentError}</p>}
            <button
              type="submit"
              disabled={posting || !commentName.trim() || !commentBody.trim()}
              className="self-end px-3 py-1.5 rounded text-xs font-medium text-[#1F2B37] bg-[#77F2A1] hover:opacity-90 disabled:opacity-40 transition"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </form>
          </div>
        </div>
      )}
    </article>
  )
}
