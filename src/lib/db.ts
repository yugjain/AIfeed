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
    id: 'ph-ai',
    name: 'Product Hunt (AI Product Launches)',
    type: 'producthunt',
    url_or_query: 'https://www.producthunt.com/feed?category=artificial-intelligence',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'rss-bensbites',
    name: "Ben's Bites (Daily Practical AI Products)",
    type: 'rss',
    url_or_query: 'https://www.bensbites.co/feed',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'reddit-chatgpt',
    name: 'Reddit r/ChatGPT (Practical Tips & Prompts)',
    type: 'reddit',
    url_or_query: 'ChatGPT',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'reddit-artificial',
    name: 'Reddit r/artificial (AI News & Uses)',
    type: 'reddit',
    url_or_query: 'artificial',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'hn-ai',
    name: 'Hacker News (Top AI Discussions)',
    type: 'hn',
    url_or_query: 'AI',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'rss-openai',
    name: 'OpenAI News & Announcements',
    type: 'rss',
    url_or_query: 'https://openai.com/news/rss.xml',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'rss-deepmind',
    name: 'Google DeepMind Blog',
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
    name: "Simon Willison's Weblog (Practical AI)",
    type: 'rss',
    url_or_query: 'https://simonwillison.net/atom/everything/',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'rss-latentspace',
    name: 'Latent Space AI Engineering',
    type: 'rss',
    url_or_query: 'https://www.latent.space/feed',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'github-ai-trending',
    name: 'GitHub Trending (AI Tools & Repos)',
    type: 'github',
    url_or_query: 'topic:llm',
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
    id: 'lobsters-ai',
    name: 'Lobste.rs (AI / ML)',
    type: 'lobsters',
    url_or_query: 'ai,ml',
    enabled: true,
    last_fetched_at: null,
  },
  {
    id: 'arxiv-cs',
    name: 'ArXiv (Academic Preprints - Deep Tech)',
    type: 'arxiv',
    url_or_query: 'cat:cs.AI OR cat:cs.CL OR cat:cs.LG',
    enabled: false, // Disabled by default to keep feed practical
    last_fetched_at: null,
  },
];

const DEFAULT_INTERESTS =
  'Prioritize practical AI products, actionable tools, consumer & business apps, new capability unlocks, and real-world workflow speedups. Heavily downrank raw academic preprints, complex mathematical proofs, CUDA kernel optimization, and dense low-level code repositories. Focus on what someone can actually build or use today.';

function loadStore(): FeedStoreSchema {
  if (_store) return _store;

  if (fs.existsSync(STORE_PATH)) {
    try {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      _store = JSON.parse(data);
      if (!_store) throw new Error('Empty store');
      if (!_store.items) _store.items = [];

      // Merge newly added default sources if missing
      if (!_store.sources || _store.sources.length === 0) {
        _store.sources = DEFAULT_SOURCES;
      } else {
        const existingIds = new Set(_store.sources.map((s) => s.id));
        for (const defaultSrc of DEFAULT_SOURCES) {
          if (!existingIds.has(defaultSrc.id)) {
            _store.sources.push(defaultSrc);
          }
        }
        // Ensure arxiv is disabled by default for cleaner feed
        const arxivSrc = _store.sources.find((s) => s.id === 'arxiv-cs');
        if (arxivSrc && arxivSrc.enabled) {
          arxivSrc.enabled = false;
        }
      }

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
        technicality_score: item.source_type === 'arxiv' ? 5 : null,
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
  view?: 'curated' | 'deep_tech' | 'latest' | 'bookmarks';
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

    // Main "curated" feed: strictly exclude dense academic papers and level 4-5 tech
    if (view === 'curated') {
      if (item.source_type === 'arxiv') return false;
      if (item.technicality_score && item.technicality_score >= 4) return false;
    }

    // "deep_tech" feed: specifically shows technical repos, frameworks, and research papers
    if (view === 'deep_tech') {
      const isDeepSource = item.source_type === 'arxiv' || item.source_type === 'github';
      const isHighTech = (item.technicality_score ?? 0) >= 4;
      const isTechCategory = item.ai_category === 'Research & Code' || item.ai_category === 'Developer Stacks';
      if (!isDeepSource && !isHighTech && !isTechCategory) return false;
    }

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
      // Prioritize practical products (low technicality score) + high relevance score
      const techBonusA = (5 - (a.technicality_score ?? 2)) * 10;
      const techBonusB = (5 - (b.technicality_score ?? 2)) * 10;
      const scoreA = (a.ai_relevance_score ?? 60) + techBonusA + Math.min(a.score, 300) * 0.1;
      const scoreB = (b.ai_relevance_score ?? 60) + techBonusB + Math.min(b.score, 300) * 0.1;

      if (Math.abs(scoreA - scoreB) > 5) return scoreB - scoreA;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
  } else if (view === 'deep_tech') {
    filtered.sort((a, b) => {
      const scoreA = (a.ai_relevance_score ?? 50) + Math.min(a.score, 500);
      const scoreB = (b.ai_relevance_score ?? 50) + Math.min(b.score, 500);
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
  const uncurated = store.items.filter(
    (item) => !item.ai_tldr || item.ai_relevance_score === null || item.technicality_score === undefined
  );
  // Prioritize practical sources first
  uncurated.sort((a, b) => {
    const isArXivA = a.source_type === 'arxiv' ? 1 : 0;
    const isArXivB = b.source_type === 'arxiv' ? 1 : 0;
    if (isArXivA !== isArXivB) return isArXivA - isArXivB;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
  return uncurated.slice(0, limit);
}

export function getAllItemsForRecuration(limit: number = 50): FeedItem[] {
  const store = loadStore();
  // Filter items that aren't yet re-scored with technicality_score
  const candidates = store.items.filter((item) => item.technicality_score === undefined || item.technicality_score === null);
  if (candidates.length > 0) {
    return candidates.slice(0, limit);
  }
  // If all scored, return top items to re-tune
  return store.items.slice(0, limit);
}

export function updateItemAI(
  id: string,
  aiData: {
    ai_tldr: string;
    ai_why_it_matters: string;
    ai_category: string;
    ai_relevance_score: number;
    technicality_score?: number;
  }
) {
  const store = loadStore();
  const item = store.items.find((i) => i.id === id);
  if (item) {
    item.ai_tldr = aiData.ai_tldr;
    item.ai_why_it_matters = aiData.ai_why_it_matters;
    item.ai_category = aiData.ai_category;
    item.ai_relevance_score = aiData.ai_relevance_score;
    if (aiData.technicality_score !== undefined) {
      item.technicality_score = aiData.technicality_score;
    }
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
    gemini_model: map['gemini_model'] || 'gemini-3.8-flash',
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
