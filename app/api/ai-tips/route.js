import { NextResponse } from 'next/server';

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM = 'You are Neural AI, a medical health advisor. You always respond with valid JSON only — no markdown, no extra text.';

function buildPrompt(seed) {
  return `You are Neural AI inside a medical dashboard. Generate exactly 5 unique, evidence-based, slightly fun and warm health tips to help a patient reduce their risk of brain tumors and stroke.

Randomization seed (use it to always produce different tips): ${seed}

Rules:
- Each tip must cover a DIFFERENT topic
- Be encouraging, specific, and actionable — never scary or clinical
- Each tip must be genuinely unique and not repeat advice from others
- 2-3 sentences per tip, conversational tone

Return ONLY this JSON structure:
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
1. category:"Brain Health"    color:"#7a4dff"  urgency:"Daily Habit"
2. category:"Heart & Stroke"  color:"#ff3d6e"  urgency:"Weekly Goal"
3. category:"Nutrition"       color:"#22c55e"  urgency:"Every Meal"
4. category:"Sleep & Recovery" color:"#3b82f6" urgency:"Tonight"
5. category:"Move More"       color:"#f59e0b"  urgency:"Daily Goal"

Use fun, relevant emojis. The order can vary. Generate different advice each call.`;
}

export async function POST() {
  try {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildPrompt(seed) },
        ],
        temperature: 1.0,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Groq error' }, { status: 502 });
    }

    const raw = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to fetch tips' }, { status: 500 });
  }
}
