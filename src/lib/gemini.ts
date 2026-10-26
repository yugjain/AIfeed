import { GoogleGenAI } from '@google/genai';
import { FeedItem } from '@/types/feed';
import { getSettings, updateItemAI, setSetting } from './db';

function getGeminiClient(): { client: GoogleGenAI | null; model: string; hasKey: boolean } {
  const settings = getSettings();
  const apiKey = (settings.gemini_api_key || process.env.GEMINI_API_KEY || '').trim();
  let model = settings.gemini_model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  if (model.includes('2.5')) {
    model = 'gemini-3.8-flash';
  }

  if (!apiKey) {
    return { client: null, model, hasKey: false };
  }

  return { client: new GoogleGenAI({ apiKey }), model, hasKey: true };
}

interface CurationResultItem {
  id: string;
  relevance_score: number;
  category: string;
  tldr: string;
  why_it_matters: string;
}

export async function curateBatchWithGemini(
  items: FeedItem[]
): Promise<{ processed: number; success: boolean; fallback: boolean; message?: string }> {
  if (items.length === 0) {
    return { processed: 0, success: true, fallback: false };
  }

  const { client, model, hasKey } = getGeminiClient();
  const settings = getSettings();
  const userInterests = settings.user_interests_prompt;

  // If no Gemini key is provided, run heuristic smart curation
  if (!hasKey || !client) {
    console.log('No Gemini API key configured. Applying algorithmic heuristic curation...');
    applyHeuristicCuration(items);
    return {
      processed: items.length,
      success: true,
      fallback: true,
      message: 'Curated using algorithmic heuristics. Add your Gemini API Key in Settings for AI summaries & custom ranking.',
    };
  }

  // Curate in batches of 12 to ensure fast responses and high quality
  const batchSize = 12;
  let totalProcessed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const simplifiedItems = batch.map((item) => ({
      id: item.id,
      title: item.title,
      source: `${item.source_name} (${item.source_type})`,
      score: item.score,
      comments_count: item.comments_count,
      snippet: item.raw_summary ? item.raw_summary.slice(0, 400) : '',
    }));

    const prompt = `
You are an expert AI researcher and technical curator.
Your task is to analyze, score, categorize, and summarize the following AI feed items for a developer/builder.

USER'S CURATION PROFILE:
"""
${userInterests}
"""

ALLOWED CATEGORIES:
- "Agents & Tooling"
- "Models & Weights"
- "Research Paper"
- "Open Source Repo"
- "Industry & Launches"
- "Tutorials & Eng"

ITEMS TO CURATE:
${JSON.stringify(simplifiedItems, null, 2)}

INSTRUCTIONS:
For EACH item, return a JSON array of objects with the exact schema:
[
  {
    "id": "<matching item id>",
    "relevance_score": <integer from 0 to 100 based on quality and relevance to the user profile>,
    "category": "<one of the allowed categories>",
    "tldr": "<concise 1-2 sentence factual summary without hype>",
    "why_it_matters": "<1 sentence explaining why an AI builder/engineer should care>"
  }
]

Return ONLY valid JSON matching this schema.
`;

    try {
      const response = await client.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text?.trim() || '[]';
      let parsed: CurationResultItem[] = [];

      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        // Fallback: strip markdown code blocks if present
        const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const res of parsed) {
          if (res.id && res.relevance_score !== undefined) {
            updateItemAI(res.id, {
              ai_tldr: res.tldr || '',
              ai_why_it_matters: res.why_it_matters || '',
              ai_category: res.category || 'Industry & Launches',
              ai_relevance_score: Math.min(100, Math.max(0, Math.round(res.relevance_score))),
            });
            totalProcessed++;
          }
        }
      } else {
        // Fallback to heuristic for this batch if empty
        applyHeuristicCuration(batch);
        totalProcessed += batch.length;
      }
    } catch (err: any) {
      console.error('Error generating curation with Gemini:', err?.message || err);
      // Fallback for this batch
      applyHeuristicCuration(batch);
      totalProcessed += batch.length;
    }
  }

  return { processed: totalProcessed, success: true, fallback: false };
}

