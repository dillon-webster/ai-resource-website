export interface Resource {
  id: string
  title: string
  url: string
  description?: string
  category?: string
  tags?: string[]
  submitterName?: string
  createdAt: string
}

export interface NewsArticle {
  title: string
  url: string
  date: string
}

export interface NewsSource {
  source: 'anthropic' | 'openai' | 'google'
  articles: NewsArticle[]
}
