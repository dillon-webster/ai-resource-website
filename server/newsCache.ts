import { XMLParser } from 'fast-xml-parser'

export interface NewsArticle {
  title: string
  url: string
  date: string
}

export interface NewsSource {
  source: 'anthropic' | 'openai' | 'google'
  articles: NewsArticle[]
}

const FEEDS: Array<{ source: NewsSource['source']; url: string }> = [
  { source: 'anthropic', url: 'https://www.anthropic.com/news' },
  { source: 'openai',    url: 'https://openai.com/news/rss.xml' },
  { source: 'google',    url: 'https://blog.google/technology/ai/rss/' },
]

const MAX_ARTICLES = 5
const CACHE_TTL_MS = 30 * 60 * 1000

interface Cache {
  items: (NewsSource | null)[]
  fetchedAt: number
}

let cache: Cache | null = null

export async function fetchSourceForTest(
  source: NewsSource['source'],
  feedUrl: string
): Promise<NewsSource | null> {
  return fetchSource(source, feedUrl)
}

export function parseAnthropicNewsHtmlForTest(html: string): NewsArticle[] {
  return parseAnthropicNewsHtml(html)
}

async function fetchSource(
  source: NewsSource['source'],
  feedUrl: string
): Promise<NewsSource | null> {
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const text = await res.text()
    if (source === 'anthropic') {
      const articles = parseAnthropicNewsHtml(text)
      if (articles.length === 0) return null
      return { source, articles }
    }
    const xml = text
    const parser = new XMLParser()
    const parsed = parser.parse(xml)
    const channel = parsed?.rss?.channel
    if (!channel) return null
    const rawItems = channel.item
    const items = Array.isArray(rawItems) ? rawItems : [rawItems]
    const articles: NewsArticle[] = items.slice(0, MAX_ARTICLES).map((item: Record<string, unknown>) => ({
      title: String(item.title ?? '').trim(),
      url:   String(item.link ?? '').trim(),
      date:  String(item.pubDate ?? '').trim(),
    }))
    if (articles.length === 0) return null
    return { source, articles }
  } catch {
    return null
  }
}

function parseAnthropicNewsHtml(html: string): NewsArticle[] {
  const articles: NewsArticle[] = []
  const seen = new Set<string>()
  const anchorPattern = /<a\b[^>]*href="(\/news\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/g

  for (const match of html.matchAll(anchorPattern)) {
    const url = `https://www.anthropic.com${match[1]}`
    if (seen.has(url)) continue

    const anchorHtml = match[2]
    const title = extractFirstText(anchorHtml, /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/)
    const date = extractFirstText(anchorHtml, /<time\b[^>]*>([\s\S]*?)<\/time>/)
    if (!title || !date) continue

    seen.add(url)
    articles.push({ title, url, date })
    if (articles.length >= MAX_ARTICLES) break
  }

  return articles
}

function extractFirstText(html: string, pattern: RegExp): string {
  const match = html.match(pattern)
  if (!match) return ''
  return decodeHtml(stripTags(match[1])).trim()
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ')
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
}

export async function getNews(): Promise<(NewsSource | null)[]> {
  const now = Date.now()
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items
  }
  const items = await Promise.all(FEEDS.map(f => fetchSource(f.source, f.url)))
  cache = { items, fetchedAt: now }
  return items
}
