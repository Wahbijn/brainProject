'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCurrentUser, logout, getAllDoctors, initAuth, getUserById,
  bookAppointment, getAppointmentsByPatient, cancelAppointment,
  addReview, getReviewsByDoctor, getDoctorRating, acceptAlternative,
  sendMessage, getMessagesBetween, markMessagesRead, getUnreadCount, getConversations,
} from '@/lib/auth';
import Particles from '@/components/Particles';
import BrainScanTab from '@/components/BrainScanTab';

const TABS = ['Overview', 'Appointments', 'Messages', 'Reviews', 'Reports', 'AI Insights', 'Brain Scan'];
const TIME_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30'];

const METRICS = [
  { label:'Heart Rate', value:'72', unit:'BPM', status:'Normal', color:'#ff3d6e', bg:'rgba(255,61,110,0.1)', border:'rgba(255,61,110,0.2)',
    icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    live:true, waveform:[40,55,42,38,58,45,60,48,40,55,42] },
  { label:'Blood Pressure', value:'120/80', unit:'mmHg', status:'Optimal', color:'#22c55e', bg:'rgba(34,197,94,0.1)', border:'rgba(34,197,94,0.2)',
    icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { label:'O₂ Saturation', value:'98', unit:'%', status:'Excellent', color:'#3b82f6', bg:'rgba(59,130,246,0.1)', border:'rgba(59,130,246,0.2)',
    icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
  { label:'Steps Today', value:'7,234', unit:'steps', status:'72% of goal', color:'#f59e0b', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.2)',
    icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
];

const REPORTS = [
  { title:'Complete Blood Count', date:'Apr 28, 2026', status:'Normal', icon:'🩸' },
  { title:'Brain MRI Scan',       date:'Apr 15, 2026', status:'Clear',  icon:'🧠' },
  { title:'ECG Screening',        date:'Apr 2, 2026',  status:'Normal', icon:'📊' },
];

const STATUS_CFG = {
  confirmed:       { color:'#22c55e', bg:'rgba(34,197,94,0.1)',   border:'rgba(34,197,94,0.2)',   label:'Confirmed'    },
  pending:         { color:'#f59e0b', bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.2)',  label:'Pending'      },
  cancelled:       { color:'#a4abbb', bg:'rgba(164,171,187,0.1)', border:'rgba(164,171,187,0.2)', label:'Cancelled'    },
  counter_proposed:{ color:'#f97316', bg:'rgba(249,115,22,0.1)',  border:'rgba(249,115,22,0.25)', label:'New Proposal' },
};

const RATING_LABELS = ['','Poor','Fair','Good','Very Good','Excellent'];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function Avt({ initials, gradient = 'linear-gradient(135deg,#ff7a9c,#7a4dff)', size = 36 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', display:'grid', placeItems:'center', fontSize:size*0.32, fontWeight:700, color:'white', background:gradient, flexShrink:0 }}>
      {initials}
    </div>
  );
}

function DarkToggle({ dark, toggle }) {
  return (
    <button onClick={toggle} style={{ width:48, height:26, borderRadius:100, border:'none', cursor:'pointer', background:dark?'#2a2c33':'#dfe3eb', position:'relative', transition:'background .4s' }}>
      <motion.span animate={{ left:dark?25:3 }} transition={{ type:'spring', stiffness:380, damping:24 }}
        style={{ position:'absolute', top:3, width:20, height:20, borderRadius:'50%', display:'grid', placeItems:'center', color:'white', fontSize:10, background:dark?'linear-gradient(180deg,#ffd089,#f7a14a)':'linear-gradient(180deg,#b8c5e8,#8aa3da)', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}>
        {dark?'☀':'◑'}
      </motion.span>
    </button>
  );
}

function Stars({ value, max = 5, interactive = false, onChange, size = 16 }) {
  const [hov, setHov] = useState(0);
  const eff = interactive ? (hov || value) : value;
  return (
    <div style={{ display:'flex', gap:2 }}>
      {Array.from({ length:max }, (_, i) => {
        const v = i + 1;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24"
            fill={eff >= v ? '#f59e0b' : 'none'}
            stroke={eff >= v ? '#f59e0b' : 'var(--ink-3)'}
            strokeWidth="1.8"
            style={{ cursor:interactive?'pointer':'default', transition:'transform .12s,fill .12s', transform:hov===v&&interactive?'scale(1.3)':'scale(1)' }}
            onClick={() => interactive && onChange?.(v)}
            onMouseEnter={() => interactive && setHov(v)}
            onMouseLeave={() => interactive && setHov(0)}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        );
      })}
    </div>
  );
}

function fmtMsgTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  if (d.toDateString() === new Date(now - 86400000).toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} · ${time}`;
}
function fmtDivider(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === new Date(now - 86400000).toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
}

function PatientChat({ user, doctor }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const endRef   = useRef(null);
  const pollRef  = useRef(null);
  const inputRef = useRef(null);

  const load = () => {
    const msgs = getMessagesBetween(user.id, doctor.id);
    setMessages(msgs);
    markMessagesRead(doctor.id, user.id);
    setUnread(0);
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 2000);
    return () => clearInterval(pollRef.current);
  }, [doctor.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    sendMessage({ fromId:user.id, fromName:user.name, fromAvatar:user.avatar, fromRole:'patient', toId:doctor.id, toName:doctor.name, toAvatar:doctor.avatar, toRole:'doctor', text });
    setInput('');
    setSending(false);
    load();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  // Group messages by date
  const groups = [];
  let lastDate = '';
  messages.forEach(m => {
    const d = new Date(m.timestamp).toDateString();
    if (d !== lastDate) { groups.push({ type:'divider', label:fmtDivider(m.timestamp), key:`div-${m.timestamp}` }); lastDate = d; }
    groups.push({ type:'msg', ...m });
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 220px)', borderRadius:20, overflow:'hidden', border:'1px solid var(--line)', boxShadow:'0 8px 40px -12px rgba(0,0,0,0.3)', position:'relative' }}>
      {/* Background decorative gradient */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, background:'var(--bg)', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'10%', right:'5%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(6,182,212,0.05),transparent 70%)', filter:'blur(50px)' }} />
        <div style={{ position:'absolute', bottom:'15%', left:'5%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(122,77,255,0.05),transparent 70%)', filter:'blur(40px)' }} />
      </div>

      {/* ── Header ── */}
      <div style={{ position:'relative', zIndex:2, padding:'14px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:12, background:'var(--frame)', flexShrink:0 }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:14, fontWeight:700, color:'white', boxShadow:'0 4px 14px -4px rgba(122,77,255,0.5)' }}>{doctor.avatar}</div>
          <div style={{ position:'absolute', bottom:-1, right:-1, width:13, height:13, borderRadius:'50%', background:'#22c55e', border:'2px solid var(--frame)' }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:1 }}>{doctor.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, color:'#22c55e', fontWeight:600 }}>● Online</span>
            <span style={{ fontSize:11, color:'var(--ink-3)' }}>· {doctor.specialty}</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:100, background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.18)' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{ fontSize:10, fontWeight:600, color:'#06b6d4' }}>Secure channel</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:4, position:'relative', zIndex:1 }}>
        {groups.length === 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:'40px 0' }}>
            <div style={{ width:64, height:64, borderRadius:20, background:'linear-gradient(135deg,rgba(6,182,212,0.12),rgba(122,77,255,0.12))', border:'1px solid rgba(6,182,212,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:4 }}>Start the conversation</div>
              <div style={{ fontSize:12, color:'var(--ink-3)' }}>Send a message to {doctor.name}</div>
            </div>
          </div>
        )}

        {groups.map((g, gi) => {
          if (g.type === 'divider') return (
            <div key={g.key} style={{ display:'flex', alignItems:'center', gap:10, margin:'12px 0 8px' }}>
              <div style={{ flex:1, height:1, background:'var(--line)' }} />
              <span style={{ fontSize:10, fontWeight:600, color:'var(--ink-3)', whiteSpace:'nowrap', padding:'0 4px' }}>{g.label}</span>
              <div style={{ flex:1, height:1, background:'var(--line)' }} />
            </div>
          );

          const isMe = g.fromId === user.id;
          const prev = groups[gi - 1];
          const next = groups[gi + 1];
          const samePrevSender = prev?.type === 'msg' && prev.fromId === g.fromId;
          const sameNextSender = next?.type === 'msg' && next.fromId === g.fromId;
          const isLast = !sameNextSender;

          return (
            <motion.div key={g.id} initial={{ opacity:0, y:10, scale:.97 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ duration:.2 }}
              style={{ display:'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems:'flex-end', gap:8, marginBottom: isLast ? 6 : 2 }}>

              {/* Avatar — only for doctor, only on last bubble in group */}
              {!isMe && (
                <div style={{ width:30, height:30, borderRadius:'50%', background: isLast ? 'linear-gradient(135deg,#ff7a9c,#7a4dff)' : 'transparent', display:'grid', placeItems:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0, visibility: isLast ? 'visible' : 'hidden' }}>
                  {g.fromAvatar}
                </div>
              )}

              <div style={{ maxWidth:'70%', display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  padding:'10px 14px',
                  borderRadius: isMe
                    ? `16px 16px ${isLast?'4px':'16px'} 16px`
                    : `16px 16px 16px ${isLast?'4px':'16px'}`,
                  background: isMe ? 'linear-gradient(135deg,#0ea5e9,#7a4dff)' : 'var(--frame)',
                  border: isMe ? 'none' : '1px solid var(--line)',
                  color: isMe ? 'white' : 'var(--ink-2)',
                  fontSize:14,
                  lineHeight:1.55,
                  boxShadow: isMe ? '0 4px 16px -4px rgba(14,165,233,0.4)' : '0 2px 8px -4px rgba(0,0,0,0.15)',
                  wordBreak:'break-word',
                }}>
                  {g.text}
                </div>
                {isLast && (
                  <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3, opacity:0.6 }}>
                    <span style={{ fontSize:10, color:'var(--ink-3)' }}>{fmtMsgTime(g.timestamp)}</span>
                    {isMe && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={g.read?'#22c55e':'var(--ink-3)'} strokeWidth="2.5">
                        {g.read
                          ? <><polyline points="18 4 9 15 4 10"/><polyline points="22 4 13 15" opacity=".6"/></>
                          : <polyline points="20 6 9 17 4 12"/>}
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* ── Input ── */}
      <div style={{ position:'relative', zIndex:2, padding:'12px 16px', borderTop:'1px solid var(--line)', display:'flex', gap:10, alignItems:'flex-end', background:'var(--frame)', flexShrink:0 }}>
        <div style={{ flex:1, borderRadius:16, border:'1px solid var(--line)', background:'var(--bg)', display:'flex', alignItems:'flex-end', padding:'6px 12px', transition:'border-color .2s', gap:8 }}
          onFocus={e=>e.currentTarget.style.borderColor='rgba(6,182,212,0.5)'}
          onBlur={e=>e.currentTarget.style.borderColor='var(--line)'}>
          <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey}
            placeholder={`Message ${doctor.name}…`} rows={1}
            style={{ flex:1, border:'none', background:'transparent', outline:'none', resize:'none', fontSize:14, color:'var(--ink)', lineHeight:1.5, maxHeight:100, overflowY:'auto', fontFamily:'inherit', padding:'4px 0' }}
            onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'; }}
          />
        </div>
        <motion.button whileHover={{ scale:1.06 }} whileTap={{ scale:.93 }} onClick={send}
          disabled={!input.trim() || sending}
          style={{ width:44, height:44, borderRadius:14, border:'none', cursor:!input.trim()?'not-allowed':'pointer', background:'linear-gradient(135deg,#0ea5e9,#7a4dff)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px -4px rgba(14,165,233,0.5)', opacity:!input.trim()?.4:1, transition:'opacity .2s' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </motion.button>
      </div>
    </div>
  );
}

function NewChatPanel({ approvedDocs, onClose, onStart }) {
  const [search, setSearch] = useState('');
  const filtered = approvedDocs.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty?.toLowerCase().includes(search.toLowerCase()) ||
    d.hospital?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(6px)', zIndex:800 }} />
      <motion.div initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
        transition={{ type:'spring', stiffness:320, damping:32 }}
        style={{ position:'fixed', right:0, top:0, bottom:0, width:460, zIndex:801, background:'var(--frame)', borderLeft:'1px solid var(--line)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:3, background:'linear-gradient(90deg,#0ea5e9,#06b6d4 40%,#7a4dff)' }} />
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--line)', background:'linear-gradient(135deg,rgba(6,182,212,0.04),rgba(122,77,255,0.03))' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize:20, fontWeight:400, color:'var(--ink)', marginBottom:2 }}>Choose a Doctor</h3>
              <p style={{ fontSize:12, color:'var(--ink-3)' }}>Start a new conversation with any available doctor</p>
            </div>
            <button onClick={onClose} style={{ width:32,height:32,borderRadius:9,border:'none',background:'var(--line)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-3)' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div style={{ position:'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, specialty, hospital…"
              style={{ width:'100%',height:38,borderRadius:11,paddingLeft:36,paddingRight:14,fontSize:13,outline:'none',background:'var(--bg)',color:'var(--ink)',border:'1px solid var(--line)',boxSizing:'border-box' }} />
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--ink-3)', fontSize:13 }}>No doctors match your search</div>
          )}
          {filtered.map((d, i) => {
            const rt = getDoctorRating(d.id);
            return (
              <motion.button key={d.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.04 }}
                whileHover={{ y:-2 }} whileTap={{ scale:.98 }}
                onClick={() => { onStart(d); onClose(); }}
                style={{ padding:'16px', borderRadius:16, border:'1px solid var(--line)', background:'var(--bg)', cursor:'pointer', display:'flex', alignItems:'center', gap:14, textAlign:'left', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(6,182,212,0.05)';e.currentTarget.style.borderColor='rgba(6,182,212,0.3)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='var(--bg)';e.currentTarget.style.borderColor='var(--line)';}}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:52,height:52,borderRadius:14,background:'linear-gradient(135deg,#ff7a9c,#7a4dff)',display:'grid',placeItems:'center',fontSize:16,fontWeight:700,color:'white',boxShadow:'0 4px 14px -4px rgba(122,77,255,0.4)' }}>{d.avatar}</div>
                  <div style={{ position:'absolute',bottom:-2,right:-2,width:14,height:14,borderRadius:'50%',background:'#22c55e',border:'2.5px solid var(--frame)' }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14,fontWeight:700,color:'var(--ink)',marginBottom:2 }}>{d.name}</div>
                  <div style={{ fontSize:11,color:'var(--ink-2)',marginBottom:5 }}>{d.specialty} · {d.hospital}</div>
                  <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                    <Stars value={Math.round(rt.avg)} size={11} />
                    <span style={{ fontSize:10,color:'var(--ink-3)' }}>{rt.avg>0?`${rt.avg} (${rt.count})` : 'No reviews'}</span>
                    {d.experience && <span style={{ fontSize:10,padding:'1px 7px',borderRadius:100,background:'rgba(6,182,212,0.08)',color:'#06b6d4',border:'1px solid rgba(6,182,212,0.18)' }}>{d.experience}y exp</span>}
                  </div>
                </div>
                <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#0ea5e9,#7a4dff)',display:'grid',placeItems:'center',flexShrink:0,boxShadow:'0 3px 10px -3px rgba(14,165,233,0.5)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

function BookingPanel({ user, doctors, onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [selDoc, setSelDoc] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      bookAppointment({ patientId:user.id, patientName:user.name, doctorId:selDoc.id, doctorName:selDoc.name, doctorAvatar:selDoc.avatar, specialty:selDoc.specialty, date, time, reason:reason.trim(), status:'pending' });
      setBusy(false); onDone(); onClose();
    }, 700);
  };

  const canNext0 = !!selDoc;
  const canNext1 = date && time;

  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(6px)', zIndex:600 }} />
      <motion.div initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
        transition={{ type:'spring', stiffness:320, damping:32 }}
        style={{ position:'fixed', right:0, top:0, bottom:0, width:460, zIndex:601, background:'var(--frame)', borderLeft:'1px solid var(--line)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:3, background:'linear-gradient(90deg,#0ea5e9,#06b6d4 45%,#7a4dff)' }} />
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--line)', background:'linear-gradient(135deg,rgba(6,182,212,0.05),rgba(122,77,255,0.04))' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <h3 className="font-serif" style={{ fontSize:20, fontWeight:400, color:'var(--ink)', marginBottom:2 }}>Book Appointment</h3>
              <p style={{ fontSize:12, color:'var(--ink-3)' }}>Schedule a consultation with your doctor</p>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:'none', background:'var(--line)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-3)' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center' }}>
            {['Doctor','Schedule','Confirm'].map((label, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', flex: i < 2 ? 1 : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', display:'grid', placeItems:'center', fontSize:10, fontWeight:700, background:i<=step?'linear-gradient(135deg,#0ea5e9,#7a4dff)':'var(--line)', color:i<=step?'white':'var(--ink-3)', transition:'all .3s' }}>{i+1}</div>
                  <span style={{ fontSize:11, fontWeight:i===step?600:400, color:i<=step?'var(--ink-2)':'var(--ink-3)' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ flex:1, height:1, background:i<step?'linear-gradient(90deg,#0ea5e9,#7a4dff)':'var(--line)', margin:'0 8px', transition:'all .3s' }} />}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <AnimatePresence mode="wait">

            {step === 0 && (
              <motion.div key="s0" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }} transition={{ duration:.25 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'var(--ink-3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>Select a Doctor</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {doctors.map(d => {
                    const rt = getDoctorRating(d.id);
                    const sel = selDoc?.id === d.id;
                    return (
                      <motion.button key={d.id} whileHover={{ y:-1 }} whileTap={{ scale:.98 }} onClick={() => setSelDoc(d)}
                        style={{ padding:'15px', borderRadius:16, border:sel?'2px solid #06b6d4':'1px solid var(--line)', background:sel?'rgba(6,182,212,0.07)':'var(--bg)', cursor:'pointer', display:'flex', alignItems:'center', gap:13, textAlign:'left', transition:'all .2s' }}>
                        <div style={{ position:'relative', flexShrink:0 }}>
                          <div style={{ width:48, height:48, borderRadius:13, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:15, fontWeight:700, color:'white' }}>{d.avatar}</div>
                          <div style={{ position:'absolute', bottom:-2, right:-2, width:14, height:14, borderRadius:'50%', background:'#22c55e', border:'2px solid var(--bg)', display:'grid', placeItems:'center' }}>
                            <svg width="7" height="7" viewBox="0 0 10 10" fill="none"><polyline points="1 5 4 8 9 2" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{d.name}</div>
                          <div style={{ fontSize:12, color:'var(--ink-2)', marginBottom:5 }}>{d.specialty} · {d.hospital}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <Stars value={Math.round(rt.avg)} size={11} />
                            <span style={{ fontSize:11, color:'var(--ink-3)' }}>{rt.avg > 0 ? `${rt.avg} (${rt.count} reviews)` : 'No reviews yet'}</span>
                          </div>
                        </div>
                        {sel && <div style={{ width:22, height:22, borderRadius:'50%', background:'#06b6d4', display:'grid', placeItems:'center', flexShrink:0 }}>
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        </div>}
                      </motion.button>
                    );
                  })}
                  {doctors.length === 0 && <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-3)', fontSize:13 }}>No approved doctors available.</div>}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }} transition={{ duration:.25 }}>
                {selDoc && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px', borderRadius:12, background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.15)', marginBottom:20 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>{selDoc.avatar}</div>
                    <div><div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{selDoc.name}</div><div style={{ fontSize:11, color:'var(--ink-3)' }}>{selDoc.specialty}</div></div>
                  </div>
                )}
                <div style={{ marginBottom:20 }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:8 }}>Preferred Date</label>
                  <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
                    style={{ width:'100%', height:44, borderRadius:12, padding:'0 14px', fontSize:14, outline:'none', background:'var(--frame)', color:'var(--ink)', border:'1px solid var(--line)', colorScheme:'light dark' }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:8 }}>Preferred Time</label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {TIME_SLOTS.map(t => (
                      <button key={t} onClick={() => setTime(t)}
                        style={{ padding:'9px 4px', borderRadius:10, fontSize:12, fontWeight:600, border:time===t?'2px solid #06b6d4':'1px solid var(--line)', background:time===t?'rgba(6,182,212,0.1)':'var(--bg)', color:time===t?'#06b6d4':'var(--ink-2)', cursor:'pointer', transition:'all .2s' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }} transition={{ duration:.25 }}>
                <div style={{ padding:'16px', borderRadius:16, background:'linear-gradient(135deg,rgba(6,182,212,0.06),rgba(122,77,255,0.06))', border:'1px solid rgba(6,182,212,0.15)', marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:12 }}>Appointment Summary</div>
                  {[
                    { k:'Doctor', v:selDoc?.name },
                    { k:'Date',   v:date ? new Date(date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric'}) : '—' },
                    { k:'Time',   v:time, accent:true },
                    { k:'Specialty', v:selDoc?.specialty },
                  ].map(r => (
                    <div key={r.k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, paddingBottom:6, marginBottom:6, borderBottom:'1px solid var(--line)' }}>
                      <span style={{ color:'var(--ink-3)' }}>{r.k}</span>
                      <span style={{ color:r.accent?'#06b6d4':'var(--ink)', fontWeight:600 }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:8 }}>
                    Reason <span style={{ textTransform:'none', fontWeight:400 }}>(optional)</span>
                  </label>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe your symptoms or reason for visit…"
                    style={{ width:'100%', height:96, borderRadius:12, padding:'11px 14px', fontSize:13, outline:'none', background:'var(--frame)', color:'var(--ink)', border:'1px solid var(--line)', resize:'none', lineHeight:1.55 }} />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <div style={{ padding:'16px 24px', borderTop:'1px solid var(--line)', display:'flex', gap:10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s-1)} style={{ flex:1, height:44, borderRadius:12, fontSize:13, fontWeight:600, color:'var(--ink-2)', background:'var(--line)', border:'none', cursor:'pointer' }}>← Back</button>
          )}
          {step < 2 && (
            <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }}
              disabled={(step===0&&!canNext0)||(step===1&&!canNext1)}
              onClick={() => setStep(s => s+1)}
              style={{ flex:2, height:44, borderRadius:12, fontSize:13, fontWeight:600, color:'white', background:'linear-gradient(135deg,#0ea5e9,#7a4dff)', border:'none', cursor:(step===0&&!canNext0)||(step===1&&!canNext1)?'not-allowed':'pointer', opacity:(step===0&&!canNext0)||(step===1&&!canNext1)?0.45:1, transition:'all .2s' }}>
              Continue →
            </motion.button>
          )}
          {step === 2 && (
            <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }} disabled={busy} onClick={submit}
              style={{ flex:2, height:44, borderRadius:12, fontSize:13, fontWeight:600, color:'white', background:'linear-gradient(135deg,#0ea5e9,#06b6d4 50%,#7a4dff)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:busy?.7:1 }}>
              {busy ? <span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin360 0.8s linear infinite', display:'inline-block' }} />
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              Confirm Booking
            </motion.button>
          )}
        </div>
      </motion.div>
    </>
  );
}

function ReviewModal({ user, doctors, onClose, onDone }) {
  const [selDoc, setSelDoc] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!selDoc || !rating) return;
    setBusy(true);
    setTimeout(() => {
      addReview({ patientId:user.id, patientName:user.name, patientAvatar:user.avatar, doctorId:selDoc.id, doctorName:selDoc.name, specialty:selDoc.specialty, rating, comment:comment.trim() });
      setBusy(false); onDone(); onClose();
    }, 600);
  };

  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(12px)', zIndex:700 }} />

      {/* Centering wrapper — flexbox handles position; Framer Motion only animates scale/opacity */}
      <div style={{ position:'fixed', inset:0, zIndex:701, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', pointerEvents:'none' }}>
      <motion.div initial={{ opacity:0, scale:.9, y:24 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:.88, y:24 }}
        transition={{ type:'spring', stiffness:300, damping:28 }}
        style={{
          width:'100%', maxWidth:500,
          maxHeight:'100%',
          pointerEvents:'all',
          borderRadius:24,
          background:'var(--frame)', border:'1px solid var(--glass-stroke)',
          boxShadow:'0 40px 80px -16px rgba(0,0,0,0.65)',
          display:'flex', flexDirection:'column', overflow:'hidden',
        }}>

        {/* Gradient accent bar */}
        <div style={{ height:3, background:'linear-gradient(90deg,#f59e0b,#ff7a9c,#7a4dff)', flexShrink:0 }} />

        {/* Fixed header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--line)', flexShrink:0, background:'linear-gradient(135deg,rgba(245,158,11,0.04),rgba(122,77,255,0.03))' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <h3 className="font-serif" style={{ fontSize:20, fontWeight:400, color:'var(--ink)', marginBottom:2 }}>Write a Review</h3>
              <p style={{ fontSize:12, color:'var(--ink-3)' }}>Share your experience to help others</p>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:'none', background:'var(--line)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-3)', flexShrink:0 }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* Doctor picker */}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:8 }}>Choose Doctor</label>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {doctors.map(d => (
                <button key={d.id} onClick={() => setSelDoc(d)}
                  style={{ padding:'11px 13px', borderRadius:12, border:selDoc?.id===d.id?'2px solid #f59e0b':'1px solid var(--line)', background:selDoc?.id===d.id?'rgba(245,158,11,0.07)':'var(--bg)', cursor:'pointer', display:'flex', alignItems:'center', gap:11, textAlign:'left', transition:'all .2s', boxShadow:selDoc?.id===d.id?'0 0 0 3px rgba(245,158,11,0.12)':'none' }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>{d.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{d.name}</div>
                    <div style={{ fontSize:11, color:'var(--ink-3)' }}>{d.specialty}</div>
                  </div>
                  {selDoc?.id===d.id
                    ? <div style={{ width:22, height:22, borderRadius:'50%', background:'#f59e0b', display:'grid', placeItems:'center', flexShrink:0 }}><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg></div>
                    : <div style={{ width:22, height:22, borderRadius:'50%', border:'1.5px solid var(--line)', flexShrink:0 }} />
                  }
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height:1, background:'var(--line)', marginBottom:20 }} />

          {/* Star rating */}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:12 }}>Your Rating</label>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <Stars value={rating} interactive onChange={setRating} size={38} />
                <AnimatePresence>
                  {rating > 0 && (
                    <motion.div initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
                      style={{ padding:'4px 12px', borderRadius:100, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', fontSize:13, fontWeight:700, color:'#f59e0b' }}>
                      {RATING_LABELS[rating]}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {rating === 0 && (
                <p style={{ fontSize:12, color:'var(--ink-3)', margin:0 }}>Click a star to rate this doctor</p>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:8 }}>
              Comments <span style={{ textTransform:'none', fontWeight:400, color:'var(--ink-3)' }}>(optional)</span>
            </label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={500}
              placeholder="Share what went well, or what could be improved…"
              style={{ width:'100%', height:100, borderRadius:12, padding:'12px 14px', fontSize:13, outline:'none', background:'var(--bg)', color:'var(--ink)', border:'1px solid var(--line)', resize:'none', lineHeight:1.6, boxSizing:'border-box', transition:'border-color .2s' }}
              onFocus={e => e.target.style.borderColor='rgba(245,158,11,0.5)'}
              onBlur={e => e.target.style.borderColor='var(--line)'}
            />
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4 }}>
              <span style={{ fontSize:10, color:'var(--ink-3)' }}>{comment.length}/500</span>
            </div>
          </div>
        </div>

        {/* Fixed footer with submit button */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--line)', flexShrink:0, background:'var(--frame)' }}>
          {(!selDoc || !rating) && (
            <p style={{ fontSize:11, color:'var(--ink-3)', textAlign:'center', marginBottom:10 }}>
              {!selDoc ? 'Select a doctor above to continue' : 'Choose a star rating to submit'}
            </p>
          )}
          <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }}
            disabled={!selDoc || !rating || busy} onClick={submit}
            style={{ width:'100%', height:48, borderRadius:14, fontSize:14, fontWeight:600, color:'white', background:'linear-gradient(135deg,#f59e0b,#ff7a9c 50%,#7a4dff)', border:'none', cursor:(!selDoc||!rating||busy)?'not-allowed':'pointer', opacity:(!selDoc||!rating)?0.45:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'opacity .2s', position:'relative', overflow:'hidden' }}>
            <span style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:8 }}>
              {busy
                ? <span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin360 0.8s linear infinite', display:'inline-block' }} />
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              Submit Review
            </span>
          </motion.button>
        </div>
      </motion.div>
      </div>
    </>
  );
}

export default function PatientDashboard() {
  const [user, setUser]           = useState(null);
  const [tab, setTab]             = useState('Overview');
  const [dark, setDark]           = useState(false);
  const [ready, setReady]         = useState(false);
  const [aiTyped, setAiTyped]     = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reviewOpen, setReviewOpen]   = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [approvedDocs, setApprovedDocs] = useState([]);
  const [docReviewsMap, setDocReviewsMap] = useState({});
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [cancellingId, setCancellingId]   = useState(null);
  const [acceptingId, setAcceptingId]     = useState(null);
  const [msgUnread, setMsgUnread]         = useState(0);
  const [selDoctor, setSelDoctor]         = useState(null);
  const [patConversations, setPatConversations] = useState([]);
  const [newChatOpen, setNewChatOpen]     = useState(false);

  const aiText = 'Based on your recent vitals, your cardiovascular health is within the optimal range. Your step count has increased 18% compared to last week. Neural AI recommends maintaining current activity levels and scheduling your annual cardiac screening for proactive care.';

  const loadData = (uid) => {
    initAuth();
    setAppointments(getAppointmentsByPatient(uid));
    const docs = getAllDoctors().filter(d => d.approved);
    setApprovedDocs(docs);
    const map = {};
    docs.forEach(d => { map[d.id] = getReviewsByDoctor(d.id); });
    setDocReviewsMap(map);
    setMsgUnread(getUnreadCount(uid));
    setPatConversations(getConversations(uid));
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.classList.toggle('dark', saved);
    const u = getCurrentUser();
    if (!u) { window.location.href = '/login'; return; }
    if (u.role !== 'patient') { window.location.href = `/dashboard/${u.role}`; return; }
    setUser(u);
    loadData(u.id);
    setReady(true);
  }, []);

  useEffect(() => {
    if (tab !== 'AI Insights') return;
    setAiTyped('');
    let i = 0;
    const t = setInterval(() => { i++; setAiTyped(aiText.slice(0, i)); if (i >= aiText.length) clearInterval(t); }, 20);
    return () => clearInterval(t);
  }, [tab]);

  useEffect(() => {
    if (!user || tab === 'Messages') return;
    const t = setInterval(() => setMsgUnread(getUnreadCount(user.id)), 3000);
    return () => clearInterval(t);
  }, [user, tab]);

  useEffect(() => {
    if (!user || tab !== 'Messages') return;
    const refresh = () => { setPatConversations(getConversations(user.id)); setMsgUnread(getUnreadCount(user.id)); };
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [user, tab]);

  const toggleDark = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleLogout = () => { logout(); window.location.href = '/login'; };

  const handleCancel = (id) => {
    setCancellingId(id);
    setTimeout(() => {
      cancelAppointment(id);
      setAppointments(getAppointmentsByPatient(user.id));
      setCancellingId(null);
    }, 500);
  };

  const handleAcceptAlt = (id) => {
    setAcceptingId(id);
    setTimeout(() => {
      acceptAlternative(id);
      setAppointments(getAppointmentsByPatient(user.id));
      setAcceptingId(null);
    }, 600);
  };

  if (!ready || !user) return (
    <div className="frame" style={{ minHeight:'calc(100vh - 28px)', display:'grid', placeItems:'center' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid var(--line)', borderTopColor:'#ff3d6e', animation:'spin360 0.8s linear infinite' }} />
        <p style={{ fontSize:13, color:'var(--ink-3)' }}>Loading dashboard…</p>
      </div>
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const upcomingAppts = appointments.filter(a => a.status !== 'cancelled').slice(0, 3);
  const activeAppts   = appointments.filter(a => a.status !== 'cancelled');
  const cancelledAppts = appointments.filter(a => a.status === 'cancelled');

  return (
    <div className="frame" style={{ minHeight:'calc(100vh - 28px)', overflow:'hidden', position:'relative' }}>
      <Particles />
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'5%', right:'5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(6,182,212,0.07),transparent 70%)', filter:'blur(70px)' }} />
        <div style={{ position:'absolute', bottom:'10%', left:'5%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,61,110,0.07),transparent 70%)', filter:'blur(60px)' }} />
      </div>

      {/* Top bar */}
      <motion.header initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:.6 }}
        style={{ position:'relative', zIndex:30, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, display:'grid', placeItems:'center', color:'white', fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:16, background:'radial-gradient(circle at 30% 30%,#ffb8c4,#ff5a7d 60%,#7a4dff)', position:'relative', overflow:'hidden' }}>
            N <span style={{ position:'absolute', inset:0, borderRadius:'inherit', background:'linear-gradient(135deg,rgba(255,255,255,0.35),transparent 50%)' }} />
          </div>
          <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.18em', color:'var(--ink)' }}>NEURAL <span style={{ fontWeight:400, color:'var(--ink-3)' }}> / AI BRAIN</span></span>
        </div>

        <nav style={{ display:'flex', alignItems:'center', gap:2, padding:4, borderRadius:100, background:'var(--frame)', border:'1px solid var(--line)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'7px 14px', borderRadius:100, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', transition:'all .25s', background:tab===t?'linear-gradient(135deg,#ff3d6e,#7a4dff)':'transparent', color:tab===t?'white':'var(--ink-2)', position:'relative', whiteSpace:'nowrap' }}>
              {t}
              {t === 'Appointments' && appointments.some(a => a.status === 'counter_proposed') && (
                <span style={{ position:'absolute', top:3, right:3, width:7, height:7, borderRadius:'50%', background:'#f97316', border:'1.5px solid var(--frame)', animation:'pulseDot 1.2s infinite' }} />
              )}
              {t === 'Appointments' && !appointments.some(a => a.status === 'counter_proposed') && activeAppts.length > 0 && (
                <span style={{ position:'absolute', top:3, right:3, width:7, height:7, borderRadius:'50%', background:'#06b6d4', border:'1.5px solid var(--frame)' }} />
              )}
              {t === 'Messages' && msgUnread > 0 && tab !== 'Messages' && (
                <span style={{ position:'absolute', top:2, right:2, minWidth:16, height:16, borderRadius:100, background:'#ff3d6e', color:'white', fontSize:9, fontWeight:800, display:'grid', placeItems:'center', border:'1.5px solid var(--frame)', padding:'0 3px', lineHeight:1 }}>{msgUnread}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div className="badge badge-patient">Patient</div>
          <DarkToggle dark={dark} toggle={toggleDark} />
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Avt initials={user.avatar||'P'} gradient="linear-gradient(135deg,#0ea5e9,#06b6d4)" size={34} />
            <span style={{ fontSize:13, fontWeight:500, color:'var(--ink)' }}>{user.firstName||user.name}</span>
          </div>
          <button onClick={handleLogout} style={{ padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:500, color:'var(--ink-2)', background:'var(--line)', border:'none', cursor:'pointer' }}>
            Logout
          </button>
        </div>
      </motion.header>

      <main style={{ position:'relative', zIndex:10, padding:'28px 28px 40px', overflowY:'auto', maxHeight:'calc(100vh - 100px)' }}>
        <AnimatePresence mode="wait">

          {/* ── Overview ── */}
          {tab === 'Overview' && (
            <motion.div key="overview" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }} transition={{ duration:.45 }}>
              <div style={{ marginBottom:28 }}>
                <h2 className="font-serif" style={{ fontSize:28, fontWeight:400, color:'var(--ink)', marginBottom:4 }}>
                  {greeting}, <em className="text-gradient">{user.firstName||user.name}</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--ink-3)' }}>{dateStr} · Your daily health snapshot</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
                {METRICS.map((m, i) => (
                  <motion.div key={m.label} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.08 }}
                    className="glass-card" style={{ padding:20, position:'relative', overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                      <div style={{ width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>{m.icon}</div>
                      {m.live && <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, color:'#22c55e' }}><span className="pulse-dot" style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e' }} /> LIVE</div>}
                    </div>
                    <div className="stat-number" style={{ fontSize:26, fontWeight:700, color:m.color, lineHeight:1, marginBottom:4 }}>{m.value}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>{m.unit}</div>
                    <div style={{ fontSize:12, color:'var(--ink-2)' }}>{m.label}</div>
                    <div style={{ fontSize:11, color:m.color, marginTop:6, fontWeight:500 }}>● {m.status}</div>
                    {m.waveform && <svg viewBox="0 0 44 16" style={{ position:'absolute', bottom:10, right:10, width:44, height:16, opacity:.5 }} fill="none"><polyline points={m.waveform.map((v,i)=>`${i*4},${16-v/4}`).join(' ')} stroke={m.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </motion.div>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:18, marginBottom:22 }}>
                <motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:.3 }} className="glass-card ai-scan" style={{ padding:24 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                    <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#ff3d6e,#7a4dff)', boxShadow:'0 4px 12px -4px rgba(255,61,110,0.4)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <div><div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Neural AI Health Analysis</div><div style={{ fontSize:11, color:'var(--ink-3)' }}>Updated · just now</div></div>
                    <div className="badge badge-approved" style={{ marginLeft:'auto' }}>All Clear</div>
                  </div>
                  <p style={{ fontSize:14, color:'var(--ink-2)', lineHeight:1.7 }}>
                    Based on your recent vitals, your cardiovascular health is within the <strong style={{ color:'var(--ink)' }}>optimal range</strong>. Step count has increased <strong style={{ color:'#22c55e' }}>+18%</strong> compared to last week.
                  </p>
                  <div style={{ marginTop:18, display:'flex', gap:10, flexWrap:'wrap' }}>
                    {['Cardiac: Excellent','Activity: Trending Up','Sleep: Good'].map(tag => (
                      <span key={tag} style={{ fontSize:11, padding:'3px 10px', borderRadius:100, background:'rgba(255,61,110,0.08)', color:'#ff6a8d', border:'1px solid rgba(255,61,110,0.15)' }}>{tag}</span>
                    ))}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay:.35 }} className="glass-card" style={{ padding:24 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Upcoming Appointments</div>
                    <button onClick={() => setTab('Appointments')} style={{ fontSize:12, color:'#06b6d4', cursor:'pointer', fontWeight:500, background:'none', border:'none' }}>View all →</button>
                  </div>
                  {upcomingAppts.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                      <div style={{ fontSize:13, color:'var(--ink-3)' }}>No upcoming appointments</div>
                      <button onClick={() => setBookingOpen(true)} style={{ marginTop:10, padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:600, color:'#06b6d4', background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)', cursor:'pointer' }}>Book one →</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {upcomingAppts.map((a, i) => {
                        const cfg = STATUS_CFG[a.status];
                        return (
                          <motion.div key={a.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.4+i*.08 }}
                            style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 12px', borderRadius:12, background:'var(--bg)', border:'1px solid var(--line)' }}>
                            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>{a.doctorAvatar}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.doctorName}</div>
                              <div style={{ fontSize:11, color:'var(--ink-3)' }}>{a.specialty}</div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-2)' }}>{new Date(a.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                              <div style={{ fontSize:11, color:cfg.color }}>{a.time}</div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </div>

              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.5 }} className="glass-card" style={{ padding:24 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:16 }}>Recent Test Results</div>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {REPORTS.map((r, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:i<REPORTS.length-1?'1px solid var(--line)':'none' }}>
                      <div style={{ fontSize:22 }}>{r.icon}</div>
                      <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500, color:'var(--ink)' }}>{r.title}</div><div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>{r.date}</div></div>
                      <div className="badge badge-approved">{r.status}</div>
                      <button style={{ fontSize:12, color:'#ff3d6e', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>View →</button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── Appointments ── */}
          {tab === 'Appointments' && (
            <motion.div key="appts" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <div>
                  <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:2 }}>My Appointments</h2>
                  <p style={{ fontSize:13, color:'var(--ink-3)' }}>{activeAppts.length} upcoming · {cancelledAppts.length} cancelled</p>
                </div>
                <motion.button whileHover={{ y:-2 }} whileTap={{ scale:.97 }} onClick={() => setBookingOpen(true)}
                  style={{ padding:'11px 20px', borderRadius:14, fontSize:13, fontWeight:600, color:'white', background:'linear-gradient(135deg,#0ea5e9,#06b6d4 50%,#7a4dff)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:'0 6px 20px -6px rgba(6,182,212,0.5)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Book New RDV
                </motion.button>
              </div>

              {/* Counter-proposed alert banner */}
              {appointments.some(a => a.status === 'counter_proposed') && (
                <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ type:'spring', stiffness:280, damping:24 }}
                  style={{ marginBottom:18, padding:'14px 18px', borderRadius:16, background:'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(245,158,11,0.08))', border:'1px solid rgba(249,115,22,0.3)', display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#f97316,#f59e0b)', display:'grid', placeItems:'center', flexShrink:0, boxShadow:'0 4px 12px -4px rgba(249,115,22,0.5)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>
                      {appointments.filter(a => a.status === 'counter_proposed').length === 1
                        ? 'A doctor proposed a new appointment time'
                        : `${appointments.filter(a => a.status === 'counter_proposed').length} doctors proposed new times`}
                    </div>
                    <div style={{ fontSize:12, color:'var(--ink-3)' }}>Review the proposals below and accept or decline</div>
                  </div>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#f97316', animation:'pulseDot 1.2s infinite', flexShrink:0 }} />
                </motion.div>
              )}

              {activeAppts.length === 0 && cancelledAppts.length === 0 ? (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="glass-card" style={{ padding:48, textAlign:'center' }}>
                  <div style={{ width:64, height:64, borderRadius:20, background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No appointments yet</div>
                  <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:20 }}>Book your first appointment with a doctor</div>
                  <motion.button whileHover={{ y:-1 }} onClick={() => setBookingOpen(true)}
                    style={{ padding:'11px 24px', borderRadius:12, fontSize:13, fontWeight:600, color:'white', background:'linear-gradient(135deg,#0ea5e9,#7a4dff)', border:'none', cursor:'pointer' }}>
                    Book Now →
                  </motion.button>
                </motion.div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <AnimatePresence>
                    {activeAppts.map((a, i) => {
                      const cfg = STATUS_CFG[a.status] || STATUS_CFG.pending;
                      const isProposal = a.status === 'counter_proposed';
                      return (
                        <motion.div key={a.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:40, height:0, overflow:'hidden' }} transition={{ delay:i*.06, exit:{duration:.3} }}
                          className="glass-card" style={{ position:'relative', overflow:'hidden', border: isProposal ? '1px solid rgba(249,115,22,0.3)' : undefined }}>
                          {isProposal && (
                            <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(249,115,22,0.03),transparent)', pointerEvents:'none', zIndex:0 }} />
                          )}
                          <div style={{ padding:'20px 22px', position:'relative', zIndex:1 }}>
                            <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:`linear-gradient(180deg,${cfg.color},${cfg.color}88)`, borderRadius:'3px 0 0 3px' }} />
                            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                              <div style={{ position:'relative', flexShrink:0 }}>
                                <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:16, fontWeight:700, color:'white' }}>{a.doctorAvatar}</div>
                                {isProposal && (
                                  <div style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#f97316', border:'2px solid var(--frame)', display:'grid', placeItems:'center' }}>
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                                  </div>
                                )}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                                  <span style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>{a.doctorName}</span>
                                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:100, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
                                    {isProposal && '🔔 '}{cfg.label}
                                  </span>
                                </div>
                                <div style={{ fontSize:12, color:'var(--ink-2)', marginBottom:5 }}>{a.specialty}</div>
                                {a.reason && <div style={{ fontSize:12, color:'var(--ink-3)', fontStyle:'italic' }}>"{a.reason}"</div>}
                              </div>
                              <div style={{ textAlign:'right', flexShrink:0 }}>
                                <div style={{ fontSize:14, fontWeight:700, color: isProposal ? 'var(--ink-3)' : 'var(--ink)', marginBottom:3, textDecoration: isProposal ? 'line-through' : 'none', opacity: isProposal ? 0.55 : 1 }}>
                                  {new Date(a.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                                </div>
                                <div style={{ fontSize:13, fontWeight:600, color: isProposal ? 'var(--ink-3)' : cfg.color, marginBottom: isProposal ? 4 : 10, textDecoration: isProposal ? 'line-through' : 'none', opacity: isProposal ? 0.55 : 1 }}>{a.time}</div>
                                {isProposal && (
                                  <div style={{ fontSize:11, color:'#f97316', fontWeight:600, marginBottom:10 }}>
                                    → {new Date(a.altDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} at {a.altTime}
                                  </div>
                                )}
                                {!isProposal && a.status !== 'cancelled' && (
                                  <button disabled={cancellingId===a.id} onClick={() => handleCancel(a.id)}
                                    style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:600, color:'#ef4444', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                                    {cancellingId===a.id ? <span style={{ width:10, height:10, borderRadius:'50%', border:'1.5px solid rgba(239,68,68,0.3)', borderTopColor:'#ef4444', animation:'spin360 0.8s linear infinite', display:'inline-block' }} /> : '✕'} Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Counter-proposed expansion */}
                          {isProposal && (
                            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.15 }}
                              style={{ margin:'0 16px 16px', padding:'16px', borderRadius:14, background:'linear-gradient(135deg,rgba(249,115,22,0.08),rgba(245,158,11,0.06))', border:'1px solid rgba(249,115,22,0.25)', position:'relative', zIndex:1 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                <span style={{ fontSize:12, fontWeight:700, color:'#f97316' }}>{a.doctorName} proposed a new time</span>
                              </div>

                              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: a.altNote ? 12 : 16 }}>
                                <div style={{ flex:1, padding:'10px 14px', borderRadius:10, background:'rgba(0,0,0,0.06)', border:'1px solid var(--line)', textAlign:'center' }}>
                                  <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-3)', marginBottom:4 }}>New Date</div>
                                  <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>
                                    {new Date(a.altDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric'})}
                                  </div>
                                </div>
                                <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.2)', textAlign:'center', flexShrink:0 }}>
                                  <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ink-3)', marginBottom:4 }}>Time</div>
                                  <div style={{ fontSize:16, fontWeight:800, color:'#f97316' }}>{a.altTime}</div>
                                </div>
                              </div>

                              {a.altNote && (
                                <div style={{ marginBottom:14, padding:'10px 13px', borderRadius:10, background:'var(--bg)', border:'1px solid var(--line)', display:'flex', gap:8, alignItems:'flex-start' }}>
                                  <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:8, fontWeight:700, color:'white', flexShrink:0 }}>{a.doctorAvatar}</div>
                                  <p style={{ fontSize:12, color:'var(--ink-2)', margin:0, lineHeight:1.6, fontStyle:'italic' }}>"{a.altNote}"</p>
                                </div>
                              )}

                              <div style={{ display:'flex', gap:8 }}>
                                <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }}
                                  disabled={acceptingId===a.id} onClick={() => handleAcceptAlt(a.id)}
                                  style={{ flex:2, height:40, borderRadius:11, fontSize:13, fontWeight:700, color:'white', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:'0 4px 14px -4px rgba(34,197,94,0.5)', opacity:acceptingId===a.id?0.7:1 }}>
                                  {acceptingId===a.id
                                    ? <span style={{ width:12, height:12, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin360 0.8s linear infinite', display:'inline-block' }} />
                                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                  Accept New Time
                                </motion.button>
                                <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }}
                                  disabled={cancellingId===a.id} onClick={() => handleCancel(a.id)}
                                  style={{ flex:1, height:40, borderRadius:11, fontSize:12, fontWeight:600, color:'#ef4444', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                  {cancellingId===a.id ? <span style={{ width:10, height:10, borderRadius:'50%', border:'1.5px solid rgba(239,68,68,0.3)', borderTopColor:'#ef4444', animation:'spin360 0.8s linear infinite', display:'inline-block' }} /> : '✕'} Decline
                                </motion.button>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {cancelledAppts.length > 0 && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:10 }}>Cancelled</div>
                      {cancelledAppts.map((a, i) => (
                        <div key={a.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:12, background:'var(--bg)', border:'1px solid var(--line)', marginBottom:8, opacity:.6 }}>
                          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#a4abbb,#5e6471)', display:'grid', placeItems:'center', fontSize:11, fontWeight:700, color:'white' }}>{a.doctorAvatar}</div>
                          <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{a.doctorName}</div><div style={{ fontSize:11, color:'var(--ink-3)' }}>{new Date(a.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · {a.time}</div></div>
                          <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:100, background:'rgba(164,171,187,0.15)', color:'var(--ink-3)', border:'1px solid var(--line)' }}>Cancelled</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Messages ── */}
          {tab === 'Messages' && (
            <motion.div key="messages" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                  <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:2 }}>Messages</h2>
                  <p style={{ fontSize:13, color:'var(--ink-3)' }}>
                    {selDoctor
                      ? <span>Chatting with <strong style={{ color:'var(--ink)' }}>{selDoctor.name}</strong></span>
                      : `${patConversations.length} conversation${patConversations.length!==1?'s':''} · Secure & private`}
                  </p>
                </div>
                <motion.button whileHover={{ y:-2 }} whileTap={{ scale:.97 }} onClick={() => setNewChatOpen(true)}
                  style={{ padding:'10px 18px', borderRadius:13, fontSize:13, fontWeight:600, color:'white', background:'linear-gradient(135deg,#0ea5e9,#06b6d4 50%,#7a4dff)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:'0 6px 20px -6px rgba(6,182,212,0.5)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Chat
                </motion.button>
              </div>

              {/* Two-panel layout */}
              {(() => {
                // Build doctor list: conversations + appointment doctors + no duplicates
                const convDocIds = patConversations.map(c => c.partnerId);
                const apptDocIds = appointments.filter(a=>a.status!=='cancelled').map(a=>a.doctorId);
                const allIds = [...new Set([...convDocIds, ...apptDocIds, user?.assignedDoctorId].filter(Boolean))];
                const displayDocs = allIds
                  .map(id => approvedDocs.find(d=>d.id===id) || getUserById(id))
                  .filter(Boolean)
                  .sort((a,b) => {
                    const ca = patConversations.find(c=>c.partnerId===a.id);
                    const cb = patConversations.find(c=>c.partnerId===b.id);
                    if (ca && !cb) return -1; if (!ca && cb) return 1;
                    if (ca && cb) {
                      if (cb.unreadCount !== ca.unreadCount) return cb.unreadCount - ca.unreadCount;
                      return new Date(cb.lastTimestamp) - new Date(ca.lastTimestamp);
                    }
                    return 0;
                  });

                return (
                  <div style={{ display:'grid', gridTemplateColumns:'296px 1fr', gap:16, height:'calc(100vh - 230px)' }}>

                    {/* ── Left: Doctor sidebar ── */}
                    <div className="glass-card" style={{ overflow:'hidden', display:'flex', flexDirection:'column', padding:0 }}>
                      {/* Sidebar header */}
                      <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid var(--line)', flexShrink:0 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:10 }}>Your Doctors</div>
                        <div style={{ fontSize:12, color:'var(--ink-3)' }}>
                          {displayDocs.length === 0 ? 'No doctors yet' : `${displayDocs.length} doctor${displayDocs.length!==1?'s':''}${msgUnread>0?` · ${msgUnread} unread`:''}`}
                        </div>
                      </div>

                      <div style={{ flex:1, overflowY:'auto' }}>
                        {displayDocs.length === 0 ? (
                          <div style={{ padding:'32px 20px', textAlign:'center' }}>
                            <div style={{ fontSize:32, marginBottom:10 }}>🩺</div>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No doctors yet</div>
                            <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.6, marginBottom:16 }}>Book an appointment or tap<br/>"New Chat" to connect</div>
                            <button onClick={() => setBookingOpen(true)} style={{ padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:600, color:'#06b6d4', background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)', cursor:'pointer' }}>
                              Book Now →
                            </button>
                          </div>
                        ) : displayDocs.map((doc, i) => {
                          const conv = patConversations.find(c => c.partnerId === doc.id);
                          const unread = conv?.unreadCount || 0;
                          const isSel = selDoctor?.id === doc.id;
                          const rt = getDoctorRating(doc.id);
                          return (
                            <motion.button key={doc.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*.04 }}
                              onClick={() => setSelDoctor(doc)}
                              style={{ width:'100%', padding:'13px 16px', border:'none', borderBottom:'1px solid var(--line)', cursor:'pointer', textAlign:'left', background:isSel?'rgba(6,182,212,0.07)':'transparent', transition:'background .2s', position:'relative', borderLeft: isSel?'3px solid #06b6d4':'3px solid transparent' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                                <div style={{ position:'relative', flexShrink:0 }}>
                                  <div style={{ width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#ff7a9c,#7a4dff)',display:'grid',placeItems:'center',fontSize:14,fontWeight:700,color:'white' }}>{doc.avatar}</div>
                                  <div style={{ position:'absolute',bottom:-1,right:-1,width:12,height:12,borderRadius:'50%',background:'#22c55e',border:'2px solid var(--frame)' }}/>
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
                                    <span style={{ fontSize:13, fontWeight:unread>0?700:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{doc.name}</span>
                                    {conv && <span style={{ fontSize:10, color:'var(--ink-3)', flexShrink:0 }}>{fmtMsgTime(conv.lastTimestamp)}</span>}
                                  </div>
                                  <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:3 }}>{doc.specialty}</div>
                                  <div style={{ fontSize:11, color: unread>0?'var(--ink-2)':'var(--ink-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:unread>0?500:400 }}>
                                    {conv ? conv.lastMessage : '— No messages yet'}
                                  </div>
                                </div>
                                {unread > 0 && (
                                  <div style={{ minWidth:20,height:20,borderRadius:100,background:'#ff3d6e',color:'white',fontSize:10,fontWeight:800,display:'grid',placeItems:'center',flexShrink:0,padding:'0 5px' }}>{unread}</div>
                                )}
                              </div>
                              {rt.avg > 0 && (
                                <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6, paddingLeft:55 }}>
                                  <Stars value={Math.round(rt.avg)} size={10} />
                                  <span style={{ fontSize:10, color:'var(--ink-3)' }}>{rt.avg}</span>
                                </div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Right: Chat or empty state ── */}
                    <div className="glass-card" style={{ overflow:'hidden', display:'flex', flexDirection:'column', padding:0, position:'relative' }}>
                      {/* decorative bg */}
                      <div style={{ position:'absolute',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden' }}>
                        <div style={{ position:'absolute',top:'8%',right:'6%',width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(6,182,212,0.05),transparent 70%)',filter:'blur(40px)' }}/>
                        <div style={{ position:'absolute',bottom:'10%',left:'5%',width:220,height:220,borderRadius:'50%',background:'radial-gradient(circle,rgba(122,77,255,0.05),transparent 70%)',filter:'blur(35px)' }}/>
                      </div>
                      <div style={{ position:'relative',zIndex:1,flex:1,display:'flex',flexDirection:'column',minHeight:0 }}>
                        {selDoctor ? (
                          <PatientChat key={selDoctor.id} user={user} doctor={selDoctor} />
                        ) : (
                          <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:'40px 32px',textAlign:'center' }}>
                            <motion.div initial={{ scale:.85,opacity:0 }} animate={{ scale:1,opacity:1 }} transition={{ type:'spring',stiffness:200,delay:.15 }}
                              style={{ width:84,height:84,borderRadius:24,background:'linear-gradient(135deg,rgba(6,182,212,0.1),rgba(122,77,255,0.1))',border:'1px solid rgba(6,182,212,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            </motion.div>
                            <div>
                              <div style={{ fontSize:17,fontWeight:600,color:'var(--ink)',marginBottom:6 }}>Select a doctor to chat</div>
                              <div style={{ fontSize:13,color:'var(--ink-3)',lineHeight:1.7,maxWidth:280 }}>
                                {displayDocs.length > 0
                                  ? 'Pick a doctor from the list on the left to view and send messages'
                                  : 'Book an appointment or start a new conversation with any available doctor'}
                              </div>
                            </div>
                            {displayDocs.length > 0 ? (
                              <div style={{ display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center' }}>
                                {displayDocs.slice(0,3).map(d => {
                                  const conv = patConversations.find(c=>c.partnerId===d.id);
                                  const unread = conv?.unreadCount || 0;
                                  return (
                                    <motion.button key={d.id} whileHover={{ y:-2 }} onClick={() => setSelDoctor(d)}
                                      style={{ display:'flex',alignItems:'center',gap:9,padding:'10px 16px',borderRadius:14,border:`1px solid ${unread>0?'rgba(255,61,110,0.3)':'var(--line)'}`,background:unread>0?'rgba(255,61,110,0.05)':'var(--bg)',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--ink-2)',transition:'all .2s',position:'relative' }}>
                                      <div style={{ width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#ff7a9c,#7a4dff)',display:'grid',placeItems:'center',fontSize:9,fontWeight:700,color:'white' }}>{d.avatar}</div>
                                      <span>{d.name.replace('Dr. ','Dr.')}</span>
                                      {unread > 0 && <span style={{ width:8,height:8,borderRadius:'50%',background:'#ff3d6e',display:'inline-block' }} />}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center' }}>
                                <motion.button whileHover={{ y:-1 }} onClick={() => setBookingOpen(true)}
                                  style={{ padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:600,color:'white',background:'linear-gradient(135deg,#0ea5e9,#7a4dff)',border:'none',cursor:'pointer',boxShadow:'0 4px 16px -4px rgba(14,165,233,0.5)' }}>
                                  Book Appointment →
                                </motion.button>
                                <motion.button whileHover={{ y:-1 }} onClick={() => setNewChatOpen(true)}
                                  style={{ padding:'10px 20px',borderRadius:12,fontSize:13,fontWeight:600,color:'#06b6d4',background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',cursor:'pointer' }}>
                                  Browse Doctors →
                                </motion.button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ── Reviews ── */}
          {tab === 'Reviews' && (
            <motion.div key="reviews" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <div>
                  <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:2 }}>Doctor Reviews</h2>
                  <p style={{ fontSize:13, color:'var(--ink-3)' }}>Ratings and feedback from our patients</p>
                </div>
                <motion.button whileHover={{ y:-2 }} whileTap={{ scale:.97 }} onClick={() => setReviewOpen(true)}
                  style={{ padding:'11px 20px', borderRadius:14, fontSize:13, fontWeight:600, color:'white', background:'linear-gradient(135deg,#f59e0b,#ff7a9c 50%,#7a4dff)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:'0 6px 20px -6px rgba(245,158,11,0.4)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Write a Review
                </motion.button>
              </div>

              {approvedDocs.length === 0 ? (
                <div className="glass-card" style={{ padding:48, textAlign:'center', color:'var(--ink-3)', fontSize:13 }}>No approved doctors to review yet.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {approvedDocs.map((doc, i) => {
                    const rt = getDoctorRating(doc.id);
                    const reviews = docReviewsMap[doc.id] || [];
                    const isExpanded = expandedDoc === doc.id;
                    const myReview = reviews.find(r => r.patientId === user.id);

                    return (
                      <motion.div key={doc.id} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.08 }}
                        className="glass-card" style={{ overflow:'hidden' }}>
                        <div style={{ padding:'20px 22px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                            <div style={{ position:'relative', flexShrink:0 }}>
                              <div style={{ width:54, height:54, borderRadius:15, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:17, fontWeight:700, color:'white', boxShadow:'0 6px 16px -4px rgba(255,61,110,0.4)' }}>{doc.avatar}</div>
                              <div style={{ position:'absolute', bottom:-2, right:-2, width:16, height:16, borderRadius:'50%', background:'#22c55e', border:'2.5px solid var(--frame)', display:'grid', placeItems:'center' }}>
                                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><polyline points="1 5 4 8 9 2" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                              </div>
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{doc.name}</div>
                              <div style={{ fontSize:12, color:'var(--ink-2)', marginBottom:8 }}>{doc.specialty} · {doc.hospital}</div>
                              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <Stars value={Math.round(rt.avg)} size={15} />
                                {rt.count > 0 ? (
                                  <span style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>{rt.avg}</span>
                                ) : null}
                                <span style={{ fontSize:12, color:'var(--ink-3)' }}>{rt.count > 0 ? `${rt.count} review${rt.count>1?'s':''}` : 'No reviews yet'}</span>
                              </div>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                              <button onClick={() => { setReviewOpen(true); }}
                                style={{ padding:'7px 13px', borderRadius:10, fontSize:12, fontWeight:600, color: myReview ? '#f59e0b' : '#7a4dff', background: myReview ? 'rgba(245,158,11,0.08)' : 'rgba(122,77,255,0.08)', border: myReview ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(122,77,255,0.2)', cursor:'pointer' }}>
                                {myReview ? '✏ Edit Review' : '+ Review'}
                              </button>
                              {reviews.length > 0 && (
                                <button onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                                  style={{ padding:'7px 13px', borderRadius:10, fontSize:12, fontWeight:600, color:'var(--ink-2)', background:'var(--line)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                                  {reviews.length} review{reviews.length>1?'s':''}
                                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform:isExpanded?'rotate(180deg)':'rotate(0deg)', transition:'transform .3s' }}>
                                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && reviews.length > 0 && (
                            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:.35 }}
                              style={{ overflow:'hidden', borderTop:'1px solid var(--line)' }}>
                              <div style={{ padding:'16px 22px', display:'flex', flexDirection:'column', gap:10 }}>
                                {reviews.map((r, ri) => (
                                  <motion.div key={r.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:ri*.05 }}
                                    style={{ padding:'14px 16px', borderRadius:14, background:'var(--bg)', border:'1px solid var(--line)', position:'relative' }}>
                                    {r.patientId === user.id && (
                                      <div style={{ position:'absolute', top:10, right:12, fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:100, background:'rgba(122,77,255,0.1)', color:'#7a4dff', border:'1px solid rgba(122,77,255,0.2)' }}>Your review</div>
                                    )}
                                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                                      <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#06b6d4)', display:'grid', placeItems:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0 }}>{r.patientAvatar}</div>
                                      <div style={{ flex:1 }}>
                                        <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{r.patientName}</div>
                                        <div style={{ fontSize:11, color:'var(--ink-3)' }}>{timeAgo(r.created)}</div>
                                      </div>
                                      <Stars value={r.rating} size={13} />
                                    </div>
                                    {r.comment && <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.6, margin:'0 0 0 0' }}>"{r.comment}"</p>}

                                    {/* Doctor reply */}
                                    {r.doctorResponse && (
                                      <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}
                                        style={{ marginTop:12, paddingTop:12, borderTop:'1px dashed var(--line)', display:'flex', gap:10 }}>
                                        <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:9, fontWeight:700, color:'white', flexShrink:0 }}>
                                          {(r.doctorName||'').split(' ').filter(w=>/[A-Z]/.test(w[0])).map(w=>w[0]).join('').slice(0,2)||'DR'}
                                        </div>
                                        <div style={{ flex:1 }}>
                                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                                            <span style={{ fontSize:11, fontWeight:700, color:'var(--ink)' }}>{r.doctorName}</span>
                                            <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:100, background:'rgba(255,61,110,0.08)', border:'1px solid rgba(255,61,110,0.18)', color:'#ff6a8d', letterSpacing:'0.05em' }}>DOCTOR</span>
                                            {r.responseDate && <span style={{ fontSize:10, color:'var(--ink-3)', marginLeft:'auto' }}>{timeAgo(r.responseDate)}</span>}
                                          </div>
                                          <p style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.6, margin:0 }}>{r.doctorResponse}</p>
                                        </div>
                                      </motion.div>
                                    )}
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Reports ── */}
          {tab === 'Reports' && (
            <motion.div key="reports" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }}>
              <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:22 }}>Medical Reports</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {REPORTS.map((r, i) => (
                  <motion.div key={i} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.08 }}
                    className="glass-card" style={{ padding:22, display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ fontSize:32 }}>{r.icon}</div>
                    <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:4 }}>{r.title}</div><div style={{ fontSize:12, color:'var(--ink-3)' }}>{r.date}</div></div>
                    <div className="badge badge-approved">{r.status}</div>
                    <button style={{ padding:'8px 18px', borderRadius:10, fontSize:12, fontWeight:500, color:'#ff3d6e', background:'rgba(255,61,110,0.08)', border:'1px solid rgba(255,61,110,0.2)', cursor:'pointer' }}>Download</button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Brain Scan ── */}
          {tab === 'Brain Scan' && <BrainScanTab />}

          {/* ── AI Insights ── */}
          {tab === 'AI Insights' && (
            <motion.div key="ai" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }}>
              <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:22 }}>
                Neural <em className="text-gradient">AI Insights</em>
              </h2>
              <div className="glass-card ai-scan" style={{ padding:30 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
                  <div style={{ width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#ff3d6e,#7a4dff)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <div><div style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>Personalized Health Analysis</div><div style={{ fontSize:12, color:'var(--ink-3)' }}>AI-generated · May 7, 2026</div></div>
                  <div className="badge badge-approved" style={{ marginLeft:'auto' }}>All systems normal</div>
                </div>
                <p style={{ fontSize:15, color:'var(--ink-2)', lineHeight:1.8, minHeight:80 }}>
                  {aiTyped}<span style={{ display:'inline-block', width:2, height:16, background:'#ff3d6e', marginLeft:2, animation:'pulseDot 1s infinite' }} />
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <AnimatePresence>
        {bookingOpen && <BookingPanel user={user} doctors={approvedDocs} onClose={() => setBookingOpen(false)} onDone={() => loadData(user.id)} />}
        {reviewOpen  && <ReviewModal  user={user} doctors={approvedDocs} onClose={() => setReviewOpen(false)}  onDone={() => loadData(user.id)} />}
        {newChatOpen && <NewChatPanel approvedDocs={approvedDocs} onClose={() => setNewChatOpen(false)} onStart={(doc) => { setSelDoctor(doc); setTab('Messages'); }} />}
      </AnimatePresence>
    </div>
  );
}
