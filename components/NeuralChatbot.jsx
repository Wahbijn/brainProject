'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  content: "Hey there! 👋 I'm **MedVision AI** — your personal health companion. Ask me anything about brain health, stroke prevention, what this platform does, or just pick a question below to get started!",
};

const QUICK = [
  { emoji: '🧠', text: 'How do I protect my brain?' },
  { emoji: '❤️', text: 'Top stroke prevention tips' },
  { emoji: '🥗', text: 'Best foods for brain health' },
  { emoji: '😴', text: 'Sleep & brain health' },
  { emoji: '✨', text: 'What can this app do?' },
];

function renderContent(text) {
  // Bold **text** → <strong>
  return text.split(/(\*\*[^*]+\*\*)/).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**')
      ? <strong key={i}>{chunk.slice(2, -2)}</strong>
      : chunk
  );
}

export default function NeuralChatbot({ activeTab } = {}) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 320);
    }
  }, [open]);

  const send = useCallback(async (override) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput('');

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res  = await fetch('/api/ai-chat', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || 'Hmm, something went wrong. Try again! 🤔';

      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: "Oops — I had a brain glitch! 🧠💥 Try again in a second." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, open]);

  const clearChat = () => setMessages([WELCOME_MSG]);
  const hasUser   = messages.some(m => m.role === 'user');

  return (
    <>
      {/* ── Floating trigger — hidden while Messages tab is open to avoid covering send button ── */}
      <div style={{ position:'fixed', bottom:28, right:28, zIndex:1000, display:'flex', flexDirection:'column', alignItems:'center', gap:8, pointerEvents: activeTab === 'Messages' && !open ? 'none' : 'auto', opacity: activeTab === 'Messages' && !open ? 0 : 1, transition:'opacity 0.2s' }}>

        {/* Tooltip label */}
        <AnimatePresence>
          {!open && (
            <motion.div initial={{ opacity:0, y:6, scale:.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:4, scale:.9 }}
              style={{ background:'var(--frame)', border:'1px solid var(--line)', borderRadius:12, padding:'6px 12px', fontSize:11, fontWeight:700, color:'var(--ink-2)', whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', pointerEvents:'none' }}>
              Chat with MedVision AI
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen(o => !o)}
          whileHover={{ scale:1.08 }} whileTap={{ scale:.93 }}
          style={{ position:'relative', width:60, height:60, borderRadius:'50%', border:'none', cursor:'pointer',
            background:'linear-gradient(135deg,#7a4dff,#ff3d6e)',
            boxShadow:'0 8px 28px -4px rgba(122,77,255,0.65)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>

          {/* Pulse rings when closed */}
          {!open && [0,1].map(i => (
            <motion.span key={i}
              animate={{ scale:[1,2.1], opacity:[0.45,0] }}
              transition={{ repeat:Infinity, duration:2.2, delay:i*0.9, ease:'easeOut' }}
              style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(122,77,255,0.35)' }} />
          ))}

          <motion.span
            animate={{ rotate: open ? 135 : 0 }}
            transition={{ type:'spring', stiffness:320, damping:22 }}
            style={{ fontSize:26, lineHeight:1, userSelect:'none' }}>
            {open ? '✕' : '🧠'}
          </motion.span>

          {/* Unread badge */}
          <AnimatePresence>
            {unread > 0 && !open && (
              <motion.div initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                style={{ position:'absolute', top:2, right:2, width:18, height:18, borderRadius:'50%', background:'#ff3d6e', border:'2px solid white', fontSize:10, fontWeight:800, color:'white', display:'grid', placeItems:'center' }}>
                {unread}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, scale:.88, y:18 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:.88, y:18 }}
            transition={{ type:'spring', stiffness:340, damping:28 }}
            style={{ position:'fixed', bottom:102, right:28, zIndex:999, width:390, height:560,
              borderRadius:26, display:'flex', flexDirection:'column', overflow:'hidden',
              boxShadow:'0 40px 80px -16px rgba(0,0,0,0.55), 0 0 0 1px rgba(122,77,255,0.22)',
              background:'var(--frame)' }}>

            {/* ── Header ── */}
            <div style={{ flexShrink:0, padding:'16px 18px', position:'relative', overflow:'hidden',
              background:'linear-gradient(135deg,#5b21b6,#7a4dff 40%,#ff3d6e)' }}>

              {/* Decorative blobs */}
              <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-40, left:20, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />

              <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative' }}>
                {/* Avatar */}
                <motion.div
                  animate={{ rotate:[0,8,-8,0] }} transition={{ repeat:Infinity, duration:5, ease:'easeInOut' }}
                  style={{ width:48, height:48, borderRadius:16, background:'rgba(255,255,255,0.18)',
                    backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                  🧠
                </motion.div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:900, color:'white', letterSpacing:'.02em' }}>MedVision AI</div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                    <motion.div animate={{ opacity:[1,.3,1] }} transition={{ repeat:Infinity, duration:2 }}
                      style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.75)' }}>Your personal health advisor</span>
                  </div>
                </div>

                {/* Clear + Close */}
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:.9 }}
                    onClick={clearChat} title="Clear chat"
                    style={{ width:30, height:30, borderRadius:9, border:'none', background:'rgba(255,255,255,0.15)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
                    🗑
                  </motion.button>
                  <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:.9 }}
                    onClick={() => setOpen(false)}
                    style={{ width:30, height:30, borderRadius:9, border:'none', background:'rgba(255,255,255,0.15)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700 }}>
                    ✕
                  </motion.button>
                </div>
              </div>
            </div>

            {/* ── Messages ── */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:10,
              background:'var(--bg)',
              backgroundImage:'radial-gradient(ellipse at 20% 0%, rgba(122,77,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(255,61,110,0.04) 0%, transparent 60%)' }}>

              {messages.map((msg) => (
                <motion.div key={msg.id}
                  initial={{ opacity:0, y:10, scale:.97 }}
                  animate={{ opacity:1, y:0, scale:1 }}
                  transition={{ type:'spring', stiffness:300, damping:24 }}
                  style={{ display:'flex', flexDirection: msg.role==='user'?'row-reverse':'row', gap:8, alignItems:'flex-end' }}>

                  {/* AI avatar dot */}
                  {msg.role === 'assistant' && (
                    <div style={{ width:28, height:28, borderRadius:9, background:'linear-gradient(135deg,#7a4dff,#ff3d6e)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, marginBottom:2 }}>
                      🧠
                    </div>
                  )}

                  <div style={{
                    maxWidth:'80%', padding:'11px 15px',
                    borderRadius: msg.role==='user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role==='user'
                      ? 'linear-gradient(135deg,#7a4dff,#c026d3 60%,#ff3d6e)'
                      : 'var(--frame)',
                    border: msg.role==='user' ? 'none' : '1px solid var(--line)',
                    color: msg.role==='user' ? 'white' : 'var(--ink)',
                    fontSize: 13.5, lineHeight: 1.65,
                    boxShadow: msg.role==='user' ? '0 4px 18px -4px rgba(122,77,255,0.5)' : '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    {renderContent(msg.content)}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {loading && (
                  <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                    <div style={{ width:28, height:28, borderRadius:9, background:'linear-gradient(135deg,#7a4dff,#ff3d6e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>🧠</div>
                    <div style={{ padding:'12px 16px', borderRadius:'18px 18px 18px 4px', background:'var(--frame)', border:'1px solid var(--line)', display:'flex', gap:5, alignItems:'center' }}>
                      {[0,1,2].map(i => (
                        <motion.div key={i}
                          animate={{ y:[0,-7,0], opacity:[0.4,1,0.4] }}
                          transition={{ repeat:Infinity, duration:0.9, delay:i*0.18, ease:'easeInOut' }}
                          style={{ width:7, height:7, borderRadius:'50%', background:'linear-gradient(135deg,#7a4dff,#ff3d6e)' }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick questions */}
              <AnimatePresence>
                {!hasUser && !loading && (
                  <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    style={{ display:'flex', flexWrap:'wrap', gap:7, paddingLeft:36, marginTop:2 }}>
                    {QUICK.map((q, i) => (
                      <motion.button key={q.text}
                        initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay:i*.06 }}
                        whileHover={{ scale:1.05, background:'rgba(122,77,255,0.15)' }} whileTap={{ scale:.95 }}
                        onClick={() => send(q.text)}
                        style={{ padding:'6px 12px', borderRadius:100, border:'1px solid rgba(122,77,255,0.28)',
                          background:'rgba(122,77,255,0.07)', color:'#7a4dff',
                          fontSize:11.5, fontWeight:600, cursor:'pointer',
                          display:'flex', alignItems:'center', gap:5, transition:'background .15s' }}>
                        <span>{q.emoji}</span>{q.text}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={endRef} />
            </div>

            {/* ── Input bar ── */}
            <div style={{ flexShrink:0, padding:'12px 14px', borderTop:'1px solid var(--line)', background:'var(--frame)', display:'flex', gap:8, alignItems:'center' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={loading ? 'MedVision AI is thinking…' : 'Ask anything about your health…'}
                disabled={loading}
                style={{ flex:1, padding:'11px 15px', borderRadius:14, border:'1.5px solid var(--line)',
                  background:'var(--bg)', color:'var(--ink)', fontSize:13, outline:'none',
                  transition:'border-color .2s', opacity: loading?.65:1 }}
                onFocus={e  => e.target.style.borderColor='rgba(122,77,255,0.5)'}
                onBlur={e   => e.target.style.borderColor='var(--line)'} />

              <motion.button
                whileHover={{ scale: input.trim() && !loading ? 1.08 : 1 }}
                whileTap={{ scale: input.trim() && !loading ? .92 : 1 }}
                onClick={() => send()}
                disabled={loading || !input.trim()}
                style={{ width:44, height:44, borderRadius:14, border:'none', flexShrink:0,
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg,#7a4dff,#ff3d6e)'
                    : 'var(--line)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'background .2s',
                  boxShadow: input.trim() && !loading ? '0 4px 14px -4px rgba(122,77,255,0.6)' : 'none' }}>
                {loading
                  ? <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:'linear' }}
                      style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white' }} />
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>}
              </motion.button>
            </div>

            {/* ── Footer disclaimer ── */}
            <div style={{ flexShrink:0, padding:'8px 16px', textAlign:'center', fontSize:10, color:'var(--ink-3)', background:'var(--frame)', borderTop:'1px solid var(--line)' }}>
              MedVision AI can make mistakes · Always consult a real doctor for medical decisions
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
