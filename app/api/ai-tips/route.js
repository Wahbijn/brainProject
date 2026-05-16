import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildPrompt(seed) {
  return `You are MedVision AI inside a medical dashboard. Generate exactly 5 unique, evidence-based, slightly fun and warm health tips to help a patient reduce their risk of brain tumors and stroke.

Randomization seed (always produce different tips each call): ${seed}

Rules:
- Each tip must cover a DIFFERENT topic
- Be encouraging, specific, and actionable — never scary or clinical
- 2-3 sentences per tip, conversational tone

Return ONLY this JSON structure (no markdown, no extra text):
{
  "headline": "A short punchy headline for today's briefing (e.g. 'Your Brain Deserves This Today 🧠')",
  "tips": [
    {
      "emoji": "🧠",
      "title": "Catchy short title (4-6 words)",
      "tip": "2-3 sentences of warm, specific, actionable advice.",
      "category": "Brain Health",
      "color": "#7a4dff",
      "urgency": "Daily Habit"
    }
  ]
}

Assign EXACTLY these category → color → urgency combos (one per tip, no repeats):
1. category:"Brain Health"     color:"#7a4dff"  urgency:"Daily Habit"
2. category:"Heart & Stroke"   color:"#ff3d6e"  urgency:"Weekly Goal"
3. category:"Nutrition"        color:"#22c55e"  urgency:"Every Meal"
4. category:"Sleep & Recovery" color:"#3b82f6"  urgency:"Tonight"
5. category:"Move More"        color:"#f59e0b"  urgency:"Daily Goal"

Use fun relevant emojis. Order can vary. Generate completely different advice each call.`;
}

export async function POST() {
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY is not set. Add it to .env.local and restart the dev server.' },
      { status: 500 }
    );
  }

  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);

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
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI. Respond only with valid JSON — no markdown fences, no extra text.',
          },
          { role: 'user', content: buildPrompt(seed) },
        ],
        temperature: 1.0,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });

    clearTimeout(timer);

    const text = await res.text();

    if (!res.ok) {
      let msg = `Groq error ${res.status}`;
      try { msg = JSON.parse(text)?.error?.message || msg; } catch {}
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // Parse the Groq API wrapper first
    let groqResponse;
    try {
      groqResponse = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Groq API returned unreadable response.' }, { status: 502 });
    }

    // Extract the model's text content from choices[0].message.content
    const raw = groqResponse.choices?.[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: 'No content in Groq response.' }, { status: 502 });
    }

    // Strip markdown fences in case the model wraps JSON in ```json ... ```
    const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: 'AI returned malformed JSON. Try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError'
      ? 'Groq request timed out after 30 s. Try again.'
      : (err.message || 'Network error reaching Groq');
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
