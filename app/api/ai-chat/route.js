import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM = `You are MedVision AI — a witty, warm, and deeply knowledgeable health companion built into the MedVision platform.

PERSONALITY:
- Friendly and encouraging, like a brilliant doctor friend (not a clinical robot)
- Add light humor when appropriate — keep it fun and engaging
- Use emojis sparingly but effectively (1-2 per response max)
- Be concise: 2-4 sentences usually, longer only when genuinely needed
- Never be scary or alarmist — always reassuring and solution-focused

YOUR EXPERTISE:
- Brain tumor & stroke PREVENTION (lifestyle, nutrition, sleep, exercise, stress management)
- Cardiovascular and neurological health concepts explained simply
- The MedVision platform features and how to use them
- General wellness habits backed by evidence

THE PLATFORM YOU LIVE IN:
- Patient dashboard: health metrics, appointments, AI brain scan reports, AI Insights (daily Groq-powered tips)
- Doctor dashboard: schedule management, patient messaging, in-chat AI brain scanning, reviews
- Admin dashboard: doctor approvals, platform stats, live AI scan counter
- Brain Scan AI: detects glioma, meningioma, pituitary tumors + stroke signs via MRI upload

RULES:
- Always remind users to consult a real doctor for personal medical decisions
- You educate and motivate — you do NOT diagnose
- If asked something completely off-topic, politely redirect to health or the platform
- When it feels natural, end with a short engaging follow-up question`;

export async function POST(req) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY is not configured. Add it to .env.local and restart.' },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { messages = [] } = body;
  const history = messages.slice(-14); // keep last 14 turns to stay within token budget

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: ctrl.signal,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Connection: 'close',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM }, ...history],
        temperature: 0.85,
        max_tokens: 380,
      }),
    });

    clearTimeout(timer);
    const text = await res.text();

    if (!res.ok) {
      let msg = `Groq error ${res.status}`;
      try { msg = JSON.parse(text)?.error?.message || msg; } catch {}
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json({ error: 'Unreadable response from Groq.' }, { status: 502 });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return NextResponse.json({ error: 'Empty reply from AI.' }, { status: 502 });

    return NextResponse.json({ reply }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError'
      ? 'Request timed out. Try again!'
      : (err.message || 'Network error reaching Groq.');
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