function applyHeuristicCuration(items: FeedItem[]) {
  const agentKeywords = ['agent', 'tool', 'langchain', 'crew', 'autogen', 'mcp', 'copilot', 'coding'];
  const modelKeywords = ['llama', 'deepseek', 'gpt', 'claude', 'gemini', 'qwen', 'mistral', 'weights', '70b', '8b'];
  const paperKeywords = ['paper', 'arxiv', 'eval', 'benchmark', 'attention', 'reasoning', 'transformer', 'loss'];
  const repoKeywords = ['github', 'repo', 'open source', 'release', 'stars', 'v1.', 'v0.'];

  for (const item of items) {
    const text = `${item.title} ${item.raw_summary || ''}`.toLowerCase();
    let category = 'Industry & Launches';
    let baseScore = 60;

    if (item.source_type === 'arxiv' || paperKeywords.some((k) => text.includes(k))) {
      category = 'Research Paper';
      baseScore = 78;
    } else if (item.source_type === 'github' || repoKeywords.some((k) => text.includes(k))) {
      category = 'Open Source Repo';
      baseScore = 82;
    } else if (agentKeywords.some((k) => text.includes(k))) {
      category = 'Agents & Tooling';
      baseScore = 85;
    } else if (modelKeywords.some((k) => text.includes(k))) {
      category = 'Models & Weights';
      baseScore = 84;
    }

    // Adjust score based on community engagement
    if (item.score > 200 || item.comments_count > 100) {
      baseScore += 10;
    } else if (item.score > 50) {
      baseScore += 5;
    }

    const tldr =
      item.raw_summary && item.raw_summary.length > 30
        ? item.raw_summary.slice(0, 180) + '...'
        : item.title;

    const whyItMatters = `Trending in ${item.source_name} with ${item.score} upvotes/stars and active community discussion.`;

    updateItemAI(item.id, {
      ai_tldr: tldr,
      ai_why_it_matters: whyItMatters,
      ai_category: category,
      ai_relevance_score: Math.min(99, baseScore),
    });
  }
}

export async function generateExecutiveBriefing(topItems: FeedItem[]): Promise<string> {
  const { client, model, hasKey } = getGeminiClient();

  if (!hasKey || !client || topItems.length === 0) {
    // Generate algorithmic digest
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    const lines = [
      `### ⚡ AI Radar Digest — ${dateStr}`,
      '',
      topItems.length > 0
        ? `Here are the top ${Math.min(5, topItems.length)} AI breakthroughs and discussions trending right now:`
        : 'Feed synced! Configure your Gemini API key in Settings to generate a personalized executive briefing.',
      '',
    ];

    topItems.slice(0, 5).forEach((item, idx) => {
      lines.push(
        `${idx + 1}. **[${item.title}](${item.url})** (${item.source_name}) — ${
          item.ai_tldr || item.raw_summary?.slice(0, 100) || 'Active discussion'
        }`
      );
    });

    const fallbackDigest = lines.join('\n');
    setSetting(
      'executive_briefing',
      JSON.stringify({
        date: dateStr,
        content: fallbackDigest,
        generated_at: new Date().toISOString(),
      })
    );
    return fallbackDigest;
  }

  const prompt = `
You are the Chief AI Officer delivering a 60-second executive intelligence briefing for a busy AI engineer / founder.
Synthesize the following top-ranked AI feed items into an engaging, high-density markdown briefing.

TOP ITEMS:
${JSON.stringify(
  topItems.slice(0, 10).map((it) => ({
    title: it.title,
    source: it.source_name,
    category: it.ai_category,
    tldr: it.ai_tldr,
    why_it_matters: it.ai_why_it_matters,
    url: it.url,
  })),
  null,
  2
)}

FORMATTING REQUIREMENTS:
- Start with a punchy 1-2 sentence high-level synthesis of what theme dominates today (e.g. reasoning models, agentic tool use, local inference optimizations).
- Provide 3 distinct highlights categorized by:
  - 🚀 **Breakthrough / Model Release**
  - 🛠️ **Developer & Agent Tooling**
  - 📄 **Research / Architecture Insight**
- Include markdown links to the source URLs.
- Keep it under 250 words total. No fluff.
`;

  try {
    const response = await client.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.3,
      },
    });

    const content = response.text?.trim() || '';
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    setSetting(
      'executive_briefing',
      JSON.stringify({
        date: dateStr,
        content,
        generated_at: new Date().toISOString(),
      })
    );

    return content;
  } catch (err: any) {
    console.error('Error generating executive briefing:', err);
    throw err;
  }
}
