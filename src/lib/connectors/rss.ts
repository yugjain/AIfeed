import Parser from 'rss-parser';
import { RawFeedItem, SourceType } from '@/types/feed';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; AIFeedReader/1.0; +http://localhost:3000)',
    Accept: 'application/rss+xml, application/atom+xml, text/xml, application/xml, */*',
  },
  timeout: 10000,
});

export async function fetchRssFeed(
  feedUrl: string,
  sourceName: string,
  sourceType: SourceType = 'rss'
): Promise<RawFeedItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    if (!feed.items || feed.items.length === 0) return [];

    return feed.items.slice(0, 25).map((item) => {
      const url = item.link || item.guid || feedUrl;
      const title = item.title || 'Untitled';
      const author = item.creator || item.author || (item as any)['dc:creator'] || null;
      const pubDate = item.pubDate || item.isoDate || new Date().toISOString();
      const summary = item.contentSnippet || item.summary || item.content || null;

      // Extract clean text from summary if HTML
      const cleanSummary = summary ? summary.replace(/<[^>]*>?/gm, '').trim() : null;

      const hashId = Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);

      return {
        id: `rss_${hashId}`,
        title: title.trim(),
        url: url.trim(),
        canonical_url: url.trim(),
        source_type: sourceType,
        source_name: sourceName,
        author: author ? String(author).trim() : null,
        published_at: new Date(pubDate).toISOString(),
        raw_summary: cleanSummary ? cleanSummary.slice(0, 1000) : null,
        score: 0,
        comments_count: 0,
        comments_url: null,
      };
    });
  } catch (err: any) {
    console.warn(`Failed to fetch RSS from ${sourceName} (${feedUrl}): ${err.message || err}`);
    return [];
  }
}
