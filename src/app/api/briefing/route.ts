import { NextRequest, NextResponse } from 'next/server';
import { getFeedItems, getSettings } from '@/lib/db';
import { generateExecutiveBriefing } from '@/lib/gemini';

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json({
      success: true,
      briefing: settings.executive_briefing,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get top 10 items
    const { items } = getFeedItems({ view: 'curated', limit: 12 });
    const briefingText = await generateExecutiveBriefing(items);

    return NextResponse.json({
      success: true,
      briefing: {
        content: briefingText,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error generating briefing in /api/briefing:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
