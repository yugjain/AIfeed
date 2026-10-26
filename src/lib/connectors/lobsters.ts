import { RawFeedItem } from '@/types/feed';

export async function fetchLobsters(tags: string = 'ai,ml'): Promise<RawFeedItem[]> {
  try {
    const tagList = tags.split(',').map((t) => t.trim());
    const allItems: RawFeedItem[] = [];

    for (const tag of tagList) {
      const url = `https://lobste.rs/t/${tag}.json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AIFeed/1.0' },
      });

      if (!res.ok) continue;

      const posts: any[] = await res.json();
      for (const p of posts) {
        allItems.push({
          id: `lobsters_${p.short_id}`,
          title: p.title,
          url: p.url || p.comments_url,
          canonical_url: p.url || p.comments_url,
          source_type: 'lobsters',
          source_name: 'Lobste.rs',
          author: p.submitter_user || null,
          published_at: p.created_at || new Date().toISOString(),
          raw_summary: p.description ? p.description.slice(0, 1000) : null,
          score: p.score || 0,
          comments_count: p.comment_count || 0,
          comments_url: p.comments_url,
        });
      }
    }

    return allItems;
  } catch (err) {
    console.error('Error fetching Lobsters:', err);
    return [];
  }
}
