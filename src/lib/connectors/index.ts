import { getSources, updateSourceLastFetched, upsertFeedItems } from '@/types/../lib/db';
import { RawFeedItem, SourceConfig } from '@/types/feed';
import { fetchHackerNews } from './hn';
import { fetchReddit } from './reddit';
import { fetchGitHubTrending } from './github';
import { fetchLobsters } from './lobsters';
import { fetchArXiv } from './arxiv';
import { fetchRssFeed } from './rss';

export async function fetchFromSource(source: SourceConfig): Promise<RawFeedItem[]> {
  try {
    switch (source.type) {
      case 'hn':
        return await fetchHackerNews(source.url_or_query);
      case 'reddit':
        return await fetchReddit(source.url_or_query);
      case 'github':
        return await fetchGitHubTrending(source.url_or_query);
      case 'lobsters':
        return await fetchLobsters(source.url_or_query);
      case 'arxiv':
        return await fetchArXiv(source.url_or_query);
      case 'producthunt':
        return await fetchRssFeed(source.url_or_query, source.name, 'producthunt');
      case 'rss':
      default:
        return await fetchRssFeed(source.url_or_query, source.name, 'rss');
    }
  } catch (err) {
    console.error(`Error in source ${source.name}:`, err);
    return [];
  }
}

export interface SyncResult {
  totalSources: number;
  successfulSources: number;
  totalFetched: number;
  inserted: number;
  updated: number;
  sourceBreakdown: Record<string, number>;
}

export async function syncAllSources(): Promise<SyncResult> {
  const sources = getSources().filter((s) => s.enabled);
  const breakdown: Record<string, number> = {};
  let totalFetched = 0;
  let successfulSources = 0;
  const allItems: RawFeedItem[] = [];

  // Run all sources in parallel with individual error protection
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const items = await fetchFromSource(source);
      updateSourceLastFetched(source.id);
      return { source, items };
    })
  );

  for (const res of results) {
    if (res.status === 'fulfilled') {
      const { source, items } = res.value;
      successfulSources++;
      breakdown[source.name] = items.length;
      totalFetched += items.length;
      allItems.push(...items);
    }
  }

  const { inserted, updated } = upsertFeedItems(allItems);

  return {
    totalSources: sources.length,
    successfulSources,
    totalFetched,
    inserted,
    updated,
    sourceBreakdown: breakdown,
  };
}
