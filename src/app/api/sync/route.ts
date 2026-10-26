import { NextRequest, NextResponse } from 'next/server';
import { syncAllSources } from '@/lib/connectors';
import { getUncuratedItems } from '@/lib/db';
import { curateBatchWithGemini } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const curateOnly = url.searchParams.get('curateOnly') === 'true';

    let syncResult = null;
    if (!curateOnly) {
      syncResult = await syncAllSources();
    }

    // Now curate items that don't have AI summaries / relevance score yet
    const uncurated = getUncuratedItems(30);
    const curationResult = await curateBatchWithGemini(uncurated);

    return NextResponse.json({
      success: true,
      sync: syncResult,
      curation: curationResult,
    });
  } catch (err: any) {
    console.error('Error in /api/sync:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
