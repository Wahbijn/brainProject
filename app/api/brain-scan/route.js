import { NextResponse } from 'next/server';

const BRAIN_API = process.env.BRAIN_API_URL || 'http://localhost:5001';

function withTimeout(ms) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

export async function GET() {
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
  const { signal, clear } = withTimeout(60000);
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
