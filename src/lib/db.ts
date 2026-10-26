import path from 'path';
import fs from 'fs';
import { FeedItem, RawFeedItem, SourceConfig, UserSettings, ExecutiveBriefing } from '@/types/feed';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const STORE_PATH = path.join(DATA_DIR, 'feed_store.json');

interface FeedStoreSchema {
  items: FeedItem[];
  sources: SourceConfig[];
  settings: Record<string, string>;
}

let _store: FeedStoreSchema | null = null;

const DEFAULT_SOURCES: SourceConfig[] = [
  {
    id: 'hn-ai',
    name: 'Hacker News (AI Top & Recent)',
    type: 'hn',
    url_or_query: 'AI OR LLM OR GPT OR Claude OR Gemini OR "deep learning" OR "machine learning"',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'reddit-localllama',
    name: 'Reddit r/LocalLLaMA',
    type: 'reddit',
    url_or_query: 'LocalLLaMA',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'reddit-machinelearning',
    name: 'Reddit r/MachineLearning',
    type: 'reddit',
    url_or_query: 'MachineLearning',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'github-ai-trending',
    name: 'GitHub Trending (AI & LLMs)',
    type: 'github',
    url_or_query: 'topic:llm OR topic:ai OR topic:machine-learning',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'lobsters-ai',
    name: 'Lobste.rs (AI / ML)',
    type: 'lobsters',
    url_or_query: 'ai,ml',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'arxiv-cs',
    name: 'ArXiv (AI, Language & Learning)',
    type: 'arxiv',
    url_or_query: 'cat:cs.AI OR cat:cs.CL OR cat:cs.LG',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'rss-openai',
    name: 'OpenAI News & Research',
    type: 'rss',
    url_or_query: 'https://openai.com/news/rss.xml',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'rss-deepmind',
    name: 'Google DeepMind Research Blog',
    type: 'rss',
    url_or_query: 'https://deepmind.google/blog/rss.xml',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'rss-huggingface',
    name: 'Hugging Face Blog',
    type: 'rss',
    url_or_query: 'https://huggingface.co/blog/feed.xml',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'rss-simonw',
    name: "Simon Willison's Weblog",
    type: 'rss',
    url_or_query: 'https://simonwillison.net/atom/everything/',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'rss-latentspace',
    name: 'Latent Space Podcast & Substack',
    type: 'rss',
    url_or_query: 'https://www.latent.space/feed',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'ph-ai',
    name: 'Product Hunt (AI Launches)',
    type: 'producthunt',
    url_or_query: 'https://www.producthunt.com/feed?category=artificial-intelligence',
    enabled: true,
    last_fetched_at: null,
  },
];

const DEFAULT_INTERESTS =
  'Focus on high-signal AI developments: state-of-the-art open-weights and proprietary models, coding agents and developer workflows, frontier research papers with practical code, breakthroughs in inference efficiency, local LLM tooling, and notable AI product launches. Downrank generic marketing fluff, repetitive crypto-AI press releases, and shallow listicles.';

function loadStore(): FeedStoreSchema {
  if (_store) return _store;

  if (fs.existsSync(STORE_PATH)) {
    try {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      _store = JSON.parse(data);
      if (!_store) throw new Error('Empty store');
      if (!_store.items) _store.items = [];
      if (!_store.sources || _store.sources.length === 0) _store.sources = DEFAULT_SOURCES;
      if (!_store.settings) {
        _store.settings = {
          user_interests_prompt: DEFAULT_INTERESTS,
          gemini_model: 'gemini-3.8-flash',
        };
      }
      return _store;
    } catch (e) {
      console.warn('Could not parse feed store, initializing fresh store:', e);
    }
  }

  _store = {
    items: [],
    sources: DEFAULT_SOURCES,
    settings: {
      user_interests_prompt: DEFAULT_INTERESTS,
      gemini_model: 'gemini-3.8-flash',
    },
  };
  saveStore();
  return _store;
}

