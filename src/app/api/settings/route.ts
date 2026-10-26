import { NextRequest, NextResponse } from 'next/server';
import {
  getSettings,
  setSetting,
  getSources,
  toggleSource,
  addSource,
  deleteSource,
} from '@/lib/db';

export async function GET() {
  try {
    const settings = getSettings();
    const sources = getSources();

    // Mask API key for security when returning to frontend (show last 4 characters if exists)
    const maskedKey = settings.gemini_api_key
      ? `••••••••${settings.gemini_api_key.slice(-4)}`
      : '';

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        gemini_api_key_masked: maskedKey,
        has_api_key: Boolean(settings.gemini_api_key),
      },
      sources,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.user_interests_prompt !== undefined) {
      setSetting('user_interests_prompt', body.user_interests_prompt);
    }

    if (body.gemini_model !== undefined) {
      setSetting('gemini_model', body.gemini_model);
    }

    if (body.gemini_api_key !== undefined) {
      setSetting('gemini_api_key', body.gemini_api_key.trim());
    }

    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
