import { RawFeedItem } from '@/types/feed';

export async function fetchGitHubTrending(query: string = 'topic:llm'): Promise<RawFeedItem[]> {
  try {
    const searchUrl = `https://api.github.com/search/repositories?q=topic:llm+stars:>500&sort=stars&order=desc&per_page=25`;

    const res = await fetch(searchUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AIFeedApp/1.0 (+http://localhost:3000)',
      },
    });

    if (!res.ok) {
      console.warn(`GitHub API request status: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const items: any[] = data.items || [];

    return items.map((repo) => ({
      id: `gh_${repo.id}`,
      title: `${repo.full_name}: ${repo.description || 'AI / LLM project'}`,
      url: repo.html_url,
      canonical_url: repo.html_url,
      source_type: 'github',
      source_name: 'GitHub Trending',
      author: repo.owner?.login || null,
      published_at: repo.updated_at || repo.created_at || new Date().toISOString(),
      raw_summary: `${repo.description || ''} • Language: ${repo.language || 'Unknown'} • Stars: ⭐${repo.stargazers_count.toLocaleString()} • Forks: 🍴${repo.forks_count.toLocaleString()}`,
      score: repo.stargazers_count || 0,
      comments_count: repo.open_issues_count || 0,
      comments_url: `${repo.html_url}/issues`,
    }));
  } catch (err) {
    console.error('Error fetching GitHub repos:', err);
    return [];
  }
}
