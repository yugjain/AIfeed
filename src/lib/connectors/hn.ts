import { RawFeedItem } from '@/types/feed';

export async function fetchHackerNews(query: string = 'AI'): Promise<RawFeedItem[]> {
  try {
    const aiKeywords = [
      'ai', 'llm', 'gpt', 'claude', 'gemini', 'deepseek', 'model', 'agent',
      'transformer', 'machine learning', 'neural', 'openai', 'anthropic',
      'weights', 'inference', 'rag', 'embedding', 'diffusion'
    ];

    // Fetch frontpage + AI search concurrently
    const [frontRes, searchRes] = await Promise.all([
      fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30', {
        headers: { 'User-Agent': 'AIFeed/1.0' },
      }),
      fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query || 'AI')}&tags=story&hitsPerPage=30`, {
        headers: { 'User-Agent': 'AIFeed/1.0' },
      }),
    ]);

    const frontData = frontRes.ok ? await frontRes.json() : { hits: [] };
    const searchData = searchRes.ok ? await searchRes.json() : { hits: [] };

    const hits: any[] = [];
    const seen = new Set<string>();

    // Include frontpage stories that mention AI/LLM topics
    for (const h of frontData.hits || []) {
      if (!h.title || seen.has(h.objectID)) continue;
      const lower = h.title.toLowerCase();
      if (aiKeywords.some((k) => lower.includes(k))) {
        hits.push(h);
        seen.add(h.objectID);
      }
    }

    // Add query hits
    for (const h of searchData.hits || []) {
      if (!h.title || seen.has(h.objectID)) continue;
      hits.push(h);
      seen.add(h.objectID);
    }

    return hits.map((h) => {
      const itemUrl = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
      const commentsUrl = `https://news.ycombinator.com/item?id=${h.objectID}`;

      return {
        id: `hn_${h.objectID}`,
        title: h.title,
        url: itemUrl,
        canonical_url: h.url || commentsUrl,
        source_type: 'hn',
        source_name: 'Hacker News',
        author: h.author || null,
        published_at: h.created_at || new Date().toISOString(),
        raw_summary: h.story_text || null,
        score: h.points || 0,
        comments_count: h.num_comments || 0,
        comments_url: commentsUrl,
      };
    });
  } catch (err) {
    console.error('Error fetching Hacker News:', err);
    return [];
  }
}