let saveTimeout: NodeJS.Timeout | null = null;
function saveStore(immediate = false) {
  if (!_store) return;

  const performSave = () => {
    try {
      const tempPath = `${STORE_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(_store, null, 2), 'utf-8');
      fs.renameSync(tempPath, STORE_PATH);
    } catch (err) {
      console.error('Failed to save feed store:', err);
    }
  };

  if (immediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    performSave();
  } else {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(performSave, 500);
  }
}

export function cleanCanonicalUrl(rawUrl: string): string {
  try {
    const urlObj = new URL(rawUrl.trim());
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'fbclid',
      'gclid',
    ];
    trackingParams.forEach((param) => urlObj.searchParams.delete(param));
    let cleaned = urlObj.toString();
    if (cleaned.endsWith('/') && urlObj.pathname !== '/') {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  } catch {
    return rawUrl.trim();
  }
}

export function upsertFeedItems(rawItems: RawFeedItem[]): { inserted: number; updated: number } {
  const store = loadStore();
  let inserted = 0;
  let updated = 0;

  const canonicalMap = new Map<string, FeedItem>();
  store.items.forEach((item) => {
    canonicalMap.set(item.canonical_url, item);
  });

  for (const item of rawItems) {
    const canonical = cleanCanonicalUrl(item.canonical_url || item.url);
    const existing = canonicalMap.get(canonical);

    if (!existing) {
      const id = item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newItem: FeedItem = {
        id,
        title: item.title.trim(),
        url: item.url.trim(),
        canonical_url: canonical,
        source_type: item.source_type,
        source_name: item.source_name,
        author: item.author || null,
        published_at: item.published_at || new Date().toISOString(),
        raw_summary: item.raw_summary ? item.raw_summary.slice(0, 1500) : null,
        score: item.score || 0,
        comments_count: item.comments_count || 0,
        comments_url: item.comments_url || null,
        ai_tldr: null,
        ai_why_it_matters: null,
        ai_category: null,
        ai_relevance_score: null,
        is_bookmarked: false,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      store.items.push(newItem);
      canonicalMap.set(canonical, newItem);
      inserted++;
    } else {
      existing.score = Math.max(existing.score || 0, item.score || 0);
      existing.comments_count = Math.max(existing.comments_count || 0, item.comments_count || 0);
      if (item.comments_url && !existing.comments_url) existing.comments_url = item.comments_url;
      if (item.raw_summary && !existing.raw_summary) {
        existing.raw_summary = item.raw_summary.slice(0, 1500);
      }
      updated++;
    }
  }

  saveStore();
  return { inserted, updated };
}

export interface GetFeedOptions {
  view?: 'curated' | 'latest' | 'bookmarks';
  source?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function getFeedItems(options: GetFeedOptions = {}): { items: FeedItem[]; total: number } {
  const store = loadStore();
  const {
    view = 'curated',
    source,
    category,
    search,
    limit = 50,
    offset = 0,
  } = options;

  let filtered = store.items.filter((item) => {
    if (view === 'bookmarks' && !item.is_bookmarked) return false;
    if (source && source !== 'all' && item.source_type !== source) return false;
    if (category && category !== 'all' && item.ai_category !== category) return false;

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.raw_summary?.toLowerCase().includes(q) ?? false;
      const matchTldr = item.ai_tldr?.toLowerCase().includes(q) ?? false;
      const matchWhy = item.ai_why_it_matters?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchSummary && !matchTldr && !matchWhy) return false;
    }

    return true;
  });

  // Sort
  if (view === 'curated') {
    filtered.sort((a, b) => {
      const scoreA = (a.ai_relevance_score ?? 0) * 10 + Math.min(a.score, 500);
      const scoreB = (b.ai_relevance_score ?? 0) * 10 + Math.min(b.score, 500);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
  } else {
    filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  }

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);

  return { items, total };
}

export function getUncuratedItems(limit: number = 30): FeedItem[] {
  const store = loadStore();
  const uncurated = store.items.filter((item) => !item.ai_tldr || item.ai_relevance_score === null);
  uncurated.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
  return uncurated.slice(0, limit);
}

export function updateItemAI(
  id: string,
  aiData: {
    ai_tldr: string;
    ai_why_it_matters: string;
    ai_category: string;
    ai_relevance_score: number;
  }
) {
  const store = loadStore();
  const item = store.items.find((i) => i.id === id);
  if (item) {
    item.ai_tldr = aiData.ai_tldr;
    item.ai_why_it_matters = aiData.ai_why_it_matters;
    item.ai_category = aiData.ai_category;
    item.ai_relevance_score = aiData.ai_relevance_score;
    saveStore();
  }
}

export function toggleBookmark(id: string): boolean {
  const store = loadStore();
  const item = store.items.find((i) => i.id === id);
  if (!item) return false;
  item.is_bookmarked = !item.is_bookmarked;
  saveStore(true);
  return item.is_bookmarked;
}

export function getSources(): SourceConfig[] {
  const store = loadStore();
  return store.sources;
}

export function toggleSource(id: string, enabled: boolean) {
  const store = loadStore();
  const source = store.sources.find((s) => s.id === id);
  if (source) {
    source.enabled = enabled;
    saveStore(true);
  }
}

export function updateSourceLastFetched(id: string) {
  const store = loadStore();
  const source = store.sources.find((s) => s.id === id);
  if (source) {
    source.last_fetched_at = new Date().toISOString();
    saveStore();
  }
}

export function addSource(source: Omit<SourceConfig, 'last_fetched_at'>) {
  const store = loadStore();
  const existingIdx = store.sources.findIndex((s) => s.id === source.id);
  const newSource: SourceConfig = {
    ...source,
    last_fetched_at: null,
  };
  if (existingIdx >= 0) {
    store.sources[existingIdx] = newSource;
  } else {
    store.sources.push(newSource);
  }
  saveStore(true);
}

export function deleteSource(id: string) {
  const store = loadStore();
  store.sources = store.sources.filter((s) => s.id !== id);
  saveStore(true);
}

export function getSettings(): UserSettings {
  const store = loadStore();
  const map = store.settings || {};

  let briefing: ExecutiveBriefing | null = null;
  if (map['executive_briefing']) {
    try {
      briefing = JSON.parse(map['executive_briefing']);
    } catch {
      briefing = null;
    }
  }

  return {
    user_interests_prompt: map['user_interests_prompt'] || DEFAULT_INTERESTS,
    gemini_model: map['gemini_model'] || 'gemini-2.5-flash',
    gemini_api_key: map['gemini_api_key'] || process.env.GEMINI_API_KEY || '',
    executive_briefing: briefing,
  };
}

export function setSetting(key: string, value: string) {
  const store = loadStore();
  if (!store.settings) store.settings = {};
  store.settings[key] = value;
  saveStore(true);
}
