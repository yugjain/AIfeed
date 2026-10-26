import { NextRequest, NextResponse } from 'next/server';
import { getFeedItems, toggleBookmark } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = (searchParams.get('view') as any) || 'curated';
    const source = searchParams.get('source') || 'all';
    const category = searchParams.get('category') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '40', 10);
    const offset = (page - 1) * limit;

    const result = getFeedItems({
      view,
      source,
      category,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.items,
      total: result.total,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('Error in /api/feed GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Item ID required' }, { status: 400 });
    }

    if (action === 'bookmark') {
      const isBookmarked = toggleBookmark(id);
      return NextResponse.json({ success: true, is_bookmarked: isBookmarked });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
