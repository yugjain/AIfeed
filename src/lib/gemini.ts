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
  technicality_score: number;
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

  // Fallback to heuristic curation if no key
  if (!hasKey || !client) {
    applyHeuristicCuration(items);
    return {
      processed: items.length,
      success: true,
      fallback: true,
      message: 'Curated with algorithmic heuristics. Connect Gemini API in Settings for personalized summaries.',
    };
  }

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
      snippet: item.raw_summary ? item.raw_summary.slice(0, 450) : '',
    }));

    const prompt = `
You are a Senior AI Product Strategist and Technology Curator.
Your goal is to curate a practical, high-utility feed for someone who wants to know about USEFUL AI PRODUCTS, REAL-WORLD TOOLS, and MAJOR BREAKTHROUGHS they can actually use today.

USER CURATION PROFILE:
"""
${userInterests}
"""

CORE GUIDELINES:
1. RUTHLESSLY IDENTIFY TECHNICALITY LEVEL (technicality_score from 1 to 5):
   - 1 = General / Consumer AI (ChatGPT/Claude updates, accessible web apps, productivity tools)
   - 2 = Practical Product / Applied Tool (image/video gen, workflow builders, Perplexity, search tools)
   - 3 = High-Level Builder Tool (accessible APIs, no-code agents, Cursor/Claude Code workflows)
   - 4 = Systems / Technical Engineering (fine-tuning stacks, inference engines, complex frameworks)
   - 5 = Dense Academic & Math (ArXiv theorem proofs, loss derivations, academic benchmarks)

2. RELEVANCE SCORE (0 to 100):
   - Heavily FAVOR Level 1-3 items (Practical Products, Workflows, Usable Tools). Give them higher relevance (75-98).
   - Heavily DOWNRANK Level 4-5 items (Dense academic papers, low-level repo internals, CUDA code). Give them lower relevance (30-65).

3. PLAIN-ENGLISH TLDR:
   - 1-2 concise sentences explaining WHAT THE PRODUCT / TOOL / DEVELOPMENT DOES in simple, human language.
   - Absolutely NO academic jargon (do NOT say "kv-cache", "attention sink", "stochastic gradient", "inductive bias"). Explain the concrete capability.

4. "WHY IT MATTERS" (HOW YOU CAN USE IT):
   - 1 sentence highlighting real-world utility: e.g. "Automates creating short video clips from text in under 60 seconds." or "Allows Claude to edit local project files without copy-pasting."

ALLOWED CATEGORIES:
- "Practical Products & Apps"
- "Tools & Workflows"
- "Major Breakthroughs"
- "Developer Stacks"
- "Research & Code"

ITEMS TO CURATE:
${JSON.stringify(simplifiedItems, null, 2)}

Return ONLY a JSON array matching this schema:
[
  {
    "id": "<matching item id>",
    "relevance_score": <integer 0-100>,
    "technicality_score": <integer 1-5>,
    "category": "<one of the allowed categories>",
    "tldr": "<plain English 1-2 sentence description>",
    "why_it_matters": "<1 sentence on how to use it / practical benefit>"
  }
]
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
              ai_category: res.category || 'Practical Products & Apps',
              ai_relevance_score: Math.min(100, Math.max(0, Math.round(res.relevance_score))),
              technicality_score: Math.min(5, Math.max(1, Math.round(res.technicality_score || 2))),
            });
            totalProcessed++;
          }
        }
      } else {
        applyHeuristicCuration(batch);
        totalProcessed += batch.length;
      }
    } catch (err: any) {
      console.error('Error generating curation with Gemini:', err?.message || err);
      applyHeuristicCuration(batch);
      totalProcessed += batch.length;
    }
  }

  return { processed: totalProcessed, success: true, fallback: false };
}

function applyHeuristicCuration(items: FeedItem[]) {
  for (const item of items) {
    const text = `${item.title} ${item.raw_summary || ''}`.toLowerCase();
    let category = 'Practical Products & Apps';
    let technicality = 2;
    let baseScore = 75;

    if (item.source_type === 'arxiv') {
      category = 'Research & Code';
      technicality = 5;
      baseScore = 45; // Demoted
    } else if (item.source_type === 'github') {
      category = 'Developer Stacks';
      technicality = 3;
      baseScore = 70;
    } else if (item.source_type === 'producthunt' || text.includes('app') || text.includes('tool') || text.includes('launch')) {
      category = 'Practical Products & Apps';
      technicality = 1;
      baseScore = 88; // Boosted
    } else if (text.includes('workflow') || text.includes('prompt') || text.includes('guide')) {
      category = 'Tools & Workflows';
      technicality = 2;
      baseScore = 85;
    } else if (text.includes('model') || text.includes('gemini') || text.includes('claude') || text.includes('chatgpt')) {
      category = 'Major Breakthroughs';
      technicality = 2;
      baseScore = 90;
    }

    const tldr =
      item.raw_summary && item.raw_summary.length > 25
        ? item.raw_summary.slice(0, 180).replace(/\s+/g, ' ') + '...'
        : item.title;

    const whyItMatters =
      technicality <= 2
        ? `Practical AI tool trending with community buzz in ${item.source_name}.`
        : `Developer-level implementation details and codebase.`;

    updateItemAI(item.id, {
      ai_tldr: tldr,
      ai_why_it_matters: whyItMatters,
      ai_category: category,
      ai_relevance_score: Math.min(99, baseScore),
      technicality_score: technicality,
    });
  }
}

export async function generateExecutiveBriefing(topItems: FeedItem[]): Promise<string> {
  const { client, model, hasKey } = getGeminiClient();

  // Filter top items to practical products and accessible breakthroughs only
  const practicalTopItems = topItems.filter((it) => (it.technicality_score ?? 2) <= 3).slice(0, 8);
  const itemsToUse = practicalTopItems.length >= 3 ? practicalTopItems : topItems.slice(0, 8);

  if (!hasKey || !client || itemsToUse.length === 0) {
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    const lines = [
      `### ⚡ Practical AI Radar Briefing — ${dateStr}`,
      '',
      'Here are the most useful practical AI products, tools, and updates you can use right now:',
      '',
    ];

    itemsToUse.slice(0, 5).forEach((item, idx) => {
      lines.push(
        `${idx + 1}. **[${item.title}](${item.url})** (${item.source_name}) — ${
          item.ai_tldr || item.raw_summary?.slice(0, 120) || 'Practical tool update'
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
You are a senior tech scout delivering an executive intelligence brief for a creator, founder, and builder.
Your audience wants ACTIONABLE, PRACTICAL AI developments — new tools they can use, major model capability jumps, and workflow shortcuts.
DO NOT focus on academic papers, mathematical derivations, or low-level systems code.

TOP PRACTICAL ITEMS:
${JSON.stringify(
  itemsToUse.map((it) => ({
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

FORMATTING:
- Start with a punchy 1-2 sentence summary of the biggest practical takeaway today.
- Include 3 concise sections with markdown links:
  - 🛠️ **New Tools & Products You Can Use**
  - 🚀 **Major Capability Unlocks**
  - ⚡ **Workflow & Productivity Hacks**
- Keep total length under 220 words. High clarity, zero jargon.
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
    console.error('Error generating executive briefing with Gemini:', err.message || err);
    // Graceful fallback digest if API has a 503 / rate spike
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    const lines = [
      `### ⚡ Practical AI Radar Briefing — ${dateStr}`,
      '',
      '**Top practical takeaways & actionable tools trending today:**',
      '',
    ];

    itemsToUse.slice(0, 5).forEach((item, idx) => {
      lines.push(
        `${idx + 1}. **[${item.title}](${item.url})** (${item.source_name}) — ${
          item.ai_tldr || item.raw_summary?.slice(0, 140) || 'Practical tool update'
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
}
