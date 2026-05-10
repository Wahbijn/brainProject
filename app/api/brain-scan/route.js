import { NextResponse } from 'next/server';

const BRAIN_API = process.env.BRAIN_API_URL || 'http://localhost:5001';

function withTimeout(ms) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // /api/brain-scan?action=reload-stroke  → triggers model reload on the Python server
  if (searchParams.get('action') === 'reload-stroke') {
    const { signal, clear } = withTimeout(30000);
    try {
      const res  = await fetch(`${BRAIN_API}/reload-stroke`, { method:'POST', signal, cache:'no-store' });
      clear();
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      clear();
      return NextResponse.json({ ok: false, error: 'Brain API offline' }, { status: 503 });
    }
  }

  // Default: ping /status
  const { signal, clear } = withTimeout(4000);
  try {
    const res  = await fetch(`${BRAIN_API}/status`, { cache: 'no-store', signal });
    clear();
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    clear();
    return NextResponse.json(
      { classification: false, segmentation: false, error: 'Brain API offline' },
      { status: 503 }
    );
  }
}

export async function POST(request) {
  const { signal, clear } = withTimeout(90000);  // 90s — dual model (tumor + stroke)
  try {
    const formData = await request.formData();
    const res = await fetch(`${BRAIN_API}/analyze`, {
      method: 'POST',
      body:   formData,
      signal,
    });
    clear();
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    clear();
    return NextResponse.json(
      { error: `Brain API offline — run: python BrainTumor/brain_api.py  (expected at ${BRAIN_API})` },
      { status: 503 }
    );
  }
}
