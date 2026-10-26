import Parser from 'rss-parser';
import { RawFeedItem } from '@/types/feed';

const parser = new Parser({
  headers: {
    'User-Agent': 'AIFeedReader/1.0 (+http://localhost:3000)',
    Accept: 'application/atom+xml, text/xml, */*',
  },
  timeout: 10000,
});

export async function fetchReddit(subreddit: string = 'LocalLLaMA'): Promise<RawFeedItem[]> {
  try {
    const cleanSub = subreddit.replace(/^r\//, '').trim();
    const url = `https://www.reddit.com/r/${cleanSub}/.rss`;

    const feed = await parser.parseURL(url);
    if (!feed.items || feed.items.length === 0) return [];

    return feed.items.map((item) => {
      const postUrl = item.link || '';
      const commentsUrl = item.link || '';
      const cleanSummary = item.contentSnippet || (item.content ? item.content.replace(/<[^>]*>?/gm, '') : null);

      const idMatch = postUrl.match(/comments\/([a-z0-9]+)/i);
      const id = idMatch ? idMatch[1] : Math.random().toString(36).substring(2, 9);

      return {
        id: `reddit_${id}`,
        title: item.title?.trim() || 'Untitled Reddit Post',
        url: postUrl,
        canonical_url: postUrl,
        source_type: 'reddit',
        source_name: `r/${cleanSub}`,
        author: item.author || (item as any)['dc:creator'] || null,
        published_at: item.pubDate || item.isoDate || new Date().toISOString(),
        raw_summary: cleanSummary ? cleanSummary.slice(0, 1000) : null,
        score: 0,
        comments_count: 0,
        comments_url: commentsUrl,
      };
    });
  } catch (err) {
    console.error(`Error fetching Reddit r/${subreddit}:`, err);
    return [];
  }
}
