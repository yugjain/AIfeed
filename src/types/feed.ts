export type SourceType =
  | 'hn'
  | 'reddit'
  | 'github'
  | 'lobsters'
  | 'arxiv'
  | 'rss'
  | 'producthunt';

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  canonical_url: string;
  source_type: SourceType;
  source_name: string;
  author: string | null;
  published_at: string;
  raw_summary: string | null;
  score: number;
  comments_count: number;
  comments_url: string | null;
  ai_tldr: string | null;
  ai_why_it_matters: string | null;
  ai_category: string | null;
  ai_relevance_score: number | null;
  is_bookmarked: boolean;
  is_read: boolean;
  created_at: string;
}

export interface RawFeedItem {
  id?: string;
  title: string;
  url: string;
  canonical_url?: string;
  source_type: SourceType;
  source_name: string;
  author?: string | null;
  published_at: string;
  raw_summary?: string | null;
  score?: number;
  comments_count?: number;
  comments_url?: string | null;
}

export interface SourceConfig {
  id: string;
  name: string;
  type: SourceType;
  url_or_query: string;
  enabled: boolean;
  last_fetched_at: string | null;
}

export interface ExecutiveBriefing {
  date: string;
  content: string;
  generated_at: string;
}

export interface UserSettings {
  user_interests_prompt: string;
  gemini_model: string;
  gemini_api_key?: string;
  executive_briefing?: ExecutiveBriefing | null;
}
