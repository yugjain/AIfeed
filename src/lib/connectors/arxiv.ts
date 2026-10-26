import Parser from 'rss-parser';
import { RawFeedItem } from '@/types/feed';

const parser = new Parser({
  customFields: {
    item: [
      ['arxiv:comment', 'comment'],
      ['arxiv:primary_category', 'primaryCategory', { keepArray: false }],
    ],
  },
});

export async function fetchArXiv(categories: string = 'cat:cs.AI OR cat:cs.CL OR cat:cs.LG'): Promise<RawFeedItem[]> {
  try {
    const encoded = encodeURIComponent(categories);
    const url = `http://export.arxiv.org/api/query?search_query=${encoded}&sortBy=submittedDate&sortOrder=descending&max_results=25`;

    const feed = await parser.parseURL(url);
    if (!feed.items) return [];

    return feed.items.map((rawItem) => {
      const item = rawItem as any;
      // ArXiv ID is in id or link
      const arxivId = item.id?.split('/abs/')?.[1] || item.link?.split('/abs/')?.[1] || Math.random().toString(36).substring(2, 9);
      const absUrl = `https://arxiv.org/abs/${arxivId}`;
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;

      // Clean title from extra whitespace/newlines common in arXiv XML
      const cleanTitle = (item.title || 'Untitled Paper').replace(/\s+/g, ' ').trim();
      const cleanSummary = (item.summary || item.contentSnippet || '').replace(/\s+/g, ' ').trim();

      return {
        id: `arxiv_${arxivId.replace(/[^a-zA-Z0-9]/g, '_')}`,
        title: `[Paper] ${cleanTitle}`,
        url: absUrl,
        canonical_url: absUrl,
        source_type: 'arxiv',
        source_name: 'ArXiv',
        author: item.creator || item.author || null,
        published_at: item.pubDate || item.isoDate || new Date().toISOString(),
        raw_summary: cleanSummary ? cleanSummary.slice(0, 1200) : null,
        score: 0,
        comments_count: 0,
        comments_url: pdfUrl,
      };
    });
  } catch (err) {
    console.error('Error fetching ArXiv papers:', err);
    return [];
  }
}
