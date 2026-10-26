import { NextRequest, NextResponse } from 'next/server';
import { getSources, toggleSource, addSource, deleteSource } from '@/lib/db';

export async function GET() {
  try {
    const sources = getSources();
    return NextResponse.json({ success: true, sources });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, name, type, url_or_query, enabled } = body;

    if (action === 'toggle') {
      if (!id) return NextResponse.json({ success: false, error: 'Source ID required' }, { status: 400 });
      toggleSource(id, enabled);
      return NextResponse.json({ success: true, message: 'Source updated' });
    }

    if (action === 'add') {
      if (!name || !type || !url_or_query) {
        return NextResponse.json({ success: false, error: 'Name, type, and url/query are required' }, { status: 400 });
      }
      const newId = id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      addSource({
        id: newId,
        name,
        type,
        url_or_query,
        enabled: enabled !== false,
      });
      return NextResponse.json({ success: true, message: 'Source added', id: newId });
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ success: false, error: 'Source ID required' }, { status: 400 });
      deleteSource(id);
      return NextResponse.json({ success: true, message: 'Source deleted' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
