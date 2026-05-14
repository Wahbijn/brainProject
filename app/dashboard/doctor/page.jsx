'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  getCurrentUser, getUserById, logout,
  getReviewsByDoctor, getDoctorRating, initAuth, respondToReview,
  getAppointmentsByDoctor, confirmAppointment, proposeAlternative,
  getPatientsByDoctor, sendMessage, getMessagesBetween, markMessagesRead,
  getConversations, getUnreadCount,
  getPendingChatRequests, respondToChatPermission,
  getStats, getAiScansToday, getTotalUsers, recordAiScan,
} from '@/lib/auth';
import Particles from '@/components/Particles';
import BrainScanTab from '@/components/BrainScanTab';

const LOCKED_FEATURES = [
  { id:'patients',     title:'Patient Records',      description:'View and manage patient medical histories, diagnoses, and treatment plans.', color:'#06b6d4', preview:['P. Alex Morgan','P. Jordan Lee','P. Casey Kim','+ 24 more'], icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id:'diagnostics',  title:'AI Diagnostics',       description:'Leverage Neural AI for advanced diagnostic analysis and pattern recognition.', color:'#ff3d6e', preview:['MRI Analysis','ECG Interpretation','Lab Results AI','Risk Scoring'], icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/><path d="M12 6v6l4 2"/></svg> },
  { id:'prescriptions',title:'E-Prescriptions',      description:'Issue digital prescriptions with AI-assisted drug interaction checks.', color:'#22c55e', preview:['New Prescription','Drug Interactions','Patient History','Refill Requests'], icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M12 8v8"/></svg> },
  { id:'analytics',   title:'Analytics & Reports',  description:'Review patient outcomes, treatment effectiveness, and performance metrics.', color:'#7a4dff', preview:['Patient Trends','Treatment Rates','Monthly Report','AI Insights'], icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
];

const TABS = ['Overview', 'Schedule', 'Messages', 'Reviews', 'Profile', 'Brain Scan'];
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
const STAR_COLORS = { 5:'#f59e0b', 4:'#22c55e', 3:'#06b6d4', 2:'#a4abbb', 1:'#ef4444' };
const STAR_BG    = { 5:'rgba(245,158,11,0.1)', 4:'rgba(34,197,94,0.1)', 3:'rgba(6,182,212,0.1)', 2:'rgba(164,171,187,0.08)', 1:'rgba(239,68,68,0.08)' };
const TIME_SLOTS  = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'today'; if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d/30)}mo ago`;
}
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}
function fmtDateLong(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
}

function Avatar({ initials, size = 36, gradient = 'linear-gradient(135deg,#ff7a9c,#7a4dff)' }) {
  return <div style={{ width:size, height:size, borderRadius:'50%', display:'grid', placeItems:'center', fontSize:size*0.32, fontWeight:700, color:'white', background:gradient, flexShrink:0 }}>{initials}</div>;
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

function Stars({ value, max = 5, size = 15 }) {
  return (
    <div style={{ display:'flex', gap:2 }}>
      {Array.from({ length:max }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={value>=i+1?'#f59e0b':'none'} stroke={value>=i+1?'#f59e0b':'var(--line)'} strokeWidth="1.8">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

/* ── Mini Calendar ─────────────────────────────────────── */
function MiniCalendar({ appointments, year, month, onPrev, onNext, selected, onSelect }) {
  const today = new Date().toISOString().split('T')[0];
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const apptMap = {};
  appointments.forEach(a => {
    if (!apptMap[a.date]) apptMap[a.date] = [];
    apptMap[a.date].push(a.status);
  });

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <button onClick={onPrev} style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--line)', background:'var(--bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-2)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L4.5 6l3 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </button>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={onNext} style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--line)', background:'var(--bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-2)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L7.5 6l-3 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ textAlign:'center', fontSize:10, fontWeight:600, color:'var(--ink-3)', padding:'4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {Array(firstDow).fill(null).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const statuses = apptMap[ds] || [];
          const isToday   = ds === today;
          const isSel     = ds === selected;
          const hasPend   = statuses.includes('pending');
          const hasConf   = statuses.includes('confirmed') || statuses.includes('counter_proposed');

          return (
            <button key={day} onClick={() => onSelect(isSel ? null : ds)}
              style={{ aspectRatio:'1', borderRadius:8, fontSize:11, fontWeight:isToday||isSel?700:400, border:'none', cursor:'pointer', position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
                background: isSel ? 'linear-gradient(135deg,#ff3d6e,#7a4dff)' : isToday ? 'rgba(255,61,110,0.12)' : statuses.length?'rgba(6,182,212,0.05)':'transparent',
                color: isSel ? 'white' : isToday ? '#ff3d6e' : 'var(--ink-2)',
              }}>
              {day}
              {statuses.length > 0 && !isSel && (
                <div style={{ display:'flex', gap:2 }}>
                  {hasPend  && <div style={{ width:4, height:4, borderRadius:'50%', background:'#f59e0b' }} />}
                  {hasConf  && <div style={{ width:4, height:4, borderRadius:'50%', background:'#22c55e' }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:5 }}>
        {[['#f59e0b','Pending action'],['#22c55e','Confirmed'],['#06b6d4','Counter-proposed']].map(([c,l]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, color:'var(--ink-3)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:c, flexShrink:0 }} /> {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Appointment Toast ─────────────────────────────────── */
function ApptToast({ toast, onDismiss }) {
  const isConfirm = toast.type === 'confirm';
  const col   = isConfirm ? '#22c55e' : '#f59e0b';
  const grad  = isConfirm
    ? 'linear-gradient(135deg,rgba(22,163,74,0.97),rgba(21,128,61,0.97))'
    : 'linear-gradient(135deg,rgba(180,112,0,0.97),rgba(217,119,6,0.97))';

  return (
    <motion.div
      initial={{ x: 120, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:120, opacity:0 }}
      transition={{ type:'spring', stiffness:320, damping:28 }}
      style={{ position:'fixed', bottom:28, right:24, zIndex:1000, width:340, borderRadius:20, overflow:'hidden', boxShadow:'0 24px 48px -8px rgba(0,0,0,0.5)' }}>

      {/* Progress bar */}
      <motion.div initial={{ width:'100%' }} animate={{ width:'0%' }} transition={{ duration:4, ease:'linear' }}
        style={{ height:3, background:'rgba(255,255,255,0.45)', transformOrigin:'left' }} />

      <div style={{ background:grad, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
          {/* Icon */}
          <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:400, damping:20, delay:.1 }}
            style={{ width:44, height:44, borderRadius:14, background:'rgba(255,255,255,0.2)', display:'grid', placeItems:'center', flexShrink:0 }}>
            {isConfirm
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><motion.polyline points="20 6 9 17 4 12" initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:.4, delay:.2, ease:'easeOut' }}/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          </motion.div>

          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:'white', marginBottom:3 }}>
              {isConfirm ? 'Appointment Confirmed!' : 'Alternative Proposed'}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.85)', marginBottom:6 }}>
              {toast.appt.patientName}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {isConfirm
                ? `${fmtDate(toast.appt.date)} · ${toast.appt.time}`
                : `New time: ${fmtDate(toast.altDate)} · ${toast.altTime}`}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:6 }}>
              {isConfirm ? 'Patient notified · shows in their appointments' : 'Awaiting patient acceptance'}
            </div>
          </div>

          <button onClick={onDismiss} style={{ width:24, height:24, borderRadius:6, border:'none', background:'rgba(255,255,255,0.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white', flexShrink:0 }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Locked card (for unapproved doctors) ──────────────── */
function LockedCard({ feature, locked }) {
  return (
    <div style={{ position:'relative', borderRadius:20, overflow:'hidden' }}>
      <div className="glass-card" style={{ padding:22, filter:locked?'blur(3px)':'none', opacity:locked?0.45:1, pointerEvents:locked?'none':'auto', userSelect:locked?'none':'auto', transition:'all .3s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:42, height:42, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:feature.color, background:'rgba(0,0,0,0.06)', border:'1px solid rgba(0,0,0,0.08)' }}>{feature.icon}</div>
          <div><div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>{feature.title}</div><div style={{ fontSize:12, color:'var(--ink-2)' }}>{feature.description}</div></div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {feature.preview.map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, background:'var(--bg)', border:'1px solid var(--line)' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:feature.color, flexShrink:0 }} />
              <span style={{ fontSize:12, color:'var(--ink-2)' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
      {locked && (
        <div style={{ position:'absolute', inset:0, borderRadius:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)', background:'rgba(10,10,15,0.72)', border:'1px solid rgba(255,61,110,0.12)' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,61,110,0.12)', border:'1px solid rgba(255,61,110,0.3)', marginBottom:12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6a8d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)', marginBottom:4 }}>Pending Admin Approval</p>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Contact Head of Department</p>
        </div>
      )}
    </div>
  );
}

/* ── Rating ring (Reviews tab) ─────────────────────────── */
function RatingRing({ avg, count }) {
  const r = 66, circ = 2 * Math.PI * r;
  const arc = avg > 0 ? (avg / 5) * circ : 0;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
        <svg width={172} height={172} viewBox="0 0 172 172">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b"/><stop offset="50%" stopColor="#ff7a9c"/><stop offset="100%" stopColor="#7a4dff"/>
            </linearGradient>
          </defs>
          <circle cx="86" cy="86" r={r} fill="none" stroke="var(--line)" strokeWidth="10"/>
          <motion.circle cx="86" cy="86" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset:circ }} animate={{ strokeDashoffset:circ-arc }} transition={{ duration:1.6, ease:'easeOut', delay:.25 }} transform="rotate(-90 86 86)"/>
        </svg>
        <div style={{ position:'absolute', textAlign:'center' }}>
          <motion.div initial={{ opacity:0, scale:.6 }} animate={{ opacity:1, scale:1 }} transition={{ delay:.5, type:'spring', stiffness:200 }}
            style={{ fontSize:38, fontWeight:900, color:'var(--ink)', lineHeight:1 }}>{avg>0?avg:'—'}</motion.div>
          <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:3 }}>out of 5.0</div>
        </div>
      </div>
      <Stars value={Math.round(avg)} size={20}/>
      <div style={{ fontSize:15, fontWeight:700, color:avg>0?'#f59e0b':'var(--ink-3)' }}>{avg>0?RATING_LABELS[Math.round(avg)]:'No rating yet'}</div>
      <div style={{ fontSize:12, color:'var(--ink-3)' }}>{count} verified review{count!==1?'s':''}</div>
    </div>
  );
}

/* ── Messaging helpers ─────────────────────────────────── */
function fmtMsgTime(iso) {
  const d = new Date(iso), now = new Date();
  const time = d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  if (d.toDateString()===now.toDateString()) return time;
  if (d.toDateString()===new Date(now-86400000).toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} · ${time}`;
}
function fmtDivider(iso) {
  const d = new Date(iso), now = new Date();
  if (d.toDateString()===now.toDateString()) return 'Today';
  if (d.toDateString()===new Date(now-86400000).toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
}

/* ── Tumor label map (mirrors BrainScanTab palette) ──────── */
const TC_LABELS = { glioma:'Glioma', meningioma:'Meningioma', notumor:'No Tumor', pituitary:'Pituitary Tumor' };

/* ── Doctor Chat ───────────────────────────────────────── */
function DoctorChat({ doctor, patient, onBack, onScanDone }) {
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [sending, setSending]           = useState(false);
  const [imgPreview, setImgPreview]     = useState(null);
  const [scanTarget, setScanTarget]     = useState(null);  // { imageData, msgId }
  const [scanning, setScanning]         = useState(false);
  const [scanResult, setScanResult]     = useState(null);
  const [doctorNote, setDoctorNote]     = useState('');
  const endRef    = useRef(null);
  const pollRef   = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);

  const load = () => {
    const msgs = getMessagesBetween(doctor.id, patient.id);
    setMessages(msgs);
    markMessagesRead(patient.id, doctor.id);
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 2000);
    return () => clearInterval(pollRef.current);
  }, [patient.id]);

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
      sendMessage({ fromId:doctor.id, fromName:doctor.name||`Dr. ${doctor.firstName} ${doctor.lastName}`, fromAvatar:doctor.avatar, fromRole:'doctor', toId:patient.id, toName:patient.name, toAvatar:patient.avatar, toRole:'patient', text:'[Image]', type:'image', imageData:imgPreview.dataUrl });
      setImgPreview(null); load(); return;
    }
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    sendMessage({ fromId:doctor.id, fromName:doctor.name||`Dr. ${doctor.firstName} ${doctor.lastName}`, fromAvatar:doctor.avatar, fromRole:'doctor', toId:patient.id, toName:patient.name, toAvatar:patient.avatar, toRole:'patient', text, type:'text' });
    setInput(''); setSending(false); load();
    setTimeout(()=>inputRef.current?.focus(),50);
  };

  const onKey = (e) => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} };

  const startScan = async (imageData) => {
    setScanTarget({ imageData }); setScanResult(null); setScanning(true);
    try {
      const res  = await fetch(imageData);
      const blob = await res.blob();
      const file = new File([blob], 'scan.jpg', { type: blob.type || 'image/jpeg' });
      const fd   = new FormData();
      fd.append('image', file);
      const r    = await fetch('/api/brain-scan', { method:'POST', body:fd });
      const data = await r.json();
      setScanResult(data);
      if (!data.error) onScanDone?.();
    } catch(e) {
      setScanResult({ error: 'Scan failed: ' + (e.message || 'server offline') });
    } finally {
      setScanning(false);
    }
  };

  const sendReport = () => {
    if (!scanResult || scanResult.error) return;
    const s = scanResult.stroke || {};
    const reportData = {
      tumorClass:       scanResult.prediction,
      tumorLabel:       TC_LABELS[scanResult.prediction] || scanResult.label || null,
      tumorConfidence:  scanResult.confidence ? Math.round(scanResult.confidence) : null,
      allConfidences:   scanResult.all_confidences || null,
      hasTumor:         scanResult.has_tumor,
      tumorPixels:      scanResult.tumor_pixels,
      overlayB64:       scanResult.overlay_b64 || null,
      maskB64:          scanResult.mask_b64 || null,
      strokeDetected:   s.model_available ? s.has_stroke : undefined,
      strokeConfidence: s.model_available ? Math.round(s.confidence) : undefined,
      strokeLabel:      s.label || null,
      strokeHeatmapB64: s.heatmap_b64 || null,
      strokeOverlayB64: s.overlay_b64 || null,
      doctorNote:       doctorNote.trim(),
    };
    sendMessage({ fromId:doctor.id, fromName:doctor.name||`Dr. ${doctor.firstName} ${doctor.lastName}`, fromAvatar:doctor.avatar, fromRole:'doctor', toId:patient.id, toName:patient.name, toAvatar:patient.avatar, toRole:'patient', text:'[Scan Report]', type:'scan_report', reportData });
    setScanTarget(null); setScanResult(null); setDoctorNote(''); load();
  };

  const groups = [];
  let lastDate='';
  messages.forEach(m=>{
    const d=new Date(m.timestamp).toDateString();
    if(d!==lastDate){groups.push({type:'divider',label:fmtDivider(m.timestamp),key:`div-${m.timestamp}`});lastDate=d;}
    groups.push({type:'msg',...m});
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative' }}>
      {/* Header */}
      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:12, background:'var(--frame)', flexShrink:0 }}>
        <button onClick={onBack} style={{ width:32,height:32,borderRadius:9,border:'1px solid var(--line)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-2)',flexShrink:0 }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L4.5 6l3 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </button>
        <div style={{ position:'relative',flexShrink:0 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#0ea5e9,#06b6d4)',display:'grid',placeItems:'center',fontSize:13,fontWeight:700,color:'white' }}>{patient.avatar}</div>
          <div style={{ position:'absolute',bottom:-1,right:-1,width:12,height:12,borderRadius:'50%',background:'#22c55e',border:'2px solid var(--frame)' }}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14,fontWeight:700,color:'var(--ink)',marginBottom:1 }}>{patient.name}</div>
          <div style={{ fontSize:11,color:'var(--ink-3)' }}>Patient · {patient.bloodType||'—'}</div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:100,background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.18)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{ fontSize:10,fontWeight:600,color:'#06b6d4' }}>Secure</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:4,background:'var(--bg)' }}>
        {groups.length===0&&(
          <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:'40px 0',textAlign:'center' }}>
            <div style={{ width:56,height:56,borderRadius:16,background:'rgba(255,61,110,0.08)',border:'1px solid rgba(255,61,110,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff6a8d" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <div style={{ fontSize:14,fontWeight:600,color:'var(--ink)',marginBottom:3 }}>Start a conversation</div>
              <div style={{ fontSize:12,color:'var(--ink-3)' }}>Send a message or share an image with {patient.name}</div>
            </div>
          </div>
        )}
        {groups.map((g,gi)=>{
          if(g.type==='divider') return (
            <div key={g.key} style={{ display:'flex',alignItems:'center',gap:10,margin:'10px 0 6px' }}>
              <div style={{ flex:1,height:1,background:'var(--line)' }}/>
              <span style={{ fontSize:10,fontWeight:600,color:'var(--ink-3)',padding:'0 4px',whiteSpace:'nowrap' }}>{g.label}</span>
              <div style={{ flex:1,height:1,background:'var(--line)' }}/>
            </div>
          );
          const isMe = g.fromId===doctor.id;
          const next = groups[gi+1];
          const isLast = !(next?.type==='msg'&&next.fromId===g.fromId);

          // ── Doctor's own sent report ──
          if (g.type==='scan_report' && isMe) {
            const rd = g.reportData || {};
            return (
              <motion.div key={g.id} initial={{ opacity:0,y:8,scale:.97 }} animate={{ opacity:1,y:0,scale:1 }} transition={{ duration:.2 }}
                style={{ display:'flex',flexDirection:'row-reverse',alignItems:'flex-end',gap:8,marginBottom:10 }}>
                <div style={{ maxWidth:'78%', borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,61,110,0.25)', boxShadow:'0 4px 20px -6px rgba(255,61,110,0.2)' }}>
                  <div style={{ padding:'11px 14px', background:'linear-gradient(135deg,rgba(255,61,110,0.1),rgba(122,77,255,0.08))', borderBottom:'1px solid rgba(255,61,110,0.15)', display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#ff3d6e,#7a4dff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize:11,fontWeight:700,color:'var(--ink)' }}>Scan Report sent to patient</div>
                      <div style={{ fontSize:9,color:'var(--ink-3)' }}>{fmtMsgTime(g.timestamp)}</div>
                    </div>
                    <div style={{ marginLeft:'auto', padding:'2px 7px', borderRadius:100, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', fontSize:9, fontWeight:700, color:'#22c55e' }}>SENT</div>
                  </div>
                  <div style={{ padding:'10px 14px', background:'var(--frame)', display:'flex', flexDirection:'column', gap:6 }}>
                    {rd.tumorLabel && <div style={{ fontSize:11, color:'var(--ink-2)' }}>Tumor: <strong>{rd.tumorLabel}</strong> · {rd.tumorConfidence}%</div>}
                    {rd.strokeDetected !== undefined && <div style={{ fontSize:11, color:'var(--ink-2)' }}>Stroke: <strong>{rd.strokeDetected?'Signs detected':'Clear'}</strong> · {rd.strokeConfidence}%</div>}
                    {rd.doctorNote && <div style={{ fontSize:11, color:'var(--ink-3)', fontStyle:'italic' }}>"{rd.doctorNote}"</div>}
                  </div>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div key={g.id} initial={{ opacity:0,y:8,scale:.97 }} animate={{ opacity:1,y:0,scale:1 }} transition={{ duration:.18 }}
              style={{ display:'flex',flexDirection:isMe?'row-reverse':'row',alignItems:'flex-end',gap:8,marginBottom:isLast?6:2 }}>
              {!isMe&&(
                <div style={{ width:28,height:28,borderRadius:'50%',background:isLast?'linear-gradient(135deg,#0ea5e9,#06b6d4)':'transparent',display:'grid',placeItems:'center',fontSize:9,fontWeight:700,color:'white',flexShrink:0,visibility:isLast?'visible':'hidden' }}>{g.fromAvatar}</div>
              )}
              <div style={{ maxWidth:'72%',display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start' }}>
                {/* Image message — patient sent a scan */}
                {g.type==='image'&&g.imageData&&!isMe ? (
                  <div style={{ borderRadius:`16px 16px 16px ${isLast?'4px':'16px'}`, overflow:'hidden', border:'2px solid rgba(122,77,255,0.3)', boxShadow:'0 6px 20px -6px rgba(122,77,255,0.3)', position:'relative' }}>
                    <img src={g.imageData} alt="scan" style={{ width:'100%', maxWidth:200, display:'block', objectFit:'cover', maxHeight:160 }} />
                    <div style={{ padding:'8px 12px', background:'linear-gradient(135deg,rgba(122,77,255,0.12),rgba(124,58,237,0.1))', borderTop:'1px solid rgba(122,77,255,0.2)', display:'flex', alignItems:'center', gap:8 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7a4dff" strokeWidth="2"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z" strokeLinejoin="round"/></svg>
                      <span style={{ fontSize:10, color:'#7a4dff', fontWeight:600, flex:1 }}>Brain scan from patient</span>
                      <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:.95 }}
                        onClick={() => startScan(g.imageData)}
                        style={{ padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#7a4dff,#7C3AED)', color:'white', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', gap:5, boxShadow:'0 3px 10px -3px rgba(122,77,255,0.6)', flexShrink:0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Run AI Scan
                      </motion.button>
                    </div>
                  </div>
                ) : g.type==='image'&&g.imageData&&isMe ? (
                  <div style={{ borderRadius:`16px 16px ${isLast?'4px':'16px'} 16px`, overflow:'hidden', border:'1px solid var(--line)' }}>
                    <img src={g.imageData} alt="img" style={{ width:'100%', maxWidth:200, display:'block', objectFit:'cover', maxHeight:160 }} />
                    <div style={{ padding:'5px 10px', background:'linear-gradient(135deg,#ff3d6e,#7a4dff)', fontSize:10, color:'rgba(255,255,255,0.75)', fontWeight:500 }}>Image sent</div>
                  </div>
                ) : (
                  <div style={{ padding:'10px 14px',borderRadius:isMe?`16px 16px ${isLast?'4px':'16px'} 16px`:`16px 16px 16px ${isLast?'4px':'16px'}`,background:isMe?'linear-gradient(135deg,#ff3d6e,#7a4dff)':'var(--frame)',border:isMe?'none':'1px solid var(--line)',color:isMe?'white':'var(--ink-2)',fontSize:13,lineHeight:1.55,boxShadow:isMe?'0 4px 16px -4px rgba(255,61,110,0.4)':'0 2px 8px -4px rgba(0,0,0,0.12)',wordBreak:'break-word' }}>
                    {g.text}
                  </div>
                )}
                {isLast&&(
                  <div style={{ display:'flex',alignItems:'center',gap:4,marginTop:3,opacity:.6 }}>
                    <span style={{ fontSize:10,color:'var(--ink-3)' }}>{fmtMsgTime(g.timestamp)}</span>
                    {isMe&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={g.read?'#22c55e':'var(--ink-3)'} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* ── Inline Scan Panel ── */}
      <AnimatePresence>
        {scanTarget && (
          <motion.div initial={{ y:'100%', opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:'100%', opacity:0 }}
            transition={{ type:'spring', stiffness:320, damping:32 }}
            style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20, borderTop:'2px solid rgba(122,77,255,0.35)', background:'var(--frame)', maxHeight:'65%', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 -16px 40px -8px rgba(122,77,255,0.2)' }}>
            <div style={{ height:3, background:'linear-gradient(90deg,#7a4dff,#7C3AED,#ff3d6e)', flexShrink:0 }} />
            {/* Panel header */}
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7a4dff,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>AI Brain Scan Analysis</div>
                <div style={{ fontSize:10, color:'var(--ink-3)' }}>Patient: {patient.name}</div>
              </div>
              <button onClick={() => { setScanTarget(null); setScanResult(null); setDoctorNote(''); }}
                style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--line)', background:'var(--bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-3)', flexShrink:0 }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
              {/* Scan preview + status */}
              <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <img
                    src={scanResult?.overlay_b64 ? `data:image/png;base64,${scanResult.overlay_b64}` : scanTarget.imageData}
                    alt="scan"
                    style={{ width:80, height:80, borderRadius:12, objectFit:'cover', border:'1px solid var(--line)' }}
                  />
                  {scanning && (
                    <div style={{ position:'absolute', inset:0, borderRadius:12, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:'linear' }}
                        style={{ width:24, height:24, borderRadius:'50%', border:'3px solid rgba(122,77,255,0.3)', borderTopColor:'#7a4dff' }} />
                    </div>
                  )}
                  {scanResult && !scanResult.error && (
                    <div style={{ position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)', padding:'2px 7px', borderRadius:100, background: scanResult.has_tumor?'#E24B4A':'#22c55e', fontSize:8, fontWeight:800, color:'white', whiteSpace:'nowrap' }}>
                      {scanResult.has_tumor ? 'TUMOR' : 'CLEAR'}
                    </div>
                  )}
                </div>
                <div style={{ flex:1 }}>
                  {scanning ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <motion.div animate={{ opacity:[0.4,1,0.4] }} transition={{ repeat:Infinity, duration:1.2 }} style={{ width:8, height:8, borderRadius:'50%', background:'#7a4dff' }} />
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>Dual-model analysis running…</span>
                      </div>
                      {['Tumor Classification','Segmentation','Stroke Screening','Grad-CAM'].map((s,i)=>(
                        <motion.div key={s} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*.3 }}
                          style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--ink-3)' }}>
                          <motion.div animate={{ background:['rgba(122,77,255,0.2)','rgba(122,77,255,0.8)','rgba(122,77,255,0.2)'] }} transition={{ repeat:Infinity, duration:1.8, delay:i*.25 }}
                            style={{ width:6, height:6, borderRadius:'50%', background:'rgba(122,77,255,0.3)' }} />
                          {s}
                        </motion.div>
                      ))}
                    </div>
                  ) : scanResult?.error ? (
                    <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#ef4444', marginBottom:4 }}>Scan failed</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)' }}>{scanResult.error}</div>
                    </div>
                  ) : scanResult ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)' }}>{TC_LABELS[scanResult.prediction] || scanResult.label}</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)' }}>Confidence: <strong style={{ color:'var(--ink)' }}>{Math.round(scanResult.confidence)}%</strong></div>
                      {scanResult.has_tumor && scanResult.tumor_pixels > 0 && (
                        <div style={{ fontSize:10, color:'#E24B4A' }}>{scanResult.tumor_pixels.toLocaleString()} tumor pixels segmented</div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Full result cards — shown after scan completes */}
              {scanResult && !scanResult.error && (
                <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:.3 }}
                  style={{ display:'flex', flexDirection:'column', gap:10 }}>

                  {/* Scan images row */}
                  {(scanResult.overlay_b64 || scanResult.mask_b64 || scanResult.stroke?.overlay_b64) && (
                    <div style={{ display:'flex', gap:8 }}>
                      {scanResult.overlay_b64 && (
                        <div style={{ flex:1, textAlign:'center' }}>
                          <img src={`data:image/png;base64,${scanResult.overlay_b64}`}
                            style={{ width:'100%', height:90, objectFit:'contain', borderRadius:8, border:'1px solid var(--line)', background:'#000' }} />
                          <div style={{ fontSize:9, color:'var(--ink-3)', marginTop:3, fontWeight:600 }}>OVERLAY</div>
                        </div>
                      )}
                      {scanResult.mask_b64 && (
                        <div style={{ flex:1, textAlign:'center' }}>
                          <img src={`data:image/png;base64,${scanResult.mask_b64}`}
                            style={{ width:'100%', height:90, objectFit:'contain', borderRadius:8, border:'1px solid var(--line)', background:'#000' }} />
                          <div style={{ fontSize:9, color:'var(--ink-3)', marginTop:3, fontWeight:600 }}>MASK</div>
                        </div>
                      )}
                      {scanResult.stroke?.overlay_b64 && (
                        <div style={{ flex:1, textAlign:'center' }}>
                          <img src={`data:image/png;base64,${scanResult.stroke.overlay_b64}`}
                            style={{ width:'100%', height:90, objectFit:'contain', borderRadius:8, border:'1px solid var(--line)', background:'#000' }} />
                          <div style={{ fontSize:9, color:'var(--ink-3)', marginTop:3, fontWeight:600 }}>GRAD-CAM</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tumor classification card */}
                  <div style={{ padding:'12px 14px', borderRadius:12, background: scanResult.has_tumor?'rgba(226,75,74,0.06)':'rgba(34,197,94,0.06)', border:`1px solid ${scanResult.has_tumor?'rgba(226,75,74,0.2)':'rgba(34,197,94,0.2)'}` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--ink)', display:'flex', alignItems:'center', gap:6 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8 2 5 5 5 8.5c0 2.7 1.6 5 4 6.1L8.2 21h7.6L15 14.6c2.4-1.1 4-3.4 4-6.1C19 5 16 2 12 2z"/></svg>
                        Tumor Analysis
                      </span>
                      <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:100, background: scanResult.has_tumor?'rgba(226,75,74,0.15)':'rgba(34,197,94,0.15)', color: scanResult.has_tumor?'#E24B4A':'#22c55e' }}>
                        {scanResult.has_tumor ? 'DETECTED' : 'CLEAR'}
                      </span>
                    </div>
                    {scanResult.low_confidence && (
                      <div style={{ fontSize:10, color:'#f59e0b', marginBottom:6, padding:'4px 8px', borderRadius:6, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
                        ⚠ Low confidence — result may be uncertain
                      </div>
                    )}
                    {/* All confidence bars */}
                    {scanResult.all_confidences && (
                      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                        {Object.entries(scanResult.all_confidences).map(([cls, val]) => {
                          const isActive = cls === scanResult.prediction;
                          const barColor = cls === 'notumor' ? '#22c55e' : cls === 'glioma' ? '#E24B4A' : cls === 'meningioma' ? '#f59e0b' : '#7a4dff';
                          return (
                            <div key={cls} style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <span style={{ fontSize:9, width:76, flexShrink:0, color: isActive?'var(--ink)':'var(--ink-3)', fontWeight: isActive?700:400 }}>
                                {TC_LABELS[cls] || cls}
                              </span>
                              <div style={{ flex:1, height:5, borderRadius:100, background:'var(--line)', overflow:'hidden' }}>
                                <motion.div initial={{ width:0 }} animate={{ width:`${val}%` }} transition={{ duration:.6, delay:.1 }}
                                  style={{ height:'100%', borderRadius:100, background: isActive ? barColor : 'var(--ink-3)', opacity: isActive ? 1 : 0.4 }} />
                              </div>
                              <span style={{ fontSize:9, width:30, textAlign:'right', flexShrink:0, color: isActive?'var(--ink)':'var(--ink-3)', fontWeight: isActive?700:400 }}>
                                {val}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Stroke card */}
                  {scanResult.stroke?.model_available && (
                    <div style={{ padding:'12px 14px', borderRadius:12, background: !scanResult.stroke.has_stroke?'rgba(6,182,212,0.06)':'rgba(124,58,237,0.06)', border:`1px solid ${!scanResult.stroke.has_stroke?'rgba(6,182,212,0.2)':'rgba(124,58,237,0.25)'}` }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--ink)', display:'flex', alignItems:'center', gap:6 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                          Stroke Screening
                        </span>
                        <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:100, background: !scanResult.stroke.has_stroke?'rgba(6,182,212,0.15)':'rgba(124,58,237,0.15)', color: !scanResult.stroke.has_stroke?'#06b6d4':'#7C3AED' }}>
                          {!scanResult.stroke.has_stroke ? 'CLEAR' : 'ALERT'}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>
                        {scanResult.stroke.label} · <strong style={{ color:'var(--ink)' }}>{Math.round(scanResult.stroke.confidence)}%</strong> confidence
                      </div>
                      {scanResult.stroke.out_of_distribution && (
                        <div style={{ fontSize:10, color:'#f59e0b', padding:'4px 8px', borderRadius:6, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
                          ⚠ Tumor present — stroke result may be less reliable
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Doctor note + send report */}
              {scanResult && !scanResult.error && (
                <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2 }}>
                  <textarea value={doctorNote} onChange={e=>setDoctorNote(e.target.value)} placeholder="Add your clinical note for the patient… (optional)"
                    style={{ width:'100%', height:60, borderRadius:10, padding:'9px 12px', fontSize:12, outline:'none', background:'var(--bg)', color:'var(--ink)', border:'1px solid var(--line)', resize:'none', lineHeight:1.5, fontFamily:'inherit', boxSizing:'border-box' }} />
                  <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }} onClick={sendReport}
                    style={{ marginTop:8, width:'100%', height:42, borderRadius:11, fontSize:13, fontWeight:700, color:'white', background:'linear-gradient(135deg,#7a4dff,#7C3AED,#ff3d6e)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 6px 18px -4px rgba(122,77,255,0.5)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Send Report to {patient.name}
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview */}
      <AnimatePresence>
        {imgPreview && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            style={{ borderTop:'1px solid var(--line)', padding:'10px 16px', background:'var(--frame)', display:'flex', alignItems:'center', gap:12, flexShrink:0, overflow:'hidden' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <img src={imgPreview.dataUrl} alt="preview" style={{ width:64, height:48, borderRadius:9, objectFit:'cover', border:'2px solid rgba(255,61,110,0.4)' }} />
              <button onClick={() => setImgPreview(null)} style={{ position:'absolute', top:-5, right:-5, width:16, height:16, borderRadius:'50%', background:'#ef4444', border:'none', cursor:'pointer', display:'grid', placeItems:'center', color:'white' }}>
                <svg width="7" height="7" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>Image ready to send</div>
              <div style={{ fontSize:10, color:'var(--ink-3)' }}>Patient will receive this in the chat</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div style={{ padding:'12px 16px',borderTop:'1px solid var(--line)',display:'flex',gap:10,alignItems:'flex-end',background:'var(--frame)',flexShrink:0, position:'relative', zIndex:1 }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onFileChange} />
        <motion.button whileHover={{ scale:1.07 }} whileTap={{ scale:.92 }} onClick={() => fileRef.current?.click()}
          title="Send image" style={{ width:38, height:38, borderRadius:11, border:'1px solid var(--line)', background:'var(--bg)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#ff6a8d', transition:'all .2s' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><polyline points="21 15 16 10 5 21"/></svg>
        </motion.button>
        <div style={{ flex:1,borderRadius:16,border:'1px solid var(--line)',background:'var(--bg)',display:'flex',alignItems:'flex-end',padding:'6px 12px',gap:8 }}>
          <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey}
            placeholder={`Message ${patient.name}…`} rows={1}
            style={{ flex:1,border:'none',background:'transparent',outline:'none',resize:'none',fontSize:13,color:'var(--ink)',lineHeight:1.5,maxHeight:90,overflowY:'auto',fontFamily:'inherit',padding:'4px 0' }}
            onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,90)+'px';}}
          />
        </div>
        <motion.button whileHover={{ scale:1.06 }} whileTap={{ scale:.93 }} onClick={send}
          disabled={(!input.trim()&&!imgPreview)||sending}
          style={{ width:42,height:42,borderRadius:13,border:'none',cursor:(!input.trim()&&!imgPreview)?'not-allowed':'pointer',background:'linear-gradient(135deg,#ff3d6e,#7a4dff)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 14px -4px rgba(255,61,110,0.5)',opacity:(!input.trim()&&!imgPreview)?.4:1,transition:'opacity .2s' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </motion.button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="frame" style={{ minHeight:'calc(100vh - 28px)', display:'grid', placeItems:'center' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid var(--line)', borderTopColor:'#ff3d6e', animation:'spin360 0.8s linear infinite' }} />
        <p style={{ fontSize:13, color:'var(--ink-3)' }}>Loading dashboard…</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser]               = useState(null);
  const [fresh, setFresh]             = useState(null);
  const [tab, setTab]                 = useState('Overview');
  const [dark, setDark]               = useState(false);
  const [ready, setReady]             = useState(false);

  // Reviews
  const [reviews, setReviews]         = useState([]);
  const [docRating, setDocRating]     = useState({ avg:0, count:0 });
  const [replyingTo, setReplyingTo]   = useState(null);
  const [replyDraft, setReplyDraft]   = useState('');
  const [replyBusy, setReplyBusy]     = useState(false);

  // Schedule
  const [docAppts, setDocAppts]         = useState([]);
  const [confirmBusy, setConfirmBusy]   = useState(null);
  const [decliningId, setDecliningId]   = useState(null);
  const [altDate, setAltDate]           = useState('');
  const [altTime, setAltTime]           = useState('');
  const [altNote, setAltNote]           = useState('');
  const [altBusy, setAltBusy]           = useState(false);
  const [toast, setToast]               = useState(null);
  const [calYear, setCalYear]           = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]         = useState(new Date().getMonth());
  const [selCalDate, setSelCalDate]     = useState(null);
  const toastTimer                      = useRef(null);

  // Messages
  const [conversations, setConversations]   = useState([]);
  const [allPatients, setAllPatients]       = useState([]);
  const [selPatient, setSelPatient]         = useState(null);
  const [msgUnread, setMsgUnread]           = useState(0);
  const [pendingChatReqs, setPendingChatReqs] = useState([]);
  const [reqBusy, setReqBusy]               = useState(null);

  // System stats
  const [sysStats, setSysStats]             = useState({ totalUsers:0, approvedDoctors:0, activePatients:0, aiScansToday:0 });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.classList.toggle('dark', saved);
    const u = getCurrentUser();
    if (!u) { window.location.href = '/login'; return; }
    if (u.role !== 'doctor') { window.location.href = `/dashboard/${u.role}`; return; }
    setUser(u);
    setFresh(getUserById(u.id));
    initAuth();
    setReviews(getReviewsByDoctor(u.id));
    setDocRating(getDoctorRating(u.id));
    setDocAppts(getAppointmentsByDoctor(u.id));
    setConversations(getConversations(u.id));
    setAllPatients(getPatientsByDoctor(u.id));
    setMsgUnread(getUnreadCount(u.id));
    setPendingChatReqs(getPendingChatRequests(u.id));
    const st = getStats();
    setSysStats({ totalUsers: getTotalUsers(), approvedDoctors: st.approvedDoctors, activePatients: st.totalPatients, aiScansToday: getAiScansToday() });
    setReady(true);
  }, []);

  const refreshReviews  = (uid) => { setReviews(getReviewsByDoctor(uid)); setDocRating(getDoctorRating(uid)); };
  const refreshAppts    = (uid) => setDocAppts(getAppointmentsByDoctor(uid));
  const refreshSysStats = () => {
    const st = getStats();
    setSysStats({ totalUsers: getTotalUsers(), approvedDoctors: st.approvedDoctors, activePatients: st.totalPatients, aiScansToday: getAiScansToday() });
  };
  const refreshMessages = (uid) => {
    setConversations(getConversations(uid));
    setMsgUnread(getUnreadCount(uid));
    setAllPatients(getPatientsByDoctor(uid));
    setPendingChatReqs(getPendingChatRequests(uid));
  };

  useEffect(() => {
    if (!user) return;
    if (tab === 'Messages') {
      refreshMessages(user.id);
      const t = setInterval(() => refreshMessages(user.id), 2500);
      return () => clearInterval(t);
    }
    if (tab === 'Overview') {
      refreshSysStats();
      const t = setInterval(refreshSysStats, 5000);
      return () => clearInterval(t);
    }
    const t = setInterval(() => setMsgUnread(getUnreadCount(user.id)), 3000);
    return () => clearInterval(t);
  }, [tab, user]);

  const showToast = (type, appt, extra = {}) => {
    clearTimeout(toastTimer.current);
    setToast({ type, appt, ...extra });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  /* ── Review handlers ── */
  const handleReply = (reviewId) => {
    if (!replyDraft.trim()) return;
    setReplyBusy(true);
    setTimeout(() => {
      respondToReview(reviewId, replyDraft);
      refreshReviews(user.id);
      setReplyingTo(null); setReplyDraft(''); setReplyBusy(false);
    }, 500);
  };
  const openReply = (r) => { setReplyingTo(r.id); setReplyDraft(r.doctorResponse || ''); };

  /* ── Schedule handlers ── */
  const handleConfirm = (a) => {
    setConfirmBusy(a.id);
    setTimeout(() => {
      confirmAppointment(a.id);
      refreshAppts(user.id);
      setConfirmBusy(null);
      showToast('confirm', a);
    }, 700);
  };

  const handleProposeAlt = (a) => {
    if (!altDate || !altTime) return;
    setAltBusy(true);
    setTimeout(() => {
      proposeAlternative(a.id, altDate, altTime, altNote);
      refreshAppts(user.id);
      setAltBusy(false); setDecliningId(null);
      setAltDate(''); setAltTime(''); setAltNote('');
      showToast('alt', a, { altDate, altTime });
    }, 700);
  };

  const handleChatReq = (req, approved) => {
    setReqBusy(req.patientId);
    setTimeout(() => {
      respondToChatPermission(req.patientId, user.id, approved);
      refreshMessages(user.id);
      setReqBusy(null);
    }, 600);
  };

  const toggleDark = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next?'dark':'light');
  };
  const handleLogout = () => { logout(); window.location.href = '/login'; };

  if (!ready || !user) return <LoadingScreen />;

  const isApproved = (fresh ?? user).approved;
  const isRejected = (fresh ?? user).rejected;

  /* ── Derived appointment lists ── */
  const pendingAppts    = docAppts.filter(a => a.status === 'pending');
  const proposedAppts   = docAppts.filter(a => a.status === 'counter_proposed');
  const upcomingAppts   = docAppts.filter(a => a.status === 'confirmed' && a.date >= today);
  const pastAppts       = docAppts.filter(a => a.status === 'confirmed' && a.date < today);
  const visibleAppts    = selCalDate ? docAppts.filter(a => a.date === selCalDate) : null;

  const displayAppts    = visibleAppts ?? [
    ...pendingAppts, ...proposedAppts, ...upcomingAppts,
  ];

  return (
    <div className="frame" style={{ minHeight:'calc(100vh - 28px)', overflow:'hidden', position:'relative' }}>
      <Particles />
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'5%', right:'8%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,61,110,0.09),transparent 70%)', filter:'blur(70px)' }} />
        <div style={{ position:'absolute', bottom:'8%', left:'5%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(122,77,255,0.09),transparent 70%)', filter:'blur(60px)' }} />
      </div>

      {/* ── Top bar ── */}
      <motion.header initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:.6 }}
        style={{ position:'relative', zIndex:30, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 28px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, display:'grid', placeItems:'center', color:'white', fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:16, background:'radial-gradient(circle at 30% 30%,#ffb8c4,#ff5a7d 60%,#7a4dff)', position:'relative', overflow:'hidden' }}>
            N <span style={{ position:'absolute', inset:0, borderRadius:'inherit', background:'linear-gradient(135deg,rgba(255,255,255,0.35),transparent 50%)' }} />
          </div>
          <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.18em', color:'var(--ink)' }}>NEURAL <span style={{ fontWeight:400, color:'var(--ink-3)' }}> / AI BRAIN</span></span>
        </div>

        <nav style={{ display:'flex', alignItems:'center', gap:2, padding:4, borderRadius:100, background:'var(--frame)', border:'1px solid var(--line)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'8px 16px', borderRadius:100, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', transition:'all .25s', background:tab===t?'linear-gradient(135deg,#ff3d6e,#7a4dff)':'transparent', color:tab===t?'white':'var(--ink-2)', position:'relative' }}>
              {t}
              {t==='Schedule' && pendingAppts.length>0 && tab!=='Schedule' && (
                <span style={{ position:'absolute', top:3, right:3, minWidth:16, height:16, borderRadius:100, background:'#f59e0b', color:'white', fontSize:9, fontWeight:800, display:'grid', placeItems:'center', border:'1.5px solid var(--frame)', lineHeight:1, padding:'0 3px' }}>{pendingAppts.length}</span>
              )}
              {t==='Messages' && tab!=='Messages' && (msgUnread>0 || pendingChatReqs.length>0) && (
                <span style={{ position:'absolute', top:2, right:2, minWidth:16, height:16, borderRadius:100, background: pendingChatReqs.length>0 ? '#7a4dff' : '#ff3d6e', color:'white', fontSize:9, fontWeight:800, display:'grid', placeItems:'center', border:'1.5px solid var(--frame)', lineHeight:1, padding:'0 3px' }}>
                  {pendingChatReqs.length > 0 ? pendingChatReqs.length : msgUnread}
                </span>
              )}
              {t==='Reviews' && reviews.length>0 && tab!=='Reviews' && (
                <span style={{ position:'absolute', top:4, right:4, width:7, height:7, borderRadius:'50%', background:'#f59e0b', border:'1.5px solid var(--frame)' }} />
              )}
            </button>
          ))}
        </nav>

        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {isRejected ? <div className="badge badge-rejected">Rejected</div>
            : isApproved ? <div className="badge badge-approved">✓ Approved</div>
            : <div className="badge badge-pending"><span className="pulse-dot" style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b', display:'inline-block' }} /> Pending</div>}
          <div className="badge badge-doctor">Doctor</div>
          <DarkToggle dark={dark} toggle={toggleDark}/>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Avatar initials={user.avatar||'DR'} size={34}/>
            <span style={{ fontSize:13, fontWeight:500, color:'var(--ink)' }}>Dr. {user.lastName||user.name}</span>
          </div>
          <button onClick={handleLogout} style={{ padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:500, color:'var(--ink-2)', background:'var(--line)', border:'none', cursor:'pointer' }}>Logout</button>
        </div>
      </motion.header>

      <main style={{ position:'relative', zIndex:10, padding:'28px 28px 40px', overflowY:'auto', maxHeight:'calc(100vh - 100px)' }}>
        <AnimatePresence mode="wait">

          {/* ══════════════ Overview ══════════════ */}
          {tab==='Overview' && (
            <motion.div key="overview" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }} transition={{ duration:.45 }}>
              {!isApproved && !isRejected && (
                <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}
                  style={{ marginBottom:24, padding:'18px 22px', borderRadius:16, display:'flex', alignItems:'center', gap:16, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(245,158,11,0.04),transparent)', pointerEvents:'none' }} />
                  <div style={{ width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', flexShrink:0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#f59e0b', marginBottom:3, letterSpacing:'0.03em' }}>APPROVAL PENDING</div>
                    <div style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.5 }}>Your account is under review. Features locked until approved. Estimated: <strong style={{ color:'var(--ink)' }}>1–2 business days.</strong></div>
                  </div>
                  <div style={{ marginLeft:'auto', textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>Applied</div>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--ink-2)' }}>{user.created?new Date(user.created).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—'}</div>
                  </div>
                </motion.div>
              )}
              {isRejected && (
                <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
                  style={{ marginBottom:24, padding:'18px 22px', borderRadius:16, display:'flex', alignItems:'center', gap:16, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
                  <div style={{ width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', flexShrink:0, color:'#ef4444' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  </div>
                  <div><div style={{ fontSize:14, fontWeight:700, color:'#ef4444', marginBottom:3 }}>ACCESS DENIED</div><div style={{ fontSize:13, color:'var(--ink-2)' }}>Your registration was not approved. Please contact the Head of Department.</div></div>
                </motion.div>
              )}
              {isApproved && (
                <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
                  style={{ marginBottom:24, padding:'14px 20px', borderRadius:14, display:'flex', alignItems:'center', gap:12, background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.2)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize:13, color:'#22c55e', fontWeight:600 }}>All features unlocked — welcome to Neural AI, Dr. {user.lastName}!</span>
                </motion.div>
              )}
              {/* ── System Stats ── */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
                {[
                  {
                    label: 'Total Users',
                    value: sysStats.totalUsers,
                    color: '#06b6d4',
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'Approved Doctors',
                    value: sysStats.approvedDoctors,
                    color: '#22c55e',
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'Active Patients',
                    value: sysStats.activePatients,
                    color: '#7a4dff',
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'AI Scans Today',
                    value: sysStats.aiScansToday,
                    color: '#ff3d6e',
                    pulse: sysStats.aiScansToday > 0,
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 3C6.24 3 4 5.24 4 8c0 1.68.83 3.17 2.1 4C4.83 12.83 4 14.32 4 16c0 2.76 2.24 5 5 5h6c2.76 0 5-2.24 5-5 0-1.68-.83-3.17-2.1-4C19.17 11.17 20 9.68 20 8c0-2.76-2.24-5-5-5H9z"/>
                        <path d="M9 9.5s1.2 1 3 1 3-1 3-1M9 14s1.2 1 3 1 3-1 3-1"/>
                        <line x1="12" y1="5.5" x2="12" y2="18.5"/>
                      </svg>
                    ),
                  },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.05 + i*.07 }}
                    className="glass-card" style={{ padding:'18px 20px', display:'flex', alignItems:'center', gap:14, position:'relative', overflow:'hidden' }}>
                    {s.pulse && <div className="pulse-dot" style={{ position:'absolute', top:12, right:12, width:8, height:8, borderRadius:'50%', background:s.color }} />}
                    <div style={{ width:42, height:42, borderRadius:12, background:`${s.color}18`, border:`1px solid ${s.color}2e`, display:'grid', placeItems:'center', color:s.color, flexShrink:0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:3 }}>{s.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div style={{ marginBottom:24 }}>
                <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:4 }}>Dr. <em className="text-gradient">{user.firstName} {user.lastName}</em></h2>
                <p style={{ fontSize:13, color:'var(--ink-3)' }}>{user.specialty||'General Medicine'} · {user.hospital||'Neural Medical Center'}</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:28 }}>
                {[{label:'Specialty',value:user.specialty||'—',icon:'🩺'},{label:'Experience',value:user.experience?`${user.experience} yrs`:'—',icon:'⭐'},{label:'License',value:user.license||'—',icon:'📋'}].map((s,i)=>(
                  <motion.div key={i} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.15+i*.08 }} className="glass-card" style={{ padding:20 }}>
                    <div style={{ fontSize:22, marginBottom:10 }}>{s.icon}</div>
                    <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>{s.value}</div>
                  </motion.div>
                ))}
              </div>
              <div style={{ marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Premium Features</h3>
                  {!isApproved && !isRejected && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(245,158,11,0.1)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.2)', fontWeight:500 }}>Locked pending approval</span>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {LOCKED_FEATURES.map((f,i)=>(
                    <motion.div key={f.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2+i*.08 }}>
                      <LockedCard feature={f} locked={!isApproved}/>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════ Schedule ══════════════ */}
          {tab==='Schedule' && (
            <motion.div key="schedule" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }} transition={{ duration:.45 }}>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
                <div>
                  <h2 className="font-serif" style={{ fontSize:28, fontWeight:400, color:'var(--ink)', marginBottom:4 }}>
                    Your <em className="text-gradient">Schedule</em>
                  </h2>
                  <p style={{ fontSize:13, color:'var(--ink-3)' }}>
                    {pendingAppts.length>0
                      ? <span style={{ color:'#f59e0b', fontWeight:600 }}>⚡ {pendingAppts.length} appointment{pendingAppts.length>1?'s':''} need your response</span>
                      : `${upcomingAppts.length} upcoming · ${docAppts.length} total`}
                  </p>
                </div>
                {selCalDate && (
                  <button onClick={()=>setSelCalDate(null)} style={{ fontSize:12, fontWeight:600, color:'#06b6d4', background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)', borderRadius:10, padding:'7px 14px', cursor:'pointer' }}>
                    ✕ Clear filter
                  </button>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
                {[
                  { label:'Total',    value:docAppts.length,     color:'#06b6d4', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                  { label:'Pending',  value:pendingAppts.length,  color:'#f59e0b', pulse:pendingAppts.length>0, icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                  { label:'Confirmed',value:upcomingAppts.length, color:'#22c55e', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> },
                  { label:'Awaiting', value:proposedAppts.length, color:'#a78bfa', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
                ].map((s,i)=>(
                  <motion.div key={s.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.06 }}
                    className="glass-card" style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:12, position:'relative', overflow:'hidden' }}>
                    {s.pulse && <div className="pulse-dot" style={{ position:'absolute', top:12, right:12, width:8, height:8, borderRadius:'50%', background:s.color }} />}
                    <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}18`, border:`1px solid ${s.color}33`, display:'grid', placeItems:'center', color:s.color, flexShrink:0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>{s.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Main layout: calendar + appointments */}
              {!isApproved ? (
                <div className="glass-card" style={{ padding:56, textAlign:'center' }}>
                  <div style={{ width:64, height:64, borderRadius:20, background:'rgba(255,61,110,0.08)', border:'1px solid rgba(255,61,110,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff6a8d" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>Schedule locked</div>
                  <div style={{ fontSize:13, color:'var(--ink-3)' }}>Awaiting admin approval to access your schedule</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'256px 1fr', gap:18 }}>

                  {/* ── Left: Mini Calendar ── */}
                  <div>
                    <motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:.15 }}
                      className="glass-card" style={{ padding:20 }}>
                      <MiniCalendar
                        appointments={docAppts}
                        year={calYear} month={calMonth}
                        onPrev={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}
                        onNext={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}
                        selected={selCalDate}
                        onSelect={setSelCalDate}
                      />
                    </motion.div>
                  </div>

                  {/* ── Right: Appointments ── */}
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                    {selCalDate && (
                      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                        style={{ padding:'10px 16px', borderRadius:12, background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.18)', fontSize:13, fontWeight:600, color:'#06b6d4', display:'flex', alignItems:'center', gap:8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Showing {fmtDateLong(selCalDate)} · {visibleAppts?.length??0} appointment{(visibleAppts?.length??0)!==1?'s':''}
                      </motion.div>
                    )}

                    {/* ── Pending section ── */}
                    {(visibleAppts ? visibleAppts.filter(a=>a.status==='pending') : pendingAppts).length > 0 && (
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b' }} className="pulse-dot"/>
                          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#f59e0b' }}>Needs Response</span>
                          <div style={{ height:1, flex:1, background:'rgba(245,158,11,0.2)' }}/>
                        </div>
                        <AnimatePresence>
                          {(visibleAppts ? visibleAppts.filter(a=>a.status==='pending') : pendingAppts).map((a,i)=>{
                            const isDeclining = decliningId === a.id;
                            return (
                              <motion.div key={a.id}
                                initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                                exit={{ opacity:0, x:40, height:0, marginBottom:0, overflow:'hidden' }}
                                transition={{ delay:i*.06 }}
                                className="glass-card" style={{ marginBottom:12, overflow:'hidden', position:'relative' }}>
                                <div style={{ height:3, background:'linear-gradient(90deg,#f59e0b,#ff7a9c)' }}/>

                                <div style={{ padding:'18px 22px' }}>
                                  {/* Patient + time */}
                                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                                    <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#0ea5e9,#06b6d4)', display:'grid', placeItems:'center', fontSize:15, fontWeight:700, color:'white', flexShrink:0, boxShadow:'0 4px 14px -4px rgba(6,182,212,0.5)' }}>
                                      {a.patientName?.split(' ').map(w=>w[0]).join('').slice(0,2)||'P'}
                                    </div>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:3 }}>{a.patientName}</div>
                                      {a.reason && <div style={{ fontSize:12, color:'var(--ink-3)', fontStyle:'italic' }}>"{a.reason}"</div>}
                                    </div>
                                    <div style={{ textAlign:'right', flexShrink:0 }}>
                                      <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{fmtDate(a.date)}</div>
                                      <div style={{ fontSize:14, fontWeight:800, color:'#f59e0b' }}>{a.time}</div>
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  {!isDeclining && (
                                    <div style={{ display:'flex', gap:10 }}>
                                      <motion.button whileHover={{ y:-2 }} whileTap={{ scale:.97 }}
                                        disabled={confirmBusy===a.id}
                                        onClick={()=>handleConfirm(a)}
                                        style={{ flex:1, height:44, borderRadius:13, fontSize:13, fontWeight:700, color:'white', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 6px 20px -6px rgba(34,197,94,0.55)', opacity:confirmBusy===a.id?.7:1 }}>
                                        {confirmBusy===a.id
                                          ? <span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin360 0.8s linear infinite', display:'inline-block' }}/>
                                          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                        {confirmBusy===a.id ? 'Confirming…' : 'Confirm Appointment'}
                                      </motion.button>
                                      <motion.button whileHover={{ y:-2 }} whileTap={{ scale:.97 }}
                                        onClick={()=>{ setDecliningId(a.id); setAltDate(''); setAltTime(''); setAltNote(''); }}
                                        style={{ flex:1, height:44, borderRadius:13, fontSize:13, fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,0.08)', border:'1.5px solid rgba(245,158,11,0.3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                        Propose Alternative
                                      </motion.button>
                                    </div>
                                  )}
                                </div>

                                {/* ── Inline alt-proposal form ── */}
                                <AnimatePresence>
                                  {isDeclining && (
                                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:.3 }}
                                      style={{ overflow:'hidden', borderTop:'1px solid var(--line)', background:'linear-gradient(135deg,rgba(245,158,11,0.04),rgba(122,77,255,0.03))' }}>
                                      <div style={{ padding:'20px 22px 22px' }}>
                                        <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:4, display:'flex', alignItems:'center', gap:8 }}>
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                          Propose a new time for {a.patientName}
                                        </div>
                                        <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:18 }}>The patient will be notified and can accept or decline your proposal.</div>

                                        {/* Date */}
                                        <div style={{ marginBottom:16 }}>
                                          <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:7 }}>New Date</label>
                                          <input type="date" min={today} value={altDate} onChange={e=>setAltDate(e.target.value)}
                                            style={{ width:'100%', height:42, borderRadius:11, padding:'0 14px', fontSize:13, outline:'none', background:'var(--bg)', color:'var(--ink)', border:'1.5px solid var(--line)', colorScheme:'light dark', boxSizing:'border-box' }}/>
                                        </div>

                                        {/* Time slots */}
                                        <div style={{ marginBottom:16 }}>
                                          <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:7 }}>New Time</label>
                                          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:7 }}>
                                            {TIME_SLOTS.map(t=>(
                                              <button key={t} onClick={()=>setAltTime(t)}
                                                style={{ padding:'8px 4px', borderRadius:9, fontSize:11, fontWeight:600, border:altTime===t?'2px solid #f59e0b':'1px solid var(--line)', background:altTime===t?'rgba(245,158,11,0.1)':'var(--bg)', color:altTime===t?'#f59e0b':'var(--ink-2)', cursor:'pointer', transition:'all .15s' }}>
                                                {t}
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Note */}
                                        <div style={{ marginBottom:18 }}>
                                          <label style={{ display:'block', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:7 }}>
                                            Note to patient <span style={{ textTransform:'none', fontWeight:400 }}>(optional)</span>
                                          </label>
                                          <textarea value={altNote} onChange={e=>setAltNote(e.target.value)} maxLength={300}
                                            placeholder="e.g. This time works better with my schedule…"
                                            style={{ width:'100%', height:72, borderRadius:11, padding:'10px 14px', fontSize:12, outline:'none', background:'var(--bg)', color:'var(--ink)', border:'1.5px solid var(--line)', resize:'none', lineHeight:1.6, boxSizing:'border-box', fontFamily:'inherit' }}/>
                                        </div>

                                        <div style={{ display:'flex', gap:10 }}>
                                          <button onClick={()=>setDecliningId(null)}
                                            style={{ padding:'10px 18px', borderRadius:11, fontSize:12, fontWeight:600, color:'var(--ink-2)', background:'var(--line)', border:'none', cursor:'pointer' }}>
                                            Cancel
                                          </button>
                                          <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }}
                                            disabled={!altDate||!altTime||altBusy}
                                            onClick={()=>handleProposeAlt(a)}
                                            style={{ flex:1, height:44, borderRadius:11, fontSize:13, fontWeight:700, color:'white', background:'linear-gradient(135deg,#f59e0b,#ff7a9c 50%,#7a4dff)', border:'none', cursor:!altDate||!altTime?'not-allowed':'pointer', opacity:!altDate||!altTime?.5:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                                            {altBusy
                                              ? <span style={{ width:13, height:13, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin360 0.8s linear infinite', display:'inline-block' }}/>
                                              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                                            {altBusy ? 'Sending…' : 'Send Alternative to Patient'}
                                          </motion.button>
                                        </div>
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

                    {/* ── Awaiting patient response ── */}
                    {(visibleAppts ? visibleAppts.filter(a=>a.status==='counter_proposed') : proposedAppts).length > 0 && (
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'#a78bfa' }}/>
                          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#a78bfa' }}>Awaiting Patient Response</span>
                          <div style={{ height:1, flex:1, background:'rgba(167,139,250,0.2)' }}/>
                        </div>
                        {(visibleAppts ? visibleAppts.filter(a=>a.status==='counter_proposed') : proposedAppts).map((a,i)=>(
                          <motion.div key={a.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.06 }}
                            className="glass-card" style={{ marginBottom:12, overflow:'hidden' }}>
                            <div style={{ height:3, background:'linear-gradient(90deg,#a78bfa,#7a4dff)' }}/>
                            <div style={{ padding:'16px 22px', display:'flex', alignItems:'center', gap:14 }}>
                              <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#a78bfa,#7a4dff)', display:'grid', placeItems:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>
                                {a.patientName?.split(' ').map(w=>w[0]).join('').slice(0,2)||'P'}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:3 }}>{a.patientName}</div>
                                <div style={{ fontSize:12, color:'var(--ink-3)' }}>You proposed: {fmtDate(a.altDate)} · {a.altTime}</div>
                                {a.altNote && <div style={{ fontSize:11, color:'var(--ink-3)', fontStyle:'italic', marginTop:2 }}>"{a.altNote}"</div>}
                              </div>
                              <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.25)', fontSize:11, fontWeight:700, color:'#a78bfa', flexShrink:0 }}>
                                Pending reply
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* ── Upcoming confirmed ── */}
                    {(visibleAppts ? visibleAppts.filter(a=>a.status==='confirmed') : upcomingAppts).length > 0 && (
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e' }}/>
                          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#22c55e' }}>Upcoming Confirmed</span>
                          <div style={{ height:1, flex:1, background:'rgba(34,197,94,0.2)' }}/>
                        </div>
                        {(visibleAppts ? visibleAppts.filter(a=>a.status==='confirmed') : upcomingAppts).map((a,i)=>(
                          <motion.div key={a.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.05 }}
                            className="glass-card" style={{ marginBottom:10, overflow:'hidden' }}>
                            <div style={{ height:3, background:'linear-gradient(90deg,#22c55e,#16a34a)' }}/>
                            <div style={{ padding:'15px 22px', display:'flex', alignItems:'center', gap:14 }}>
                              <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#0ea5e9,#06b6d4)', display:'grid', placeItems:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>
                                {a.patientName?.split(' ').map(w=>w[0]).join('').slice(0,2)||'P'}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{a.patientName}</div>
                                {a.reason && <div style={{ fontSize:12, color:'var(--ink-3)', fontStyle:'italic' }}>"{a.reason}"</div>}
                              </div>
                              <div style={{ textAlign:'right', flexShrink:0 }}>
                                <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{fmtDate(a.date)}</div>
                                <div style={{ fontSize:13, fontWeight:800, color:'#22c55e' }}>{a.time}</div>
                              </div>
                              <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', display:'grid', placeItems:'center', flexShrink:0 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Empty state */}
                    {displayAppts.length === 0 && (
                      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="glass-card"
                        style={{ padding:56, textAlign:'center' }}>
                        <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
                        <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>
                          {selCalDate ? 'No appointments this day' : 'No appointments yet'}
                        </div>
                        <div style={{ fontSize:13, color:'var(--ink-3)' }}>
                          {selCalDate ? 'Select another date or clear the filter' : 'Patient bookings will appear here once made'}
                        </div>
                      </motion.div>
                    )}

                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════════ Messages ══════════════ */}
          {tab==='Messages' && (
            <motion.div key="messages" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }} transition={{ duration:.45 }}>

              {!isApproved ? (
                <div className="glass-card" style={{ padding:56, textAlign:'center' }}>
                  <div style={{ width:64,height:64,borderRadius:20,background:'rgba(255,61,110,0.08)',border:'1px solid rgba(255,61,110,0.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff6a8d" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div style={{ fontSize:15,fontWeight:600,color:'var(--ink)',marginBottom:6 }}>Messages locked</div>
                  <div style={{ fontSize:13,color:'var(--ink-3)' }}>Awaiting admin approval to access patient messaging</div>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20 }}>
                    <div>
                      <h2 className="font-serif" style={{ fontSize:28,fontWeight:400,color:'var(--ink)',marginBottom:4 }}>
                        Patient <em className="text-gradient">Messages</em>
                      </h2>
                      <p style={{ fontSize:13,color:'var(--ink-3)' }}>
                        {selPatient
                          ? `Chatting with ${selPatient.name}`
                          : pendingChatReqs.length > 0
                            ? <span style={{ color:'#7a4dff', fontWeight:600 }}>
                                <motion.span animate={{ opacity:[1,0.5,1] }} transition={{ duration:1.6, repeat:Infinity }}>⚡ </motion.span>
                                {pendingChatReqs.length} access request{pendingChatReqs.length>1?'s':''} waiting · {allPatients.length} patient{allPatients.length!==1?'s':''}
                              </span>
                            : `${allPatients.length} patient${allPatients.length!==1?'s':''} · ${msgUnread>0?`${msgUnread} unread`:'All caught up'}`}
                      </p>
                    </div>
                    {selPatient && (
                      <button onClick={()=>setSelPatient(null)}
                        style={{ padding:'7px 14px',borderRadius:10,fontSize:12,fontWeight:600,color:'var(--ink-2)',background:'var(--line)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L4.5 6l3 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                        All Patients
                      </button>
                    )}
                  </div>

                  {/* ── Pending Chat Access Requests ── */}
                  <AnimatePresence>
                    {pendingChatReqs.length > 0 && (
                      <motion.div
                        key="pending-reqs"
                        initial={{ opacity:0, height:0, marginBottom:0 }}
                        animate={{ opacity:1, height:'auto', marginBottom:16 }}
                        exit={{ opacity:0, height:0, marginBottom:0 }}
                        transition={{ duration:.4 }}
                        style={{ overflow:'hidden' }}
                      >
                        {/* Section label */}
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'#7a4dff' }} className="pulse-dot" />
                          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#7a4dff' }}>
                            Chat Access Requests
                          </span>
                          <div style={{ height:1, flex:1, background:'rgba(122,77,255,0.2)' }} />
                          <div style={{ padding:'3px 10px', borderRadius:100, background:'rgba(122,77,255,0.12)', border:'1px solid rgba(122,77,255,0.3)', fontSize:11, fontWeight:800, color:'#7a4dff' }}>
                            {pendingChatReqs.length}
                          </div>
                        </div>

                        {/* Cards row */}
                        <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
                          <AnimatePresence>
                            {pendingChatReqs.map((req, i) => (
                              <motion.div key={req.id}
                                initial={{ opacity:0, scale:.88, x:20 }}
                                animate={{ opacity:1, scale:1, x:0 }}
                                exit={{ opacity:0, scale:.82, x:-20 }}
                                transition={{ delay:i*.06, type:'spring', stiffness:280, damping:22 }}
                                className="glass-card"
                                style={{ minWidth:240, maxWidth:260, flexShrink:0, overflow:'hidden', position:'relative' }}
                              >
                                {/* Gradient top bar */}
                                <div style={{ height:3, background:'linear-gradient(90deg,#7a4dff,#ff3d6e,#06b6d4)' }} />

                                {/* Glow orb */}
                                <div style={{ position:'absolute', top:0, right:0, width:100, height:100, borderRadius:'50%', background:'radial-gradient(circle,rgba(122,77,255,0.1),transparent 70%)', pointerEvents:'none' }} />

                                <div style={{ padding:'14px 16px' }}>
                                  {/* Patient info */}
                                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                                    <div style={{ position:'relative', flexShrink:0 }}>
                                      <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#7a4dff,#ff3d6e)', display:'grid', placeItems:'center', fontSize:14, fontWeight:700, color:'white', boxShadow:'0 4px 14px -4px rgba(122,77,255,0.5)' }}>
                                        {req.patientAvatar || req.patientName?.slice(0,2).toUpperCase()}
                                      </div>
                                      {/* Animated ring */}
                                      <motion.div
                                        animate={{ scale:[1,1.28,1], opacity:[0.6,0,0.6] }}
                                        transition={{ duration:2.2, repeat:Infinity, ease:'easeInOut' }}
                                        style={{ position:'absolute', inset:-4, borderRadius:17, border:'1.5px solid rgba(122,77,255,0.45)', pointerEvents:'none' }}
                                      />
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{req.patientName}</div>
                                      <div style={{ fontSize:10, color:'var(--ink-3)', display:'flex', alignItems:'center', gap:4 }}>
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        {new Date(req.timestamp).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Request description */}
                                  <div style={{ fontSize:11, color:'var(--ink-3)', lineHeight:1.5, marginBottom:14, padding:'8px 10px', borderRadius:9, background:'rgba(122,77,255,0.05)', border:'1px solid rgba(122,77,255,0.1)' }}>
                                    Wants permission to chat with you directly
                                  </div>

                                  {/* Buttons */}
                                  <div style={{ display:'flex', gap:8 }}>
                                    <motion.button
                                      whileHover={{ y:-2, boxShadow:'0 8px 20px -6px rgba(34,197,94,0.5)' }}
                                      whileTap={{ scale:.95 }}
                                      disabled={reqBusy === req.patientId}
                                      onClick={() => handleChatReq(req, true)}
                                      style={{ flex:1, height:38, borderRadius:11, fontSize:12, fontWeight:700, color:'white', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .2s' }}
                                    >
                                      {reqBusy === req.patientId ? (
                                        <span style={{ width:12, height:12, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin360 0.8s linear infinite', display:'inline-block' }} />
                                      ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                      )}
                                      Accept
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ y:-2 }}
                                      whileTap={{ scale:.95 }}
                                      disabled={reqBusy === req.patientId}
                                      onClick={() => handleChatReq(req, false)}
                                      style={{ flex:1, height:38, borderRadius:11, fontSize:12, fontWeight:700, color:'#ef4444', background:'rgba(239,68,68,0.07)', border:'1.5px solid rgba(239,68,68,0.25)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .2s' }}
                                    >
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                      Decline
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ display:'grid', gridTemplateColumns: selPatient ? '1fr' : '300px 1fr', gap:18, height:'calc(100vh - 260px)' }}>

                    {/* ── Left: Patient list ── */}
                    {!selPatient && (
                      <motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:.1 }}
                        className="glass-card" style={{ overflow:'hidden', display:'flex', flexDirection:'column' }}>
                        <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--line)', flexShrink:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-3)' }}>Your Patients</div>
                        </div>
                        <div style={{ flex:1, overflowY:'auto' }}>
                          {(() => {
                            // Merge assigned patients + conversation partners
                            const merged = [...allPatients];
                            conversations.forEach(c => {
                              if (!merged.find(p => p.id === c.partnerId)) {
                                const pat = getUserById(c.partnerId);
                                if (pat) merged.push(pat);
                              }
                            });
                            // Sort: conversations first (has messages), then unread first
                            merged.sort((a, b) => {
                              const ca = conversations.find(c => c.partnerId === a.id);
                              const cb = conversations.find(c => c.partnerId === b.id);
                              if (ca && !cb) return -1;
                              if (!ca && cb) return 1;
                              if (ca && cb) {
                                if (cb.unreadCount !== ca.unreadCount) return cb.unreadCount - ca.unreadCount;
                                return new Date(cb.lastTimestamp) - new Date(ca.lastTimestamp);
                              }
                              return 0;
                            });

                            if (merged.length === 0) return (
                              <div style={{ padding:32, textAlign:'center', color:'var(--ink-3)', fontSize:13 }}>No patients yet</div>
                            );

                            return merged.map((p, i) => {
                              const conv = conversations.find(c => c.partnerId === p.id);
                              const unread = conv?.unreadCount || 0;
                              const isSelected = selPatient?.id === p.id;
                              return (
                                <motion.button key={p.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*.04 }}
                                  onClick={() => { setSelPatient(p); }}
                                  style={{ width:'100%', padding:'14px 18px', border:'none', borderBottom:'1px solid var(--line)', cursor:'pointer', display:'flex', alignItems:'center', gap:12, textAlign:'left', background:isSelected?'rgba(255,61,110,0.07)':'transparent', transition:'background .2s' }}>
                                  <div style={{ position:'relative', flexShrink:0 }}>
                                    <div style={{ width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#0ea5e9,#06b6d4)',display:'grid',placeItems:'center',fontSize:13,fontWeight:700,color:'white' }}>{p.avatar}</div>
                                    <div style={{ position:'absolute',bottom:-1,right:-1,width:12,height:12,borderRadius:'50%',background:'#22c55e',border:'2px solid var(--frame)' }}/>
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                                      <span style={{ fontSize:13, fontWeight: unread>0 ? 700 : 600, color:'var(--ink)' }}>{p.name}</span>
                                      {conv && <span style={{ fontSize:10, color:'var(--ink-3)' }}>{fmtMsgTime(conv.lastTimestamp)}</span>}
                                    </div>
                                    <div style={{ fontSize:11, color: unread>0 ? 'var(--ink-2)' : 'var(--ink-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: unread>0 ? 600 : 400 }}>
                                      {conv ? conv.lastMessage : 'No messages yet'}
                                    </div>
                                  </div>
                                  {unread > 0 && (
                                    <div style={{ minWidth:20,height:20,borderRadius:100,background:'#ff3d6e',color:'white',fontSize:10,fontWeight:800,display:'grid',placeItems:'center',flexShrink:0,padding:'0 5px' }}>{unread}</div>
                                  )}
                                </motion.button>
                              );
                            });
                          })()}
                        </div>
                      </motion.div>
                    )}

                    {/* ── Right: Chat or empty ── */}
                    <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay:.15 }}
                      className="glass-card" style={{ overflow:'hidden', display:'flex', flexDirection:'column', position:'relative' }}>
                      {/* Decorative */}
                      <div style={{ position:'absolute',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden' }}>
                        <div style={{ position:'absolute',top:'10%',right:'5%',width:250,height:250,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,61,110,0.04),transparent 70%)',filter:'blur(40px)' }}/>
                        <div style={{ position:'absolute',bottom:'10%',left:'5%',width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(122,77,255,0.04),transparent 70%)',filter:'blur(35px)' }}/>
                      </div>
                      <div style={{ position:'relative',zIndex:1,flex:1,display:'flex',flexDirection:'column',minHeight:0 }}>
                        {selPatient ? (
                          <DoctorChat doctor={user} patient={selPatient} onBack={()=>setSelPatient(null)} onScanDone={() => { recordAiScan(user.id); refreshSysStats(); }} />
                        ) : (
                          <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'40px' }}>
                            <motion.div initial={{ scale:.85,opacity:0 }} animate={{ scale:1,opacity:1 }} transition={{ type:'spring',stiffness:200,delay:.2 }}
                              style={{ width:80,height:80,borderRadius:24,background:'linear-gradient(135deg,rgba(255,61,110,0.1),rgba(122,77,255,0.1))',border:'1px solid rgba(255,61,110,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff6a8d" strokeWidth="1.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            </motion.div>
                            <div style={{ textAlign:'center' }}>
                              <div style={{ fontSize:16,fontWeight:600,color:'var(--ink)',marginBottom:6 }}>Select a patient</div>
                              <div style={{ fontSize:13,color:'var(--ink-3)',lineHeight:1.6 }}>Choose a patient from the list<br/>to view and send messages</div>
                            </div>
                            {(() => {
                              const merged = [...allPatients];
                              conversations.forEach(c => { if (!merged.find(p => p.id === c.partnerId)) { const pat = getUserById(c.partnerId); if (pat) merged.push(pat); } });
                              return merged.length > 0 && (
                                <div style={{ display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginTop:8 }}>
                                  {merged.slice(0,3).map(p=>(
                                    <button key={p.id} onClick={()=>setSelPatient(p)}
                                      style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:12,border:'1px solid var(--line)',background:'var(--bg)',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--ink-2)',transition:'all .2s' }}>
                                      <div style={{ width:24,height:24,borderRadius:7,background:'linear-gradient(135deg,#0ea5e9,#06b6d4)',display:'grid',placeItems:'center',fontSize:8,fontWeight:700,color:'white' }}>{p.avatar}</div>
                                      {p.name}
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ══════════════ Reviews ══════════════ */}
          {tab==='Reviews' && (
            <motion.div key="reviews" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }} transition={{ duration:.45 }}>
              <div style={{ marginBottom:28 }}>
                <h2 className="font-serif" style={{ fontSize:28, fontWeight:400, color:'var(--ink)', marginBottom:4 }}>Patient <em className="text-gradient">Reviews</em></h2>
                <p style={{ fontSize:13, color:'var(--ink-3)' }}>{reviews.length>0?`${reviews.length} verified review${reviews.length!==1?'s':''} from your patients`:'Patient reviews will appear here after your consultations'}</p>
              </div>

              {reviews.length===0 ? (
                <motion.div initial={{ opacity:0, scale:.97 }} animate={{ opacity:1, scale:1 }} transition={{ delay:.1 }}
                  className="glass-card" style={{ padding:'72px 48px', textAlign:'center', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,0.08),transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />
                  <div style={{ position:'relative' }}>
                    <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:20 }}>
                      {[28,36,28].map((s,i)=>(
                        <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2+i*.1 }}>
                          <svg width={s} height={s} viewBox="0 0 24 24" fill={i===1?'#f59e0b':'none'} stroke={i===1?'#f59e0b':'rgba(245,158,11,0.3)'} strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </motion.div>
                      ))}
                    </div>
                    <h3 style={{ fontSize:20, fontWeight:600, color:'var(--ink)', marginBottom:8 }}>No reviews yet</h3>
                    <p style={{ fontSize:14, color:'var(--ink-3)', maxWidth:340, margin:'0 auto', lineHeight:1.65 }}>Once patients submit feedback after their appointments, their reviews will appear here.</p>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:18, marginBottom:24 }}>
                    <motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:.1 }} className="glass-card" style={{ padding:'28px 32px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(245,158,11,0.04),rgba(255,122,156,0.04))', pointerEvents:'none' }} />
                      <div style={{ position:'relative' }}><RatingRing avg={docRating.avg} count={docRating.count}/></div>
                    </motion.div>
                    <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay:.15 }} className="glass-card" style={{ padding:26 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:4 }}>Rating Breakdown</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:20 }}>How patients rated you</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
                        {[5,4,3,2,1].map((star,idx)=>{
                          const cnt=reviews.filter(r=>r.rating===star).length;
                          const pct=reviews.length>0?(cnt/reviews.length)*100:0;
                          const col=STAR_COLORS[star];
                          return (
                            <div key={star} style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:3, width:32, flexShrink:0 }}>
                                <span style={{ fontSize:12, fontWeight:600, color:'var(--ink-2)' }}>{star}</span>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                              </div>
                              <div style={{ flex:1, height:9, borderRadius:100, background:'var(--line)', overflow:'hidden' }}>
                                <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:.9, delay:.2+idx*.07, ease:'easeOut' }} style={{ height:'100%', borderRadius:100, background:`linear-gradient(90deg,${col},${col}bb)` }}/>
                              </div>
                              <span style={{ fontSize:12, fontWeight:700, color:cnt>0?col:'var(--ink-3)', width:20, textAlign:'right' }}>{cnt}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:20, flexWrap:'wrap' }}>
                        {docRating.avg>=4.5&&<span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:100, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#f59e0b' }}>⭐ Top Rated</span>}
                        {reviews.length>=2&&<span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:100, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', color:'#22c55e' }}>✓ Verified Reviews</span>}
                        <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:100, background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.2)', color:'#06b6d4' }}>👁 Public Profile</span>
                      </div>
                    </motion.div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {reviews.map((r,i)=>{
                      const col=STAR_COLORS[r.rating]||'#a4abbb';
                      const bg=STAR_BG[r.rating]||'rgba(164,171,187,0.06)';
                      const isTop=r.rating===5&&i===reviews.findIndex(x=>x.rating===5);
                      const isReplying=replyingTo===r.id;
                      return (
                        <motion.div key={r.id} initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:.25+i*.08 }} className="glass-card" style={{ overflow:'hidden', position:'relative' }}>
                          <div style={{ height:3, background:`linear-gradient(90deg,${col},${col}66)` }}/>
                          {isTop&&<div style={{ position:'absolute', top:12, right:16, display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:100, background:`${col}18`, border:`1px solid ${col}33` }}><svg width="10" height="10" viewBox="0 0 24 24" fill={col} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span style={{ fontSize:10, fontWeight:700, color:col, letterSpacing:'0.06em' }}>TOP REVIEW</span></div>}
                          <div style={{ padding:'20px 24px 0' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:16 }}>
                              <div style={{ position:'relative', flexShrink:0 }}>
                                <div style={{ width:46, height:46, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#06b6d4)', display:'grid', placeItems:'center', fontSize:14, fontWeight:700, color:'white', boxShadow:'0 4px 14px -4px rgba(6,182,212,0.5)' }}>{r.patientAvatar}</div>
                                <div style={{ position:'absolute', bottom:-1, right:-1, width:16, height:16, borderRadius:'50%', background:'#22c55e', border:'2px solid var(--frame)', display:'grid', placeItems:'center' }}><svg width="8" height="8" viewBox="0 0 10 10" fill="none"><polyline points="1 5 4 8 9 2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3, flexWrap:'wrap' }}>
                                  <span style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{r.patientName}</span>
                                  <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:100, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', color:'#22c55e', letterSpacing:'0.06em' }}>VERIFIED PATIENT</span>
                                </div>
                                <div style={{ fontSize:11, color:'var(--ink-3)' }}>{timeAgo(r.created)}</div>
                              </div>
                              <div style={{ flexShrink:0, textAlign:'right' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'flex-end', marginBottom:5 }}><Stars value={r.rating} size={16}/></div>
                                <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:100, background:bg, border:`1px solid ${col}33` }}>
                                  <span style={{ fontSize:13, fontWeight:800, color:col }}>{r.rating}.0</span>
                                  <span style={{ fontSize:10, fontWeight:600, color:col }}>{RATING_LABELS[r.rating]}</span>
                                </div>
                              </div>
                            </div>
                            {r.comment?(
                              <div style={{ position:'relative', paddingLeft:18, marginBottom:20 }}>
                                <span style={{ position:'absolute', left:0, top:-4, fontSize:32, lineHeight:1, color:col, opacity:0.4, fontFamily:'Georgia,serif', userSelect:'none' }}>"</span>
                                <p style={{ fontSize:14, color:'var(--ink-2)', lineHeight:1.7, margin:0, fontStyle:'italic' }}>{r.comment}</p>
                                <span style={{ fontSize:32, lineHeight:1, color:col, opacity:0.4, fontFamily:'Georgia,serif', userSelect:'none', float:'right', marginTop:-8 }}>"</span>
                              </div>
                            ):(
                              <p style={{ fontSize:13, color:'var(--ink-3)', fontStyle:'italic', marginBottom:20 }}>No written comment left.</p>
                            )}
                          </div>
                          <div style={{ borderTop:'1px solid var(--line)', background:'linear-gradient(135deg,rgba(255,61,110,0.02),rgba(122,77,255,0.02))' }}>
                            {r.doctorResponse&&!isReplying&&(
                              <div style={{ padding:'16px 24px' }}>
                                <div style={{ display:'flex', gap:12 }}>
                                  <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0, boxShadow:'0 4px 12px -4px rgba(122,77,255,0.45)' }}>{user.avatar}</div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                                      <span style={{ fontSize:12, fontWeight:700, color:'var(--ink)' }}>{user.name||`Dr. ${user.firstName} ${user.lastName}`}</span>
                                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:100, background:'rgba(255,61,110,0.1)', border:'1px solid rgba(255,61,110,0.2)', color:'#ff6a8d', letterSpacing:'0.06em' }}>DOCTOR REPLY</span>
                                      {r.responseDate&&<span style={{ fontSize:10, color:'var(--ink-3)', marginLeft:'auto' }}>{timeAgo(r.responseDate)}</span>}
                                    </div>
                                    <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.65, margin:0 }}>{r.doctorResponse}</p>
                                    <button onClick={()=>openReply(r)} style={{ marginTop:10, fontSize:11, fontWeight:600, color:'#7a4dff', background:'rgba(122,77,255,0.07)', border:'1px solid rgba(122,77,255,0.18)', borderRadius:8, padding:'4px 12px', cursor:'pointer' }}>✏ Edit Reply</button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!r.doctorResponse&&!isReplying&&(
                              <div style={{ padding:'12px 24px' }}>
                                <button onClick={()=>openReply(r)} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:600, color:'var(--ink-3)', background:'none', border:'none', cursor:'pointer', padding:0, transition:'color .2s' }} onMouseEnter={e=>e.currentTarget.style.color='#ff6a8d'} onMouseLeave={e=>e.currentTarget.style.color='var(--ink-3)'}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                  Reply to this review…
                                </button>
                              </div>
                            )}
                            <AnimatePresence>
                              {isReplying&&(
                                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} transition={{ duration:.25 }} style={{ overflow:'hidden' }}>
                                  <div style={{ padding:'16px 24px 20px' }}>
                                    <div style={{ display:'flex', gap:12 }}>
                                      <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#ff7a9c,#7a4dff)', display:'grid', placeItems:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0, boxShadow:'0 4px 12px -4px rgba(122,77,255,0.45)' }}>{user.avatar}</div>
                                      <div style={{ flex:1 }}>
                                        <div style={{ fontSize:11, fontWeight:600, color:'var(--ink-3)', marginBottom:8, letterSpacing:'0.04em' }}>Replying as <span style={{ color:'var(--ink)', fontWeight:700 }}>{user.name||`Dr. ${user.firstName} ${user.lastName}`}</span></div>
                                        <textarea value={replyDraft} onChange={e=>setReplyDraft(e.target.value)} maxLength={600} placeholder="Write a professional, thoughtful response visible to all patients…" autoFocus
                                          style={{ width:'100%', minHeight:88, borderRadius:12, padding:'11px 14px', fontSize:13, color:'var(--ink)', background:'var(--bg)', border:'1.5px solid rgba(122,77,255,0.35)', outline:'none', resize:'vertical', lineHeight:1.6, boxSizing:'border-box', fontFamily:'inherit', transition:'border-color .2s' }}
                                          onFocus={e=>e.target.style.borderColor='rgba(122,77,255,0.7)'}
                                          onBlur={e=>e.target.style.borderColor='rgba(122,77,255,0.35)'}/>
                                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10 }}>
                                          <span style={{ fontSize:10, color:'var(--ink-3)' }}>{replyDraft.length}/600</span>
                                          <div style={{ display:'flex', gap:8 }}>
                                            <button onClick={()=>{ setReplyingTo(null); setReplyDraft(''); }} style={{ padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:600, color:'var(--ink-2)', background:'var(--line)', border:'none', cursor:'pointer' }}>Cancel</button>
                                            <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }} disabled={!replyDraft.trim()||replyBusy} onClick={()=>handleReply(r.id)}
                                              style={{ padding:'7px 18px', borderRadius:10, fontSize:12, fontWeight:600, color:'white', background:'linear-gradient(135deg,#ff3d6e,#7a4dff)', border:'none', cursor:!replyDraft.trim()||replyBusy?'not-allowed':'pointer', opacity:!replyDraft.trim()?.5:1, display:'flex', alignItems:'center', gap:6 }}>
                                              {replyBusy?<span style={{ width:12, height:12, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin360 0.8s linear infinite', display:'inline-block' }}/>:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                                              Post Reply
                                            </motion.button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ══════════════ Brain Scan ══════════════ */}
          {tab==='Brain Scan' && <BrainScanTab onScanDone={() => { recordAiScan(user.id); refreshSysStats(); }} />}

          {/* ══════════════ Profile ══════════════ */}
          {tab==='Profile' && (
            <motion.div key="profile" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }}>
              <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:24 }}>My Profile</h2>
              <div className="glass-card" style={{ padding:28, maxWidth:560 }}>
                <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:28, paddingBottom:22, borderBottom:'1px solid var(--line)' }}>
                  <Avatar initials={user.avatar||'DR'} size={70}/>
                  <div>
                    <div style={{ fontSize:20, fontWeight:600, color:'var(--ink)', marginBottom:4 }}>{user.name||`Dr. ${user.firstName} ${user.lastName}`}</div>
                    <div style={{ fontSize:13, color:'var(--ink-2)', marginBottom:8 }}>{user.specialty||'—'} · {user.hospital||'—'}</div>
                    {isApproved?<div className="badge badge-approved">✓ Approved Physician</div>:isRejected?<div className="badge badge-rejected">Application Rejected</div>:<div className="badge badge-pending">Pending Approval</div>}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {[{label:'Email',value:user.email},{label:'Phone',value:user.phone||'—'},{label:'Medical License',value:user.license||'—'},{label:'Experience',value:user.experience?`${user.experience} years`:'—'},{label:'Specialty',value:user.specialty||'—'},{label:'Hospital / Clinic',value:user.hospital||'—'}].map(f=>(
                    <div key={f.label}>
                      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:4 }}>{f.label}</div>
                      <div style={{ fontSize:14, color:'var(--ink)', fontWeight:500 }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Toast notification ── */}
      <AnimatePresence>
        {toast && <ApptToast toast={toast} onDismiss={()=>setToast(null)}/>}
      </AnimatePresence>
    </div>
  );
}
