'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCurrentUser, logout, getAllDoctors, initAuth, getUserById,
  bookAppointment, getAppointmentsByPatient, cancelAppointment,
  addReview, getReviewsByDoctor, getDoctorRating, acceptAlternative,
  sendMessage, getMessagesBetween, markMessagesRead, getUnreadCount, getConversations,
  requestChatPermission, getChatPermission, getPatientScanReports,
} from '@/lib/auth';
import Particles from '@/components/Particles';
import NeuralChatbot from '@/components/NeuralChatbot';
import BrainRegionAnalysis from '@/components/BrainRegionAnalysis';

const TABS = ['Overview', 'Appointments', 'Messages', 'Reviews', 'Reports', 'AI Insights'];
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
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const endRef    = useRef(null);
  const pollRef   = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);

  const load = () => {
    const msgs = getMessagesBetween(user.id, doctor.id);
    setMessages(msgs);
    markMessagesRead(doctor.id, user.id);
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 2000);
    return () => clearInterval(pollRef.current);
  }, [doctor.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview({ dataUrl: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const send = () => {
    if (imgPreview) {
      setSending(true);
      sendMessage({ fromId:user.id, fromName:user.name, fromAvatar:user.avatar, fromRole:'patient', toId:doctor.id, toName:doctor.name, toAvatar:doctor.avatar, toRole:'doctor', text:'[Brain scan image]', type:'image', imageData:imgPreview.dataUrl });
      setImgPreview(null);
      setSending(false);
      load();
      return;
    }
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    sendMessage({ fromId:user.id, fromName:user.name, fromAvatar:user.avatar, fromRole:'patient', toId:doctor.id, toName:doctor.name, toAvatar:doctor.avatar, toRole:'doctor', text, type:'text' });
    setInput('');
    setSending(false);
    load();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const groups = [];
  let lastDate = '';
  messages.forEach(m => {
    const d = new Date(m.timestamp).toDateString();
    if (d !== lastDate) { groups.push({ type:'divider', label:fmtDivider(m.timestamp), key:`div-${m.timestamp}` }); lastDate = d; }
    groups.push({ type:'msg', ...m });
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 220px)', borderRadius:20, overflow:'hidden', border:'1px solid var(--line)', boxShadow:'0 8px 40px -12px rgba(0,0,0,0.3)', position:'relative' }}>
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
              <div style={{ fontSize:12, color:'var(--ink-3)' }}>Send a message or share a brain scan image</div>
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
          const next = groups[gi + 1];
          const isLast = !(next?.type === 'msg' && next.fromId === g.fromId);

          // ── Scan report message ──
          if (g.type === 'scan_report') {
            const rd = g.reportData || {};
            const tumorSafe = rd.tumorClass === 'notumor';
            const strokeSafe = rd.strokeDetected === false;
            return (
              <motion.div key={g.id} initial={{ opacity:0, y:12, scale:.96 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ duration:.25 }}
                style={{ display:'flex', flexDirection:'row', alignItems:'flex-end', gap:8, marginBottom:12 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#7a4dff,#7C3AED)', display:'grid', placeItems:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0 }}>{g.fromAvatar}</div>
                <div style={{ maxWidth:'82%', borderRadius:18, overflow:'hidden', border:'1px solid rgba(122,77,255,0.25)', boxShadow:'0 8px 32px -8px rgba(122,77,255,0.2)' }}>
                  {/* Header */}
                  <div style={{ padding:'12px 16px', background:'linear-gradient(135deg,rgba(122,77,255,0.12),rgba(124,58,237,0.08))', borderBottom:'1px solid rgba(122,77,255,0.15)', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#7a4dff,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z"/><circle cx="12" cy="8" r="2"/></svg>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>Brain Scan Report</div>
                      <div style={{ fontSize:10, color:'var(--ink-3)' }}>From {g.fromName} · {fmtMsgTime(g.timestamp)}</div>
                    </div>
                    <div style={{ padding:'3px 9px', borderRadius:100, background:'rgba(122,77,255,0.12)', border:'1px solid rgba(122,77,255,0.25)', fontSize:9, fontWeight:800, color:'#7a4dff', letterSpacing:'0.08em' }}>OFFICIAL</div>
                  </div>
                  {/* Results */}
                  <div style={{ padding:'14px 16px', background:'var(--frame)', display:'flex', flexDirection:'column', gap:8 }}>
                    {rd.tumorLabel && (
                      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'var(--bg)', border:`1px solid ${tumorSafe?'rgba(34,197,94,0.2)':'rgba(226,75,74,0.2)'}` }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background: tumorSafe?'#22c55e':'#E24B4A', flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink)' }}>Tumor Analysis</div>
                          <div style={{ fontSize:10, color:'var(--ink-3)' }}>{rd.tumorLabel} · {rd.tumorConfidence}% confidence</div>
                        </div>
                        <div style={{ padding:'2px 8px', borderRadius:100, background: tumorSafe?'rgba(34,197,94,0.1)':'rgba(226,75,74,0.1)', border:`1px solid ${tumorSafe?'rgba(34,197,94,0.25)':'rgba(226,75,74,0.25)'}`, fontSize:9, fontWeight:700, color:tumorSafe?'#22c55e':'#E24B4A' }}>
                          {tumorSafe ? 'CLEAR' : 'DETECTED'}
                        </div>
                      </div>
                    )}
                    {rd.strokeDetected !== undefined && (
                      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'var(--bg)', border:`1px solid ${strokeSafe?'rgba(6,182,212,0.2)':'rgba(124,58,237,0.25)'}` }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background: strokeSafe?'#06b6d4':'#7C3AED', flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--ink)' }}>Stroke Screening</div>
                          <div style={{ fontSize:10, color:'var(--ink-3)' }}>{rd.strokeDetected?'Stroke signs detected':'No stroke signs'} · {rd.strokeConfidence}% confidence</div>
                        </div>
                        <div style={{ padding:'2px 8px', borderRadius:100, background: strokeSafe?'rgba(6,182,212,0.1)':'rgba(124,58,237,0.1)', border:`1px solid ${strokeSafe?'rgba(6,182,212,0.25)':'rgba(124,58,237,0.25)'}`, fontSize:9, fontWeight:700, color:strokeSafe?'#06b6d4':'#7C3AED' }}>
                          {strokeSafe ? 'CLEAR' : 'ALERT'}
                        </div>
                      </div>
                    )}
                    {rd.doctorNote && (
                      <div style={{ padding:'10px 12px', borderRadius:12, background:'linear-gradient(135deg,rgba(122,77,255,0.05),rgba(255,61,110,0.03))', border:'1px solid rgba(122,77,255,0.15)' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#7a4dff', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          Doctor's Note
                        </div>
                        <div style={{ fontSize:11, color:'var(--ink-2)', lineHeight:1.55 }}>{rd.doctorNote}</div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div key={g.id} initial={{ opacity:0, y:10, scale:.97 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ duration:.2 }}
              style={{ display:'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems:'flex-end', gap:8, marginBottom: isLast ? 6 : 2 }}>

              {!isMe && (
                <div style={{ width:30, height:30, borderRadius:'50%', background: isLast ? 'linear-gradient(135deg,#ff7a9c,#7a4dff)' : 'transparent', display:'grid', placeItems:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0, visibility: isLast ? 'visible' : 'hidden' }}>
                  {g.fromAvatar}
                </div>
              )}

              <div style={{ maxWidth:'70%', display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                {g.type === 'image' && g.imageData ? (
                  <div style={{ borderRadius: isMe?`16px 16px ${isLast?'4px':'16px'} 16px`:`16px 16px 16px ${isLast?'4px':'16px'}`, overflow:'hidden', border:'1px solid var(--line)', maxWidth:220, boxShadow: isMe?'0 4px 16px -4px rgba(14,165,233,0.4)':'0 2px 8px -4px rgba(0,0,0,0.15)' }}>
                    <img src={g.imageData} alt="scan" style={{ width:'100%', display:'block', objectFit:'cover', maxHeight:180 }} />
                    <div style={{ padding:'6px 10px', background: isMe?'linear-gradient(135deg,#0ea5e9,#7a4dff)':'var(--frame)', display:'flex', alignItems:'center', gap:5, fontSize:10, color: isMe?'rgba(255,255,255,0.8)':'var(--ink-3)', fontWeight:500 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z" strokeLinejoin="round"/></svg>
                      Brain scan image sent to doctor
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:'10px 14px', borderRadius: isMe?`16px 16px ${isLast?'4px':'16px'} 16px`:`16px 16px 16px ${isLast?'4px':'16px'}`, background: isMe?'linear-gradient(135deg,#0ea5e9,#7a4dff)':'var(--frame)', border: isMe?'none':'1px solid var(--line)', color: isMe?'white':'var(--ink-2)', fontSize:14, lineHeight:1.55, boxShadow: isMe?'0 4px 16px -4px rgba(14,165,233,0.4)':'0 2px 8px -4px rgba(0,0,0,0.15)', wordBreak:'break-word' }}>
                    {g.text}
                  </div>
                )}
                {isLast && (
                  <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3, opacity:0.6 }}>
                    <span style={{ fontSize:10, color:'var(--ink-3)' }}>{fmtMsgTime(g.timestamp)}</span>
                    {isMe && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={g.read?'#22c55e':'var(--ink-3)'} strokeWidth="2.5">
                        {g.read ? <><polyline points="18 4 9 15 4 10"/><polyline points="22 4 13 15" opacity=".6"/></> : <polyline points="20 6 9 17 4 12"/>}
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

      {/* ── Image preview ── */}
      <AnimatePresence>
        {imgPreview && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            style={{ position:'relative', zIndex:2, borderTop:'1px solid var(--line)', padding:'10px 16px', background:'var(--frame)', display:'flex', alignItems:'center', gap:12, flexShrink:0, overflow:'hidden' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <img src={imgPreview.dataUrl} alt="preview" style={{ width:72, height:52, borderRadius:10, objectFit:'cover', border:'2px solid rgba(122,77,255,0.4)' }} />
              <button onClick={() => setImgPreview(null)} style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'#ef4444', border:'none', cursor:'pointer', display:'grid', placeItems:'center', color:'white' }}>
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>Brain scan image ready to send</div>
              <div style={{ fontSize:10, color:'var(--ink-3)' }}>Your doctor will receive this and can run an AI analysis</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:100, background:'rgba(122,77,255,0.08)', border:'1px solid rgba(122,77,255,0.2)', fontSize:10, fontWeight:600, color:'#7a4dff' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z" strokeLinejoin="round"/></svg>
              MRI ready
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input ── */}
      <div style={{ position:'relative', zIndex:2, padding:'12px 16px', borderTop:'1px solid var(--line)', display:'flex', gap:10, alignItems:'flex-end', background:'var(--frame)', flexShrink:0 }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onFileChange} />
        <motion.button whileHover={{ scale:1.07 }} whileTap={{ scale:.92 }} onClick={() => fileRef.current?.click()}
          title="Send brain scan image"
          style={{ width:40, height:40, borderRadius:12, border:'1px solid var(--line)', background:'var(--bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#7a4dff', transition:'all .2s' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><polyline points="21 15 16 10 5 21"/></svg>
        </motion.button>
        <div style={{ flex:1, borderRadius:16, border:'1px solid var(--line)', background:'var(--bg)', display:'flex', alignItems:'flex-end', padding:'6px 12px', transition:'border-color .2s', gap:8 }}
          onFocus={e=>e.currentTarget.style.borderColor='rgba(6,182,212,0.5)'}
          onBlur={e=>e.currentTarget.style.borderColor='var(--line)'}>
          <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey}
            placeholder={imgPreview ? 'Add a note for the doctor… (optional)' : `Message ${doctor.name}…`} rows={1}
            style={{ flex:1, border:'none', background:'transparent', outline:'none', resize:'none', fontSize:14, color:'var(--ink)', lineHeight:1.5, maxHeight:100, overflowY:'auto', fontFamily:'inherit', padding:'4px 0' }}
            onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'; }}
          />
        </div>
        <motion.button whileHover={{ scale:1.06 }} whileTap={{ scale:.93 }} onClick={send}
          disabled={(!input.trim() && !imgPreview) || sending}
          style={{ width:44, height:44, borderRadius:14, border:'none', cursor:(!input.trim()&&!imgPreview)?'not-allowed':'pointer', background: imgPreview?'linear-gradient(135deg,#7a4dff,#7C3AED)':'linear-gradient(135deg,#0ea5e9,#7a4dff)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow: imgPreview?'0 4px 16px -4px rgba(122,77,255,0.5)':'0 4px 16px -4px rgba(14,165,233,0.5)', opacity:(!input.trim()&&!imgPreview)?.4:1, transition:'all .2s' }}>
          {imgPreview
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z"/></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
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
  const [tips, setTips]           = useState([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState(null);
  const [tipsHeadline, setTipsHeadline] = useState('');
  const [tipsGenAt, setTipsGenAt] = useState(null);
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
  const [permRefresh, setPermRefresh]     = useState(0);
  const [scanReports, setScanReports]     = useState([]);
  const [reportFilter, setReportFilter]   = useState('all');
  const [expandedRep, setExpandedRep]     = useState(null);


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
    setScanReports(getPatientScanReports(uid));
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

  const fetchTips = async () => {
    setTipsLoading(true);
    setTipsError(null);
    try {
      const res = await fetch('/api/ai-tips', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned non-JSON (status ${res.status}). Make sure the dev server is running.`);
      }
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      if (!Array.isArray(data.tips) || data.tips.length === 0) throw new Error('Empty response from AI. Try again.');
      setTips(data.tips);
      setTipsHeadline(data.headline || 'Your Daily Health Briefing');
      setTipsGenAt(new Date());
    } catch (e) {
      setTipsError(e.message || 'Could not reach MedVision AI.');
    } finally {
      setTipsLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'AI Insights') return;
    if (tips.length === 0 && !tipsLoading) fetchTips();
  }, [tab]);

  useEffect(() => {
    if (!user || tab === 'Messages') return;
    const t = setInterval(() => setMsgUnread(getUnreadCount(user.id)), 3000);
    return () => clearInterval(t);
  }, [user, tab]);

  useEffect(() => {
    if (!user || tab !== 'Messages') return;
    const refresh = () => {
      setPatConversations(getConversations(user.id));
      setMsgUnread(getUnreadCount(user.id));
      setScanReports(getPatientScanReports(user.id));
    };
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [user, tab]);

  useEffect(() => {
    if (!user || tab !== 'Reports') return;
    setScanReports(getPatientScanReports(user.id));
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
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#030d18 0%,#060f1e 55%,#0c0520 100%)', border:'1px solid rgba(6,182,212,0.22)', display:'grid', placeItems:'center', overflow:'hidden', boxShadow:'0 0 12px rgba(6,182,212,0.22), 0 2px 6px rgba(0,0,0,0.18)', flexShrink:0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M2 12C2 12 6.5 5 12 5C17.5 5 22 12 22 12C22 12 17.5 19 12 19C6.5 19 2 12 2 12Z" stroke="url(#mv-patient-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3.2" stroke="url(#mv-patient-g)" strokeWidth="1.6"/>
              <circle cx="12" cy="12" r="1.3" fill="url(#mv-patient-g)"/>
              <defs><linearGradient id="mv-patient-g" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#9061f9"/></linearGradient></defs>
            </svg>
          </div>
          <div style={{ lineHeight:1 }}>
            <div style={{ fontSize:12, fontWeight:800, letterSpacing:'-0.025em', display:'flex', alignItems:'baseline' }}>
              <span style={{ color:'var(--ink)' }}>Med</span>
              <span style={{ backgroundImage:'linear-gradient(90deg,#06b6d4 0%,#7c3aed 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Vision</span>
              <span style={{ fontSize:7, fontWeight:500, marginLeft:1.5, color:'var(--ink-3)', WebkitTextFillColor:'var(--ink-3)' }}>™</span>
            </div>
            <div style={{ fontSize:6.5, fontWeight:700, letterSpacing:'0.2em', color:'var(--ink-3)', textTransform:'uppercase', marginTop:2, fontFamily:'JetBrains Mono, monospace' }}>DIAGNOSTIC AI</div>
          </div>
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
                <motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:.3 }} className="glass-card ai-scan" style={{ padding:24, cursor:'pointer' }} onClick={() => setTab('AI Insights')}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                    <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#ff3d6e,#7a4dff)', boxShadow:'0 4px 12px -4px rgba(255,61,110,0.4)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>MedVision AI Health Analysis</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)' }}>{tips.length > 0 ? `${tips.length} tips ready · Groq AI` : 'Personalized tips · Powered by Groq'}</div>
                    </div>
                    <div className="badge badge-approved" style={{ marginLeft:'auto' }}>Live AI</div>
                  </div>
                  {tips.length > 0 ? (
                    <>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                        <span style={{ fontSize:28 }}>{tips[0].emoji}</span>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{tips[0].title}</div>
                          <div style={{ fontSize:11, color:'var(--ink-3)', lineHeight:1.5 }}>{tips[0].tip.split('.')[0]}.</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {tips.slice(0,3).map(t => (
                          <span key={t.category} style={{ fontSize:10, padding:'3px 9px', borderRadius:100, background:`${t.color}14`, color:t.color, border:`1px solid ${t.color}28`, fontWeight:700 }}>{t.emoji} {t.category}</span>
                        ))}
                        <span style={{ fontSize:10, padding:'3px 9px', borderRadius:100, background:'var(--bg)', color:'var(--ink-3)', border:'1px solid var(--line)', fontWeight:600 }}>View all →</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize:14, color:'var(--ink-2)', lineHeight:1.7, marginBottom:16 }}>
                        Get <strong style={{ color:'var(--ink)' }}>personalized AI tips</strong> to protect your brain and heart — different every session, powered by Groq.
                      </p>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,rgba(255,61,110,0.1),rgba(122,77,255,0.12))', border:'1px solid rgba(122,77,255,0.2)', fontSize:12, fontWeight:700, color:'#7a4dff' }}>
                        ✨ Open AI Insights
                      </div>
                    </>
                  )}
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
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,rgba(122,77,255,0.18),rgba(6,182,212,0.1))', border:'1px solid rgba(122,77,255,0.2)', display:'grid', placeItems:'center', fontSize:17, flexShrink:0 }}>🧠</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', lineHeight:1.2 }}>Brain Scan History</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)' }}>{scanReports.length === 0 ? 'No scans received yet' : `${scanReports.length} AI scan${scanReports.length!==1?'s':''} on file`}</div>
                    </div>
                  </div>
                  {scanReports.length > 0 && (
                    <motion.button whileHover={{ x:2 }} whileTap={{ scale:.96 }} onClick={() => setTab('Reports')}
                      style={{ fontSize:11, fontWeight:700, color:'#7a4dff', background:'rgba(122,77,255,0.08)', border:'1px solid rgba(122,77,255,0.22)', padding:'5px 13px', borderRadius:20, cursor:'pointer', letterSpacing:'0.02em' }}>
                      View All →
                    </motion.button>
                  )}
                </div>

                {scanReports.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'18px 0 6px' }}>
                    <div style={{ width:54, height:54, borderRadius:16, background:'linear-gradient(135deg,rgba(122,77,255,0.1),rgba(6,182,212,0.06))', border:'1px solid rgba(122,77,255,0.15)', display:'grid', placeItems:'center', margin:'0 auto 12px', fontSize:26 }}>🔬</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:5 }}>No Brain Scans Yet</div>
                    <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.65, maxWidth:230, margin:'0 auto 14px' }}>
                      Once your doctor runs an AI scan on your MRI, the results will appear here.
                    </div>
                    <motion.button whileHover={{ y:-2 }} whileTap={{ scale:.97 }} onClick={() => setTab('Messages')}
                      style={{ padding:'8px 20px', borderRadius:20, fontSize:12, fontWeight:600, color:'white', background:'linear-gradient(135deg,#7a4dff,#06b6d4)', border:'none', cursor:'pointer', boxShadow:'0 4px 14px -4px rgba(122,77,255,0.42)' }}>
                      Message Your Doctor
                    </motion.button>
                  </div>
                ) : (() => {
                  const recent = scanReports.slice(0, 5);
                  let score = 100;
                  recent.forEach(r => {
                    const rd = r.reportData || {};
                    if (rd.hasTumor) score = Math.max(0, score - 30);
                    if (rd.strokeDetected === true) score = Math.max(0, score - 25);
                  });
                  const tumorFindings  = scanReports.filter(r => r.reportData?.hasTumor).length;
                  const strokeFindings = scanReports.filter(r => r.reportData?.strokeDetected === true).length;
                  const hasStrokeData  = scanReports.some(r => r.reportData?.strokeDetected !== undefined);
                  const scoreColor = score >= 85 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#E24B4A';
                  const scoreLabel = score >= 85 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Attention';
                  const C = 2 * Math.PI * 26;
                  const TC = { glioma:'Glioma', meningioma:'Meningioma', notumor:'No Tumor', pituitary:'Pituitary' };
                  return (
                    <>
                      {/* Health score row */}
                      <div style={{ display:'flex', gap:14, alignItems:'center', padding:'12px 14px', borderRadius:14, background:'var(--bg)', border:'1px solid var(--line)', marginBottom:14 }}>
                        <div style={{ position:'relative', flexShrink:0 }}>
                          <svg width="68" height="68" viewBox="0 0 68 68">
                            <circle cx="34" cy="34" r="26" fill="none" stroke="rgba(122,77,255,0.1)" strokeWidth="6" />
                            <circle cx="34" cy="34" r="26" fill="none" stroke={scoreColor} strokeWidth="6"
                              strokeDasharray={`${(score/100)*C} ${C}`} strokeLinecap="round"
                              transform="rotate(-90 34 34)" style={{ transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
                          </svg>
                          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
                            <span style={{ fontSize:15, fontWeight:800, color:scoreColor, lineHeight:1 }}>{score}</span>
                            <span style={{ fontSize:7.5, color:'var(--ink-3)', fontWeight:700, letterSpacing:'0.06em' }}>SCORE</span>
                          </div>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>Neurological Health</div>
                          <div style={{ fontSize:11, fontWeight:700, color:scoreColor, marginBottom:8 }}>{scoreLabel}</div>
                          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                            <div style={{ fontSize:10, fontWeight:600, color: tumorFindings>0 ? '#E24B4A' : '#22c55e' }}>
                              {tumorFindings>0 ? `⚠ ${tumorFindings} tumor finding${tumorFindings!==1?'s':''}` : '✓ No tumor findings'}
                            </div>
                            {hasStrokeData && (
                              <div style={{ fontSize:10, fontWeight:600, color: strokeFindings>0 ? '#7C3AED' : '#22c55e' }}>
                                {strokeFindings>0 ? `⚠ ${strokeFindings} stroke alert${strokeFindings!==1?'s':''}` : '✓ No stroke signs'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Last 3 scan rows */}
                      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                        {scanReports.slice(0, 3).map((rep, i) => {
                          const rd  = rep.reportData || {};
                          const allGood = !rd.hasTumor && rd.strokeDetected !== true;
                          const label = rd.hasTumor ? (TC[rd.tumorClass] || rd.tumorLabel || 'Tumor') : 'No Tumor';
                          const date  = new Date(rep.timestamp).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
                          const accent = allGood ? '#22c55e' : '#E24B4A';
                          const accentBg = allGood ? 'rgba(34,197,94,0.1)' : 'rgba(226,75,74,0.1)';
                          const accentBorder = allGood ? 'rgba(34,197,94,0.2)' : 'rgba(226,75,74,0.2)';
                          return (
                            <motion.div key={rep.id||i} whileHover={{ x:3 }} transition={{ type:'spring', stiffness:400, damping:28 }}
                              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 4px',
                                borderBottom: i < Math.min(scanReports.length,3)-1 ? '1px solid var(--line)' : 'none', cursor:'pointer' }}
                              onClick={() => setTab('Reports')}>
                              <div style={{ width:36, height:36, borderRadius:10, background:accentBg, border:`1px solid ${accentBorder}`, display:'grid', placeItems:'center', fontSize:17, flexShrink:0 }}>
                                🧠
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {allGood ? 'Brain Scan — All Clear' : `Brain Scan — ${label}${rd.strokeDetected?' + Stroke Detected':''}`}
                                </div>
                                <div style={{ fontSize:10, color:'var(--ink-3)' }}>{rep.fromName} · {date}</div>
                              </div>
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                                <div style={{ padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:800, letterSpacing:'0.07em', background:accentBg, color:accent, border:`1px solid ${accentBorder}` }}>
                                  {allGood ? 'CLEAR' : 'FLAGGED'}
                                </div>
                                {rd.tumorConfidence && (
                                  <div style={{ fontSize:9, color:'var(--ink-3)', fontWeight:500 }}>{rd.tumorConfidence}% conf.</div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
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
                        {selDoctor ? (() => {
                          const perm = getChatPermission(user.id, selDoctor.id);
                          const permStatus = perm?.status || 'none';
                          if (permStatus === 'approved') return <PatientChat key={selDoctor.id} user={user} doctor={selDoctor} />;
                          if (permStatus === 'pending') return (
                            <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring', stiffness:260, damping:24 }}
                              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24, padding:'48px 40px', textAlign:'center' }}>
                              <div style={{ position:'relative' }}>
                                {[0,1,2].map(i=>(
                                  <motion.div key={i} animate={{ scale:[1,1.6+i*.3,1], opacity:[0.35,0,0.35] }} transition={{ repeat:Infinity, duration:2.5, delay:i*.5 }}
                                    style={{ position:'absolute', inset:-(i+1)*18, borderRadius:'50%', border:'1.5px solid rgba(245,158,11,0.3)' }} />
                                ))}
                                <div style={{ width:72, height:72, borderRadius:22, background:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(249,115,22,0.1))', border:'2px solid rgba(245,158,11,0.35)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                                  <motion.div animate={{ rotate:[0,10,-10,0] }} transition={{ repeat:Infinity, duration:2, ease:'easeInOut' }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                  </motion.div>
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize:17, fontWeight:700, color:'var(--ink)', marginBottom:6 }}>Awaiting Approval</div>
                                <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.7, maxWidth:280 }}>Your chat request was sent to <strong style={{ color:'var(--ink)' }}>{selDoctor.name}</strong>. You'll be notified once the doctor accepts.</div>
                              </div>
                              <div style={{ padding:'12px 20px', borderRadius:16, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', gap:10 }}>
                                <motion.div animate={{ opacity:[0.4,1,0.4] }} transition={{ repeat:Infinity, duration:1.5 }} style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', flexShrink:0 }} />
                                <span style={{ fontSize:12, color:'#f59e0b', fontWeight:600 }}>Request pending · waiting for {selDoctor.name.replace('Dr. ','Dr.')}</span>
                              </div>
                            </motion.div>
                          );
                          // 'none' or 'denied'
                          const isDenied = permStatus === 'denied';
                          return (
                            <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring', stiffness:260, damping:24 }}
                              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:22, padding:'48px 40px', textAlign:'center' }}>
                              {/* Doctor card */}
                              <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderRadius:18, background:'var(--frame)', border:'1px solid var(--line)', width:'100%', maxWidth:320 }}>
                                <div style={{ position:'relative', flexShrink:0 }}>
                                  <div style={{ width:52, height:52, borderRadius:15, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:16, fontWeight:700, color:'white', boxShadow:'0 4px 16px -4px rgba(122,77,255,0.4)' }}>{selDoctor.avatar}</div>
                                  <div style={{ position:'absolute', bottom:-2, right:-2, width:14, height:14, borderRadius:'50%', background:'#22c55e', border:'2.5px solid var(--frame)' }} />
                                </div>
                                <div style={{ flex:1, textAlign:'left' }}>
                                  <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{selDoctor.name}</div>
                                  <div style={{ fontSize:11, color:'var(--ink-3)' }}>{selDoctor.specialty} · {selDoctor.hospital}</div>
                                </div>
                              </div>
                              {/* Lock icon */}
                              <div style={{ position:'relative' }}>
                                <div style={{ width:80, height:80, borderRadius:24, background: isDenied?'rgba(239,68,68,0.08)':'linear-gradient(135deg,rgba(6,182,212,0.1),rgba(122,77,255,0.08))', border: isDenied?'1px solid rgba(239,68,68,0.25)':'1px solid rgba(6,182,212,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={isDenied?'#ef4444':'#06b6d4'} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize:17, fontWeight:700, color:'var(--ink)', marginBottom:6 }}>
                                  {isDenied ? 'Chat Request Declined' : 'Request Chat Access'}
                                </div>
                                <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.7, maxWidth:280 }}>
                                  {isDenied
                                    ? `${selDoctor.name} declined your request. You can send a new request if needed.`
                                    : `To message ${selDoctor.name}, you need to send a chat request. The doctor must accept before you can start talking.`}
                                </div>
                              </div>
                              <motion.button whileHover={{ y:-2, scale:1.02 }} whileTap={{ scale:.97 }}
                                onClick={() => { requestChatPermission(user.id, user.name, user.avatar, selDoctor.id); setPermRefresh(r=>r+1); }}
                                style={{ padding:'13px 28px', borderRadius:16, fontSize:14, fontWeight:700, color:'white', background: isDenied?'linear-gradient(135deg,#f97316,#ff3d6e)':'linear-gradient(135deg,#0ea5e9,#06b6d4 50%,#7a4dff)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, boxShadow: isDenied?'0 8px 24px -6px rgba(249,115,22,0.5)':'0 8px 24px -6px rgba(6,182,212,0.5)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                {isDenied ? 'Send New Request' : 'Request Chat Access'}
                              </motion.button>
                            </motion.div>
                          );
                        })() : (
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
          {tab === 'Reports' && (() => {
            const TC = { glioma:'Glioma', meningioma:'Meningioma', notumor:'No Tumor', pituitary:'Pituitary Tumor' };

            const filtered = scanReports.filter(r => {
              const rd = r.reportData || {};
              if (reportFilter === 'tumor')  return rd.hasTumor === true;
              if (reportFilter === 'stroke') return rd.strokeDetected === true;
              return true;
            });

            const tumorCount  = scanReports.filter(r => r.reportData?.hasTumor).length;
            const strokeCount = scanReports.filter(r => r.reportData?.strokeDetected).length;

            const downloadReport = (rep) => {
              const rd = rep.reportData || {};
              const dt = new Date(rep.timestamp).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
              const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>MedVision — Brain Scan Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f4f6fb;color:#1a1a2e;padding:40px 20px}
.wrap{max-width:860px;margin:0 auto}
.hdr{background:linear-gradient(135deg,#ff3d6e,#7a4dff);border-radius:20px;padding:36px 40px;color:#fff;margin-bottom:28px;display:flex;align-items:center;gap:20px}
.hdr-logo{width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0}
.hdr h1{font-size:22px;font-weight:700;margin-bottom:4px}
.hdr p{font-size:13px;opacity:.8}
.card{background:#fff;border-radius:14px;padding:24px 28px;margin-bottom:18px;box-shadow:0 2px 16px rgba(0,0,0,0.07)}
.card-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #f0f0f0}
.tumor .card-title{color:#E24B4A}.stroke .card-title{color:#7C3AED}.info .card-title{color:#0ea5e9}
table{width:100%;border-collapse:collapse}
td{padding:9px 4px;border-bottom:1px solid #f5f5f5;font-size:13px}
td:first-child{font-weight:600;color:#666;width:45%;padding-right:16px}
.badge{display:inline-block;padding:3px 12px;border-radius:100px;font-size:11px;font-weight:700}
.clear{background:#dcfce7;color:#16a34a}.found{background:#fee2e2;color:#dc2626}
.imgs{display:flex;gap:12px;margin-top:16px}
.imgs figure{flex:1;margin:0;text-align:center}
.imgs img{width:100%;border-radius:10px;border:1px solid #eee}
.imgs figcaption{font-size:10px;color:#999;margin-top:5px;text-transform:uppercase;letter-spacing:.06em}
.conf-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.conf-label{font-size:11px;width:120px;flex-shrink:0;color:#555}
.conf-bar-wrap{flex:1;height:6px;border-radius:100px;background:#f0f0f0;overflow:hidden}
.conf-bar{height:100%;border-radius:100px}
.conf-val{font-size:11px;width:36px;text-align:right;color:#888}
.note-box{background:#f8f0ff;border-left:4px solid #7a4dff;padding:14px 18px;border-radius:10px;font-size:13px;font-style:italic;line-height:1.6;color:#3d2a6e}
.footer{text-align:center;font-size:11px;color:#aaa;margin-top:28px;padding-top:20px;border-top:1px solid #eee}
</style></head>
<body><div class="wrap">
<div class="hdr">
  <div class="hdr-logo">🧠</div>
  <div><h1>MedVision — Brain Scan Report</h1><p>Confidential Medical Document &nbsp;·&nbsp; ${dt}</p></div>
</div>
<div class="card info">
  <div class="card-title">Patient Information</div>
  <table>
    <tr><td>Patient Name</td><td>${rep.toName || 'N/A'}</td></tr>
    <tr><td>Referring Physician</td><td>${rep.fromName || 'N/A'}</td></tr>
    <tr><td>Report Date</td><td>${dt}</td></tr>
    <tr><td>Report ID</td><td>${rep.id}</td></tr>
  </table>
</div>
${rd.tumorClass ? `<div class="card tumor">
  <div class="card-title">Tumor Analysis</div>
  <table>
    <tr><td>Diagnosis</td><td>${TC[rd.tumorClass] || rd.tumorLabel || rd.tumorClass} &nbsp;<span class="badge ${rd.hasTumor?'found':'clear'}">${rd.hasTumor?'Tumor Detected':'Clear'}</span></td></tr>
    ${rd.tumorConfidence !== null ? `<tr><td>Model Confidence</td><td>${rd.tumorConfidence}%</td></tr>` : ''}
    ${rd.tumorPixels ? `<tr><td>Segmented Region</td><td>${rd.tumorPixels.toLocaleString()} pixels</td></tr>` : ''}
  </table>
  ${rd.allConfidences ? `<div style="margin-top:16px">${Object.entries(rd.allConfidences).map(([cls,val])=>{
    const color = cls==='notumor'?'#22c55e':cls==='glioma'?'#E24B4A':cls==='meningioma'?'#f59e0b':'#7a4dff';
    return `<div class="conf-row"><div class="conf-label">${TC[cls]||cls}</div><div class="conf-bar-wrap"><div class="conf-bar" style="width:${val}%;background:${color}"></div></div><div class="conf-val">${val}%</div></div>`;
  }).join('')}</div>` : ''}
  ${(rd.overlayB64||rd.maskB64) ? `<div class="imgs">${rd.overlayB64?`<figure><img src="data:image/png;base64,${rd.overlayB64}"/><figcaption>Segmentation Overlay</figcaption></figure>`:''}${rd.maskB64?`<figure><img src="data:image/png;base64,${rd.maskB64}"/><figcaption>Mask</figcaption></figure>`:''}</div>` : ''}
</div>` : ''}
${rd.strokeDetected !== undefined ? `<div class="card stroke">
  <div class="card-title">Stroke Screening</div>
  <table>
    <tr><td>Result</td><td><span class="badge ${rd.strokeDetected?'found':'clear'}">${rd.strokeDetected?'Stroke Detected':'No Stroke Signs'}</span></td></tr>
    ${rd.strokeConfidence !== undefined ? `<tr><td>Confidence</td><td>${rd.strokeConfidence}%</td></tr>` : ''}
    ${rd.strokeLabel ? `<tr><td>Classification</td><td>${rd.strokeLabel}</td></tr>` : ''}
  </table>
  ${(rd.strokeOverlayB64||rd.strokeHeatmapB64) ? `<div class="imgs"><figure><img src="data:image/png;base64,${rd.strokeOverlayB64||rd.strokeHeatmapB64}"/><figcaption>Grad-CAM Overlay</figcaption></figure></div>` : ''}
</div>` : ''}
${rd.doctorNote ? `<div class="card"><div class="card-title" style="color:#7a4dff">Physician Note</div><div class="note-box">"${rd.doctorNote}"</div></div>` : ''}
<div class="footer">Generated by MedVision Platform &nbsp;·&nbsp; This report is intended for medical use only<br/>MedVision &copy; 2026</div>
</div></body></html>`;
              const blob = new Blob([html], { type:'text/html' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a');
              a.href = url; a.download = `MedVision_Report_${dt.replace(/\s/g,'_')}.html`;
              a.click(); URL.revokeObjectURL(url);
            };

            return (
              <motion.div key="reports" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }}>

                {/* Header */}
                <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
                  <div>
                    <h2 className="font-serif" style={{ fontSize:28, fontWeight:400, color:'var(--ink)', marginBottom:4 }}>
                      Brain Scan <em className="text-gradient">Reports</em>
                    </h2>
                    <p style={{ fontSize:13, color:'var(--ink-3)' }}>
                      {scanReports.length === 0 ? 'No reports received yet' : `${scanReports.length} report${scanReports.length!==1?'s':''} from your physicians`}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                {scanReports.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:22 }}>
                    {[
                      { label:'Total Reports', value:scanReports.length, color:'#06b6d4', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
                      { label:'Tumor Findings', value:tumorCount, color:'#E24B4A', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z"/></svg> },
                      { label:'Stroke Alerts', value:strokeCount, color:'#7C3AED', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
                    ].map((s,i) => (
                      <motion.div key={s.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.06 }}
                        className="glass-card" style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:12, overflow:'hidden', position:'relative' }}>
                        <div style={{ position:'absolute', top:0, right:0, width:70, height:70, borderRadius:'50%', background:`radial-gradient(circle,${s.color}18,transparent 70%)`, pointerEvents:'none' }} />
                        <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}15`, border:`1px solid ${s.color}30`, display:'grid', placeItems:'center', color:s.color, flexShrink:0 }}>{s.icon}</div>
                        <div>
                          <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                          <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>{s.label}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Filter pills */}
                {scanReports.length > 0 && (
                  <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                    {[
                      { id:'all',    label:'All Reports', count:scanReports.length },
                      { id:'tumor',  label:'Tumor',       count:tumorCount,  color:'#E24B4A' },
                      { id:'stroke', label:'Stroke',      count:strokeCount, color:'#7C3AED' },
                    ].map(f => (
                      <button key={f.id} onClick={() => setReportFilter(f.id)}
                        style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:100, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', transition:'all .2s',
                          background: reportFilter===f.id ? (f.color ? `linear-gradient(135deg,${f.color}dd,${f.color}99)` : 'linear-gradient(135deg,#0ea5e9,#06b6d4)') : 'var(--frame)',
                          color: reportFilter===f.id ? 'white' : 'var(--ink-2)',
                          boxShadow: reportFilter===f.id ? `0 4px 14px -4px ${f.color||'#06b6d4'}66` : 'none',
                          border: reportFilter===f.id ? 'none' : '1px solid var(--line)',
                        }}>
                        {f.id==='tumor' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z"/></svg>}
                        {f.id==='stroke' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
                        {f.label}
                        <span style={{ padding:'1px 7px', borderRadius:100, background:'rgba(255,255,255,0.25)', fontSize:10, fontWeight:800 }}>{f.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Report cards */}
                {scanReports.length === 0 ? (
                  <motion.div initial={{ opacity:0, scale:.97 }} animate={{ opacity:1, scale:1 }} transition={{ delay:.1 }}
                    className="glass-card" style={{ padding:'72px 40px', textAlign:'center', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                      <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(122,77,255,0.07),transparent 70%)', filter:'blur(40px)' }} />
                    </div>
                    <div style={{ position:'relative' }}>
                      <div style={{ width:80, height:80, borderRadius:24, background:'linear-gradient(135deg,rgba(122,77,255,0.12),rgba(6,182,212,0.08))', border:'1px solid rgba(122,77,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7a4dff" strokeWidth="1.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </div>
                      <div style={{ fontSize:17, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>No Reports Yet</div>
                      <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.7, maxWidth:320, margin:'0 auto' }}>
                        When your doctor runs an AI brain scan on your MRI images and sends you the results, they'll appear here as detailed medical reports.
                      </div>
                    </div>
                  </motion.div>
                ) : filtered.length === 0 ? (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="glass-card" style={{ padding:40, textAlign:'center' }}>
                    <div style={{ fontSize:13, color:'var(--ink-3)' }}>No {reportFilter} reports found</div>
                  </motion.div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <AnimatePresence>
                      {filtered.map((rep, idx) => {
                        const rd = rep.reportData || {};
                        const isExpanded = expandedRep === rep.id;
                        const dt = new Date(rep.timestamp);
                        const dateStr = dt.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
                        const timeStr = dt.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

                        const hasTumor  = rd.hasTumor === true;
                        const hasStroke = rd.strokeDetected === true;
                        const isClear   = !hasTumor && !hasStroke;

                        const topGrad = hasTumor && hasStroke
                          ? 'linear-gradient(90deg,#E24B4A,#7C3AED)'
                          : hasTumor  ? 'linear-gradient(90deg,#E24B4A,#f59e0b)'
                          : hasStroke ? 'linear-gradient(90deg,#7C3AED,#06b6d4)'
                          : 'linear-gradient(90deg,#22c55e,#06b6d4)';

                        return (
                          <motion.div key={rep.id} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ delay:idx*.06 }}
                            className="glass-card" style={{ overflow:'hidden', cursor:'default' }}>
                            {/* Color bar */}
                            <div style={{ height:3, background:topGrad }} />

                            {/* Card header */}
                            <div style={{ padding:'18px 22px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                                {/* Doctor avatar */}
                                <div style={{ width:46, height:46, borderRadius:13, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:14, fontWeight:700, color:'white', flexShrink:0, boxShadow:'0 4px 12px -4px rgba(122,77,255,0.4)' }}>
                                  {rep.fromAvatar || rep.fromName?.slice(0,2).toUpperCase() || 'Dr'}
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{rep.fromName || 'Physician'}</div>
                                  <div style={{ fontSize:11, color:'var(--ink-3)', display:'flex', alignItems:'center', gap:5 }}>
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    {dateStr} · {timeStr}
                                  </div>
                                </div>
                                {/* Finding badges */}
                                <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                                  {hasTumor && (
                                    <div style={{ padding:'4px 10px', borderRadius:100, background:'rgba(226,75,74,0.1)', border:'1px solid rgba(226,75,74,0.25)', fontSize:10, fontWeight:700, color:'#E24B4A', display:'flex', alignItems:'center', gap:4 }}>
                                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z"/></svg>
                                      {TC[rd.tumorClass] || rd.tumorLabel || 'Tumor'}
                                    </div>
                                  )}
                                  {hasStroke && (
                                    <div style={{ padding:'4px 10px', borderRadius:100, background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', fontSize:10, fontWeight:700, color:'#7C3AED', display:'flex', alignItems:'center', gap:4 }}>
                                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                                      Stroke Alert
                                    </div>
                                  )}
                                  {isClear && (
                                    <div style={{ padding:'4px 10px', borderRadius:100, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', fontSize:10, fontWeight:700, color:'#22c55e', display:'flex', alignItems:'center', gap:4 }}>
                                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                      All Clear
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Quick summary row */}
                              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
                                {rd.tumorClass && (
                                  <div style={{ padding:'7px 12px', borderRadius:10, background: hasTumor?'rgba(226,75,74,0.05)':'rgba(34,197,94,0.05)', border:`1px solid ${hasTumor?'rgba(226,75,74,0.15)':'rgba(34,197,94,0.15)'}`, flex:'1 1 140px' }}>
                                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-3)', marginBottom:4 }}>Tumor</div>
                                    <div style={{ fontSize:13, fontWeight:700, color: hasTumor?'#E24B4A':'#22c55e' }}>{TC[rd.tumorClass] || rd.tumorLabel}</div>
                                    {rd.tumorConfidence && <div style={{ fontSize:10, color:'var(--ink-3)' }}>{rd.tumorConfidence}% confidence</div>}
                                  </div>
                                )}
                                {rd.strokeDetected !== undefined && (
                                  <div style={{ padding:'7px 12px', borderRadius:10, background: hasStroke?'rgba(124,58,237,0.05)':'rgba(6,182,212,0.05)', border:`1px solid ${hasStroke?'rgba(124,58,237,0.15)':'rgba(6,182,212,0.15)'}`, flex:'1 1 140px' }}>
                                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-3)', marginBottom:4 }}>Stroke</div>
                                    <div style={{ fontSize:13, fontWeight:700, color: hasStroke?'#7C3AED':'#06b6d4' }}>{hasStroke ? 'Signs Detected' : 'No Signs'}</div>
                                    {rd.strokeConfidence !== undefined && <div style={{ fontSize:10, color:'var(--ink-3)' }}>{rd.strokeConfidence}% confidence</div>}
                                  </div>
                                )}
                                {rd.doctorNote && (
                                  <div style={{ padding:'7px 12px', borderRadius:10, background:'rgba(122,77,255,0.04)', border:'1px solid rgba(122,77,255,0.15)', flex:'2 1 200px' }}>
                                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink-3)', marginBottom:4 }}>Physician Note</div>
                                    <div style={{ fontSize:12, color:'var(--ink-2)', fontStyle:'italic', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>"{rd.doctorNote}"</div>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div style={{ display:'flex', gap:8 }}>
                                <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }}
                                  onClick={() => setExpandedRep(isExpanded ? null : rep.id)}
                                  style={{ flex:1, height:38, borderRadius:11, fontSize:12, fontWeight:600, border:'1px solid var(--line)', background:'var(--frame)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, color:'var(--ink-2)', transition:'all .2s' }}>
                                  <motion.svg animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration:.25 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></motion.svg>
                                  {isExpanded ? 'Collapse' : 'View Full Report'}
                                </motion.button>
                                <motion.button whileHover={{ y:-1, boxShadow:'0 8px 20px -6px rgba(122,77,255,0.4)' }} whileTap={{ scale:.97 }}
                                  onClick={() => downloadReport(rep)}
                                  style={{ padding:'0 18px', height:38, borderRadius:11, fontSize:12, fontWeight:700, border:'none', background:'linear-gradient(135deg,#7a4dff,#ff3d6e)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'white', flexShrink:0 }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                  Download
                                </motion.button>
                              </div>
                            </div>

                            {/* Expanded detail panel */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:.35 }}
                                  style={{ overflow:'hidden', borderTop:'1px solid var(--line)', background:'linear-gradient(135deg,rgba(122,77,255,0.02),rgba(6,182,212,0.02))' }}>
                                  <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:16 }}>

                                    {/* Scan images */}
                                    {(rd.overlayB64 || rd.maskB64 || rd.strokeOverlayB64 || rd.strokeHeatmapB64) && (
                                      <div>
                                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:10 }}>Scan Images</div>
                                        <div style={{ display:'flex', gap:10 }}>
                                          {rd.overlayB64 && (
                                            <div style={{ flex:1, textAlign:'center' }}>
                                              <img src={`data:image/png;base64,${rd.overlayB64}`} alt="overlay"
                                                style={{ width:'100%', maxHeight:160, objectFit:'contain', borderRadius:10, border:'1px solid var(--line)', background:'#000' }} />
                                              <div style={{ fontSize:9, color:'var(--ink-3)', marginTop:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Tumor Overlay</div>
                                            </div>
                                          )}
                                          {rd.maskB64 && (
                                            <div style={{ flex:1, textAlign:'center' }}>
                                              <img src={`data:image/png;base64,${rd.maskB64}`} alt="mask"
                                                style={{ width:'100%', maxHeight:160, objectFit:'contain', borderRadius:10, border:'1px solid var(--line)', background:'#000' }} />
                                              <div style={{ fontSize:9, color:'var(--ink-3)', marginTop:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Seg. Mask</div>
                                            </div>
                                          )}
                                          {(rd.strokeOverlayB64 || rd.strokeHeatmapB64) && (
                                            <div style={{ flex:1, textAlign:'center' }}>
                                              <img src={`data:image/png;base64,${rd.strokeOverlayB64 || rd.strokeHeatmapB64}`} alt="gradcam"
                                                style={{ width:'100%', maxHeight:160, objectFit:'contain', borderRadius:10, border:'1px solid var(--line)', background:'#000' }} />
                                              <div style={{ fontSize:9, color:'var(--ink-3)', marginTop:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Stroke Grad-CAM</div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Confidence bars */}
                                    {rd.allConfidences && (
                                      <div>
                                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:10 }}>Tumor Classification Breakdown</div>
                                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                          {Object.entries(rd.allConfidences).map(([cls, val]) => {
                                            const isActive = cls === rd.tumorClass;
                                            const barColor = cls==='notumor'?'#22c55e':cls==='glioma'?'#E24B4A':cls==='meningioma'?'#f59e0b':'#7a4dff';
                                            return (
                                              <div key={cls} style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                <span style={{ fontSize:11, width:100, flexShrink:0, color: isActive?'var(--ink)':'var(--ink-3)', fontWeight: isActive?700:400 }}>
                                                  {TC[cls]||cls}
                                                </span>
                                                <div style={{ flex:1, height:6, borderRadius:100, background:'var(--line)', overflow:'hidden' }}>
                                                  <motion.div initial={{ width:0 }} animate={{ width:`${val}%` }} transition={{ duration:.6, delay:.1 }}
                                                    style={{ height:'100%', borderRadius:100, background: isActive?barColor:'var(--ink-3)', opacity: isActive?1:.35 }} />
                                                </div>
                                                <span style={{ fontSize:11, width:36, textAlign:'right', flexShrink:0, fontWeight: isActive?700:400, color: isActive?'var(--ink)':'var(--ink-3)' }}>{val}%</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Doctor note full */}
                                    {rd.doctorNote && (
                                      <div>
                                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:10 }}>Physician Note</div>
                                        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(122,77,255,0.05)', border:'1px solid rgba(122,77,255,0.15)', display:'flex', gap:12, alignItems:'flex-start' }}>
                                          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', flexShrink:0 }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                          </div>
                                          <div>
                                            <div style={{ fontSize:11, fontWeight:600, color:'var(--ink)', marginBottom:4 }}>{rep.fromName}</div>
                                            <div style={{ fontSize:13, color:'var(--ink-2)', fontStyle:'italic', lineHeight:1.65 }}>"{rd.doctorNote}"</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Segmentation info */}
                                    {rd.tumorPixels > 0 && (
                                      <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(226,75,74,0.04)', border:'1px solid rgba(226,75,74,0.15)', display:'flex', alignItems:'center', gap:10 }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                        <span style={{ fontSize:12, color:'var(--ink-2)' }}>Segmented tumor region: <strong style={{ color:'#E24B4A' }}>{rd.tumorPixels.toLocaleString()} pixels</strong></span>
                                      </div>
                                    )}

                                    {/* Neural Region Impact Analysis */}
                                    <BrainRegionAnalysis
                                      tumorClass={rd.tumorClass}
                                      hasTumor={rd.hasTumor}
                                      maskB64={rd.maskB64}
                                      overlayB64={rd.overlayB64}
                                      strokeDetected={rd.strokeDetected}
                                      strokeConfidence={rd.strokeConfidence}
                                    />

                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}

                {/* General reports section */}
                {reportFilter === 'all' && (
                  <div style={{ marginTop:30 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <div style={{ height:1, flex:1, background:'var(--line)' }} />
                      <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-3)', padding:'0 10px' }}>General Records</span>
                      <div style={{ height:1, flex:1, background:'var(--line)' }} />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {REPORTS.map((r, i) => (
                        <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.06 }}
                          className="glass-card" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
                          <div style={{ width:42, height:42, borderRadius:12, background:'var(--frame)', border:'1px solid var(--line)', display:'grid', placeItems:'center', fontSize:20, flexShrink:0 }}>{r.icon}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>{r.title}</div>
                            <div style={{ fontSize:11, color:'var(--ink-3)' }}>{r.date}</div>
                          </div>
                          <div style={{ padding:'3px 10px', borderRadius:100, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', fontSize:10, fontWeight:700, color:'#22c55e' }}>{r.status}</div>
                          <button style={{ padding:'7px 14px', borderRadius:9, fontSize:11, fontWeight:600, color:'var(--ink-2)', background:'var(--frame)', border:'1px solid var(--line)', cursor:'pointer' }}>
                            Download
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            );
          })()}

          {/* ── AI Insights ── */}
          {tab === 'AI Insights' && (
            <motion.div key="ai" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }}>

              {/* Header row */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, gap:16 }}>
                <div>
                  <h2 className="font-serif" style={{ fontSize:28, fontWeight:400, color:'var(--ink)', marginBottom:6 }}>
                    Neural <em className="text-gradient">AI Insights</em>
                  </h2>
                  <p style={{ fontSize:13, color:'var(--ink-3)' }}>
                    {tipsGenAt
                      ? `Generated ${tipsGenAt.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} · ${tips.length} personalized tips`
                      : 'Powered by Groq · Personalized every session'}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale:1.04 }} whileTap={{ scale:.96 }}
                  onClick={fetchTips}
                  disabled={tipsLoading}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:14, border:'none', cursor:tipsLoading?'not-allowed':'pointer', background:'linear-gradient(135deg,#ff3d6e,#7a4dff)', color:'white', fontSize:13, fontWeight:700, flexShrink:0, opacity:tipsLoading?.6:1, whiteSpace:'nowrap' }}>
                  <motion.span animate={{ rotate: tipsLoading ? 360 : 0 }} transition={{ duration:1, repeat: tipsLoading ? Infinity : 0, ease:'linear' }}>
                    ✨
                  </motion.span>
                  {tipsLoading ? 'Generating…' : 'New Tips'}
                </motion.button>
              </div>

              {/* Loading state */}
              {tipsLoading && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24, padding:'60px 0' }}>
                  {/* Animated brain */}
                  <div style={{ position:'relative', width:100, height:100 }}>
                    {[0,1,2].map(i => (
                      <motion.div key={i}
                        animate={{ scale:[1, 2.2, 1], opacity:[0.5, 0, 0.5] }}
                        transition={{ repeat:Infinity, duration:2.4, delay:i * 0.7 }}
                        style={{ position:'absolute', inset:-(i+1)*14, borderRadius:'50%', border:'1.5px solid rgba(122,77,255,0.25)' }} />
                    ))}
                    <motion.div animate={{ scale:[1, 1.06, 1], rotate:[0, 3, -3, 0] }} transition={{ repeat:Infinity, duration:3, ease:'easeInOut' }}
                      style={{ width:100, height:100, borderRadius:28, background:'linear-gradient(135deg,rgba(255,61,110,0.12),rgba(122,77,255,0.15))', border:'1px solid rgba(122,77,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>
                      🧠
                    </motion.div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', marginBottom:6 }}>MedVision AI is thinking…</div>
                    <div style={{ fontSize:13, color:'var(--ink-3)' }}>Crafting your personalized health briefing</div>
                  </div>
                  {/* Skeleton cards */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, width:'100%', maxWidth:680 }}>
                    {[0,1,2,4].map(i => (
                      <motion.div key={i} animate={{ opacity:[0.4,0.8,0.4] }} transition={{ repeat:Infinity, duration:1.8, delay:i*0.2 }}
                        className="glass-card" style={{ padding:22, borderTop:'4px solid rgba(122,77,255,0.2)' }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:'var(--line)', marginBottom:14 }} />
                        <div style={{ height:12, width:'60%', borderRadius:6, background:'var(--line)', marginBottom:8 }} />
                        <div style={{ height:10, width:'90%', borderRadius:6, background:'var(--line)', marginBottom:6 }} />
                        <div style={{ height:10, width:'75%', borderRadius:6, background:'var(--line)' }} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Error state */}
              {tipsError && !tipsLoading && (
                <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
                  style={{ padding:32, borderRadius:20, textAlign:'center', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#ef4444', marginBottom:6 }}>Could not reach MedVision AI</div>
                  <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:20 }}>{tipsError}</div>
                  <button onClick={fetchTips} style={{ padding:'10px 24px', borderRadius:12, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#ef4444', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    Try again
                  </button>
                </motion.div>
              )}

              {/* Tips */}
              {!tipsLoading && tips.length > 0 && (
                <div>
                  {/* Headline banner */}
                  <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.05 }}
                    style={{ padding:'18px 24px', borderRadius:18, marginBottom:20, background:'linear-gradient(135deg,rgba(255,61,110,0.07),rgba(122,77,255,0.1))', border:'1px solid rgba(122,77,255,0.18)', display:'flex', alignItems:'center', gap:14, position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', right:-20, top:-20, fontSize:100, opacity:.06, userSelect:'none' }}>🧠</div>
                    <motion.div animate={{ rotate:[0, 8, -8, 0] }} transition={{ repeat:Infinity, duration:4, ease:'easeInOut' }}
                      style={{ fontSize:36, flexShrink:0 }}>🧠</motion.div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#7a4dff', marginBottom:4 }}>Today's Briefing</div>
                      <div style={{ fontSize:18, fontWeight:800, color:'var(--ink)', lineHeight:1.3 }}>{tipsHeadline}</div>
                    </div>
                    <div style={{ marginLeft:'auto', flexShrink:0, padding:'5px 12px', borderRadius:100, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', fontSize:11, fontWeight:700, color:'#22c55e', display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e' }} className="pulse-dot" />
                      Live AI
                    </div>
                  </motion.div>

                  {/* Featured tip (first one, full width) */}
                  {tips[0] && (
                    <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}
                      className="glass-card"
                      style={{ padding:0, marginBottom:14, overflow:'hidden', borderTop:`4px solid ${tips[0].color}` }}>
                      <div style={{ padding:'24px 28px', display:'flex', gap:22, alignItems:'flex-start' }}>
                        <motion.div whileHover={{ scale:1.15, rotate:8 }} transition={{ type:'spring', stiffness:300 }}
                          style={{ width:72, height:72, borderRadius:20, background:`${tips[0].color}16`, border:`1.5px solid ${tips[0].color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, flexShrink:0 }}>
                          {tips[0].emoji}
                        </motion.div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                            <span style={{ padding:'3px 10px', borderRadius:100, background:`${tips[0].color}18`, border:`1px solid ${tips[0].color}35`, fontSize:10, fontWeight:700, color:tips[0].color, letterSpacing:'.06em', textTransform:'uppercase' }}>
                              {tips[0].category}
                            </span>
                            <span style={{ padding:'3px 10px', borderRadius:100, background:'rgba(122,77,255,0.08)', border:'1px solid rgba(122,77,255,0.18)', fontSize:10, fontWeight:600, color:'var(--ink-3)' }}>
                              🔄 {tips[0].urgency}
                            </span>
                            <span style={{ marginLeft:'auto', fontSize:10, color:'var(--ink-3)', fontWeight:500 }}>⭐ Featured</span>
                          </div>
                          <div style={{ fontSize:18, fontWeight:800, color:'var(--ink)', marginBottom:8, lineHeight:1.3 }}>{tips[0].title}</div>
                          <div style={{ fontSize:14, color:'var(--ink-2)', lineHeight:1.75 }}>{tips[0].tip}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Remaining tips grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    {tips.slice(1).map((tip, i) => (
                      <motion.div key={i}
                        initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.18 + i * .09 }}
                        className="glass-card"
                        style={{ padding:0, overflow:'hidden', borderTop:`3px solid ${tip.color}`, cursor:'default' }}>
                        <div style={{ padding:'20px 22px' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                            <motion.div whileHover={{ scale:1.2, rotate:10 }} transition={{ type:'spring', stiffness:300 }}
                              style={{ width:52, height:52, borderRadius:16, background:`${tip.color}14`, border:`1px solid ${tip.color}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>
                              {tip.emoji}
                            </motion.div>
                            <span style={{ padding:'3px 9px', borderRadius:100, background:`${tip.color}14`, border:`1px solid ${tip.color}30`, fontSize:10, fontWeight:700, color:tip.color, letterSpacing:'.06em', textTransform:'uppercase', textAlign:'right' }}>
                              {tip.category}
                            </span>
                          </div>
                          <div style={{ fontSize:15, fontWeight:800, color:'var(--ink)', marginBottom:7, lineHeight:1.3 }}>{tip.title}</div>
                          <div style={{ fontSize:12.5, color:'var(--ink-2)', lineHeight:1.7, marginBottom:12 }}>{tip.tip}</div>
                          <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:100, background:'var(--bg)', border:'1px solid var(--line)', fontSize:10, color:'var(--ink-3)', fontWeight:600 }}>
                            🔄 {tip.urgency}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Footer */}
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.6 }}
                    style={{ marginTop:20, padding:'14px 20px', borderRadius:14, background:'var(--bg)', border:'1px solid var(--line)', display:'flex', alignItems:'center', gap:12, fontSize:12, color:'var(--ink-3)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Tips are AI-generated for educational purposes. Always consult your doctor for medical advice.
                    <button onClick={fetchTips} style={{ marginLeft:'auto', padding:'5px 14px', borderRadius:10, border:'1px solid var(--line)', background:'var(--frame)', color:'var(--ink-2)', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                      Refresh ↺
                    </button>
                  </motion.div>
                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <AnimatePresence>
        {bookingOpen && <BookingPanel user={user} doctors={approvedDocs} onClose={() => setBookingOpen(false)} onDone={() => loadData(user.id)} />}
        {reviewOpen  && <ReviewModal  user={user} doctors={approvedDocs} onClose={() => setReviewOpen(false)}  onDone={() => loadData(user.id)} />}
        {newChatOpen && <NewChatPanel approvedDocs={approvedDocs} onClose={() => setNewChatOpen(false)} onStart={(doc) => { setSelDoctor(doc); setTab('Messages'); }} />}
      </AnimatePresence>

      <NeuralChatbot activeTab={tab} />
    </div>
  );
}
