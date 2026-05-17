'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, logout, getPendingDoctors, getAllDoctors, getAllPatients, getStats, updateUserApproval, getActiveNotifications, dismissNotification, deleteUser, getPatientsByDoctor, getTopRatedDoctors, getAllReviews, getDoctorRating, getAiScansToday } from '@/lib/auth';
import Particles from '@/components/Particles';

const TABS = ['Overview', 'Doctors', 'Patients', 'Reviews', 'System'];

function Stars({ value, max = 5, size = 14 }) {
  return (
    <div style={{ display:'flex', gap:2 }}>
      {Array.from({ length:max }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={value >= i+1 ? '#f59e0b' : 'none'}
          stroke={value >= i+1 ? '#f59e0b' : 'rgba(164,171,187,0.4)'}
          strokeWidth="1.8">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

function Avatar({ initials, size = 36, gradient = 'linear-gradient(135deg,#f59e0b,#ef4444)' }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', display:'grid', placeItems:'center', fontSize: size * 0.32, fontWeight:700, color:'white', background:gradient, flexShrink:0 }}>
      {initials}
    </div>
  );
}

function DarkToggle({ dark, toggle }) {
  return (
    <button onClick={toggle} style={{ width:48, height:26, borderRadius:100, border:'none', cursor:'pointer', background: dark ? '#2a2c33' : '#dfe3eb', position:'relative', transition:'background .4s' }}>
      <motion.span animate={{ left: dark ? 25 : 3 }} transition={{ type:'spring', stiffness:380, damping:24 }}
        style={{ position:'absolute', top:3, width:20, height:20, borderRadius:'50%', display:'grid', placeItems:'center', color:'white', fontSize:10, background: dark ? 'linear-gradient(180deg,#ffd089,#f7a14a)' : 'linear-gradient(180deg,#b8c5e8,#8aa3da)', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}>
        {dark ? '☀' : '◑'}
      </motion.span>
    </button>
  );
}

function NotificationCard({ notif, onApprove, onReject, onDismiss, processing, index, total }) {
  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };
  return (
    <motion.div layout
      initial={{ opacity:0, x:80, scale:.92 }} animate={{ opacity:1, x:0, scale:1 }}
      exit={{ opacity:0, x:80, scale:.88, transition:{ duration:.25 } }}
      transition={{ type:'spring', stiffness:280, damping:26 }}
      style={{ width:'100%', borderRadius:20, background:'var(--glass)', backdropFilter:'blur(28px) saturate(160%)', WebkitBackdropFilter:'blur(28px) saturate(160%)', border:'1px solid var(--glass-stroke)', boxShadow:'0 20px 48px -10px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06) inset', overflow:'hidden', pointerEvents:'all' }}>
      <div style={{ height:3, background:'linear-gradient(90deg,#06b6d4,#0ea5e9 45%,#7c3aed)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)', animation:'sweep 2s ease-in-out infinite' }} />
      </div>
      <div style={{ padding:'16px 18px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:13 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span className="pulse-dot" style={{ width:7, height:7, borderRadius:'50%', background:'#f59e0b', display:'inline-block' }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#f59e0b' }}>New Registration · Doctor</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {total > 1 && <span style={{ fontSize:10, fontWeight:600, color:'var(--ink-3)', padding:'2px 7px', borderRadius:100, background:'var(--line)' }}>{index+1} / {total}</span>}
            <button onClick={() => onDismiss(notif)} style={{ width:22, height:22, borderRadius:6, border:'none', background:'var(--line)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-3)' }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:13, marginBottom:13 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', display:'grid', placeItems:'center', fontSize:17, fontWeight:700, color:'white', boxShadow:'0 6px 18px -4px rgba(6,182,212,0.5)' }}>{notif.doctorAvatar}</div>
            <div style={{ position:'absolute', inset:-4, borderRadius:18, border:'2px solid rgba(6,182,212,0.4)', animation:'borderGlow 2s ease-in-out infinite', pointerEvents:'none' }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{notif.doctorName}</div>
            <div style={{ fontSize:12, color:'var(--ink-2)' }}>{notif.specialty} · {notif.experience} yrs exp</div>
            <div style={{ fontSize:10, color:'var(--ink-3)', marginTop:2 }}>{timeAgo(notif.timestamp)}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:13, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:8, background:'var(--bg)', border:'1px solid var(--line)', fontSize:11, color:'var(--ink-2)', maxWidth:'100%', overflow:'hidden' }}>
            🏥 <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{notif.hospital}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:8, background:'var(--bg)', border:'1px solid var(--line)', fontSize:11, color:'var(--ink-2)' }}>
            📋 {notif.license}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }} disabled={processing===notif.id} onClick={() => onApprove(notif)}
            style={{ flex:1, height:40, borderRadius:11, fontSize:13, fontWeight:600, color:'white', border:'none', cursor: processing===notif.id ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, background: processing===notif.id ? 'rgba(34,197,94,0.4)' : 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: processing!==notif.id ? '0 4px 14px -4px rgba(34,197,94,0.55)' : 'none', transition:'all .2s' }}>
            {processing===notif.id
              ? <span style={{ width:13, height:13, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin360 0.8s linear infinite', display:'inline-block' }} />
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
            Approve
          </motion.button>
          <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }} disabled={processing===notif.id} onClick={() => onReject(notif)}
            style={{ flex:1, height:40, borderRadius:11, fontSize:13, fontWeight:600, color:'#ef4444', cursor: processing===notif.id ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', transition:'all .2s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reject
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function DoctorPatientsPanel({ doctor, patients, onClose }) {
  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(6px)', zIndex:600 }} />
      <motion.div
        initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
        transition={{ type:'spring', stiffness:320, damping:32 }}
        style={{ position:'fixed', right:0, top:0, bottom:0, width:440, zIndex:601, background:'var(--frame)', borderLeft:'1px solid var(--line)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Doctor header */}
        <div style={{ padding:'0 0 0 0', position:'relative', overflow:'hidden' }}>
          <div style={{ height:4, background:'linear-gradient(90deg,#06b6d4,#0ea5e9 45%,#7c3aed)' }} />
          <div style={{ padding:'20px 24px 20px', background:'linear-gradient(135deg,rgba(6,182,212,0.06),rgba(124,58,237,0.06))', borderBottom:'1px solid var(--line)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
              <div style={{ position:'relative' }}>
                <Avatar initials={doctor.avatar} size={52} gradient="linear-gradient(135deg,#0ea5e9,#7c3aed)" />
                {doctor.approved && <div style={{ position:'absolute', bottom:-2, right:-2, width:14, height:14, borderRadius:'50%', background:'#22c55e', border:'2px solid var(--frame)', display:'grid', placeItems:'center' }}><svg width="7" height="7" viewBox="0 0 10 10" fill="white"><polyline points="1 5 4 8 9 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg></div>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', marginBottom:3 }}>{doctor.name}</div>
                <div style={{ fontSize:12, color:'var(--ink-2)', marginBottom:8 }}>{doctor.specialty} · {doctor.hospital}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  <StatusBadge doctor={doctor} />
                  <span style={{ fontSize:10, fontWeight:600, color:'var(--ink-3)', padding:'3px 8px', borderRadius:100, background:'var(--line)' }}>📋 {doctor.license}</span>
                  <span style={{ fontSize:10, fontWeight:600, color:'var(--ink-3)', padding:'3px 8px', borderRadius:100, background:'var(--line)' }}>⭐ {doctor.experience} yrs</span>
                </div>
              </div>
              <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:'none', background:'var(--line)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-3)', flexShrink:0 }}>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Patient list header */}
        <div style={{ padding:'14px 24px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', display:'flex', alignItems:'center', gap:8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Assigned Patients
          </div>
          <div style={{ padding:'3px 10px', borderRadius:100, background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.2)', color:'#06b6d4', fontSize:11, fontWeight:700 }}>
            {patients.length} {patients.length === 1 ? 'patient' : 'patients'}
          </div>
        </div>

        {/* Scrollable patient list */}
        <div style={{ flex:1, overflowY:'auto', padding:'4px 24px 28px' }}>
          {patients.length === 0 ? (
            <div style={{ textAlign:'center', padding:'52px 0' }}>
              <div style={{ width:64, height:64, borderRadius:20, background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No patients yet</div>
              <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.6 }}>This doctor has no assigned patients at this time.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {patients.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * .07 }}
                  className="glass-card" style={{ padding:'16px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                    <Avatar initials={p.avatar} size={44} gradient="linear-gradient(135deg,#0ea5e9,#06b6d4)" />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{p.name}</div>
                      <div style={{ fontSize:12, color:'var(--ink-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.email}</div>
                    </div>
                    <div className="badge badge-approved" style={{ flexShrink:0 }}>Active</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {[
                      { icon:'🩸', label:'Blood type', value: p.bloodType || '—' },
                      { icon:'📅', label:'Date of birth', value: p.dob ? new Date(p.dob).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—' },
                      { icon:'📞', label:'Phone', value: p.phone || '—' },
                      { icon:'📆', label:'Joined', value: p.created ? new Date(p.created).toLocaleDateString('en-US', { month:'short', year:'numeric' }) : '—' },
                    ].map(info => (
                      <div key={info.label} style={{ padding:'8px 10px', borderRadius:10, background:'var(--bg)', border:'1px solid var(--line)' }}>
                        <div style={{ fontSize:10, color:'var(--ink-3)', fontWeight:500, marginBottom:2 }}>{info.icon} {info.label}</div>
                        <div style={{ fontSize:12, color:'var(--ink)', fontWeight:600 }}>{info.value}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function StatusBadge({ doctor }) {
  if (doctor.rejected) return <div className="badge badge-rejected">Rejected</div>;
  if (doctor.approved) return <div className="badge badge-approved">✓ Approved</div>;
  return <div className="badge badge-pending"><span className="pulse-dot" style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b', display:'inline-block' }} /> Pending</div>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser]           = useState(null);
  const [tab, setTab]             = useState('Overview');
  const [dark, setDark]           = useState(false);
  const [ready, setReady]         = useState(false);
  const [stats, setStats]         = useState({ totalDoctors:0, approvedDoctors:0, pendingDoctors:0, rejectedDoctors:0, totalPatients:0 });
  const [aiScansToday, setAiScansToday] = useState(0);
  const [pending, setPending]     = useState([]);
  const [doctors, setDoctors]     = useState([]);
  const [patients, setPatients]   = useState([]);
  const [processing, setProcessing] = useState(null);
  const [notification, setNotification] = useState(null);
  const [docNotifs, setDocNotifs] = useState([]);
  const [processingNotif, setProcessingNotif] = useState(null);
  const [hiddenNotifIds, setHiddenNotifIds] = useState(new Set());
  const [deletingId, setDeletingId] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorPatients, setDoctorPatients] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);
  const [allReviews, setAllReviews] = useState([]);

  const refreshData = () => {
    setStats(getStats());
    setPending(getPendingDoctors());
    setDoctors(getAllDoctors());
    setPatients(getAllPatients());
    setTopDoctors(getTopRatedDoctors(5));
    setAllReviews(getAllReviews());
    setAiScansToday(getAiScansToday());
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.classList.toggle('dark', saved);
    const u = getCurrentUser();
    if (!u) { window.location.href = '/login'; return; }
    if (u.role !== 'admin') { window.location.href = `/dashboard/${u.role}`; return; }
    setUser(u);
    refreshData();
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const check = () => {
      setDocNotifs(getActiveNotifications());
      setAiScansToday(getAiScansToday());
    };
    check();
    const interval = setInterval(check, 3000);
    const onStorage = (e) => {
      if (e.key === 'neural_notifications' || e.key === 'neural_ai_scan_log' || e.key === 'neural_messages') check();
    };
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(interval); window.removeEventListener('storage', onStorage); };
  }, [ready]);

  const toggleDark = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleLogout = () => { logout(); window.location.href = '/login'; };

  const handleApprove = (doctor) => {
    setProcessing(doctor.id);
    setTimeout(() => {
      updateUserApproval(doctor.id, true, false);
      getActiveNotifications().filter(n => n.doctorId === doctor.id).forEach(n => dismissNotification(n.id));
      setDocNotifs(getActiveNotifications());
      refreshData();
      setProcessing(null);
      setNotification({ type:'success', message:`Dr. ${doctor.lastName} has been approved and can now access all features.` });
      setTimeout(() => setNotification(null), 4000);
    }, 900);
  };

  const handleReject = (doctor) => {
    setProcessing(doctor.id);
    setTimeout(() => {
      updateUserApproval(doctor.id, false, true);
      getActiveNotifications().filter(n => n.doctorId === doctor.id).forEach(n => dismissNotification(n.id));
      setDocNotifs(getActiveNotifications());
      refreshData();
      setProcessing(null);
      setNotification({ type:'error', message:`Dr. ${doctor.lastName}'s application has been rejected.` });
      setTimeout(() => setNotification(null), 4000);
    }, 900);
  };

  const handleNotifApprove = (notif) => {
    setProcessingNotif(notif.id);
    setTimeout(() => {
      updateUserApproval(notif.doctorId, true, false);
      dismissNotification(notif.id);
      setDocNotifs(getActiveNotifications());
      refreshData();
      setProcessingNotif(null);
      setNotification({ type:'success', message:`Dr. ${notif.doctorName.split(' ').pop()} approved — full access granted.` });
      setTimeout(() => setNotification(null), 4000);
    }, 900);
  };

  const handleNotifReject = (notif) => {
    setProcessingNotif(notif.id);
    setTimeout(() => {
      updateUserApproval(notif.doctorId, false, true);
      dismissNotification(notif.id);
      setDocNotifs(getActiveNotifications());
      refreshData();
      setProcessingNotif(null);
      setNotification({ type:'error', message:`Dr. ${notif.doctorName.split(' ').pop()}'s application has been rejected.` });
      setTimeout(() => setNotification(null), 4000);
    }, 900);
  };

  const handleNotifDismiss = (notif) => {
    setHiddenNotifIds(prev => new Set([...prev, notif.id]));
  };

  const handleDeleteDoctor = (doctor) => {
    getActiveNotifications().filter(n => n.doctorId === doctor.id).forEach(n => dismissNotification(n.id));
    deleteUser(doctor.id);
    setDocNotifs(getActiveNotifications());
    refreshData();
    setDeletingId(null);
    if (selectedDoctor?.id === doctor.id) setSelectedDoctor(null);
    setNotification({ type:'error', message:`Dr. ${doctor.lastName} has been removed from the platform.` });
    setTimeout(() => setNotification(null), 4000);
  };

  if (!ready || !user) return (
    <div className="frame" style={{ minHeight:'calc(100vh - 28px)', display:'grid', placeItems:'center' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid var(--line)', borderTopColor:'#f59e0b', animation:'spin360 0.8s linear infinite' }} />
        <p style={{ fontSize:13, color:'var(--ink-3)' }}>Loading dashboard…</p>
      </div>
    </div>
  );

  const statCards = [
    { label:'Total Doctors',    value: stats.totalDoctors,    icon:'👨‍⚕️', color:'#06b6d4', bg:'rgba(6,182,212,0.1)',  border:'rgba(6,182,212,0.2)'  },
    { label:'Approved',         value: stats.approvedDoctors, icon:'✅',   color:'#22c55e', bg:'rgba(34,197,94,0.1)',   border:'rgba(34,197,94,0.2)'   },
    { label:'Pending Approval', value: stats.pendingDoctors,  icon:'⏳',   color:'#f59e0b', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.2)', pulse: stats.pendingDoctors > 0 },
    { label:'Patients',         value: stats.totalPatients,   icon:'🩺',   color:'#7c3aed', bg:'rgba(124,58,237,0.1)', border:'rgba(124,58,237,0.2)'  },
  ];

  return (
    <div className="frame" style={{ minHeight:'calc(100vh - 28px)', overflow:'hidden', position:'relative' }}>
      <Particles />
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'5%', right:'5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,0.07),transparent 70%)', filter:'blur(70px)' }} />
        <div style={{ position:'absolute', bottom:'8%', left:'5%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.09),transparent 70%)', filter:'blur(60px)' }} />
      </div>

      {/* Top bar */}
      <motion.header initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:.6 }}
        style={{ position:'relative', zIndex:30, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 28px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#030d18 0%,#060f1e 55%,#0c0520 100%)', border:'1px solid rgba(6,182,212,0.22)', display:'grid', placeItems:'center', overflow:'hidden', boxShadow:'0 0 12px rgba(6,182,212,0.22), 0 2px 6px rgba(0,0,0,0.18)', flexShrink:0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M2 12C2 12 6.5 5 12 5C17.5 5 22 12 22 12C22 12 17.5 19 12 19C6.5 19 2 12 2 12Z" stroke="url(#mv-admin-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3.2" stroke="url(#mv-admin-g)" strokeWidth="1.6"/>
              <circle cx="12" cy="12" r="1.3" fill="url(#mv-admin-g)"/>
              <defs><linearGradient id="mv-admin-g" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#9061f9"/></linearGradient></defs>
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
            <button key={t} onClick={() => setTab(t)} style={{ padding:'8px 16px', borderRadius:100, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', transition:'all .25s', background: tab === t ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'transparent', color: tab === t ? 'white' : 'var(--ink-2)', position:'relative' }}>
              {t}
              {t === 'Overview' && stats.pendingDoctors > 0 && (
                <span style={{ position:'absolute', top:4, right:4, width:7, height:7, borderRadius:'50%', background:'#f59e0b', border:'1.5px solid var(--frame)' }} />
              )}
            </button>
          ))}
        </nav>

        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <button onClick={() => { setTab('Overview'); setHiddenNotifIds(new Set()); }} style={{ position:'relative', width:36, height:36, borderRadius:10, border:'none', cursor:'pointer', background: docNotifs.length > 0 ? 'rgba(245,158,11,0.12)' : 'var(--line)', display:'flex', alignItems:'center', justifyContent:'center', color: docNotifs.length > 0 ? '#f59e0b' : 'var(--ink-2)', transition:'all .3s', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ transformOrigin:'top center', animation: docNotifs.length > 0 ? 'bellRing 2s ease-in-out infinite' : 'none' }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {docNotifs.length > 0 && (
              <span style={{ position:'absolute', top:-5, right:-5, minWidth:18, height:18, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#0ea5e9)', color:'white', fontSize:9, fontWeight:800, display:'grid', placeItems:'center', border:'2px solid var(--frame)', padding:'0 3px', lineHeight:1 }}>
                {docNotifs.length}
              </span>
            )}
          </button>
          <div className="badge badge-admin">Head of Dept.</div>
          <DarkToggle dark={dark} toggle={toggleDark} />
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Avatar initials={user.avatar || 'AD'} size={34} />
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', lineHeight:1.2 }}>{user.name || user.firstName}</div>
              <div style={{ fontSize:10, color:'var(--ink-3)' }}>{user.specialty || 'Administrator'}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:500, color:'var(--ink-2)', background:'var(--line)', border:'none', cursor:'pointer' }}>
            Logout
          </button>
        </div>
      </motion.header>

      {/* Toast notification */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity:0, y:-20, x:'-50%' }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
            style={{ position:'fixed', top:90, left:'50%', zIndex:100, padding:'12px 20px', borderRadius:14, fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:10, boxShadow:'0 8px 24px -6px rgba(0,0,0,0.35)', background: notification.type === 'success' ? 'rgba(22,163,74,0.95)' : 'rgba(185,28,28,0.95)', color:'white', backdropFilter:'blur(10px)' }}>
            {notification.type === 'success'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            }
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <main style={{ position:'relative', zIndex:10, padding:'28px 28px 40px', overflowY:'auto', maxHeight:'calc(100vh - 100px)' }}>
        <AnimatePresence mode="wait">

          {/* ── Overview ── */}
          {tab === 'Overview' && (
            <motion.div key="overview" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }} transition={{ duration:.45 }} style={{ paddingRight:72 }}>
              {/* Welcome */}
              <div style={{ marginBottom:26 }}>
                <h2 className="font-serif" style={{ fontSize:28, fontWeight:400, color:'var(--ink)', marginBottom:4 }}>
                  Welcome back, <em className="text-gradient">{user.firstName || 'Admin'}</em>
                </h2>
                <p style={{ fontSize:13, color:'var(--ink-3)' }}>
                  {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })} · System Administrator
                </p>
              </div>

              {/* Stats grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
                {statCards.map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * .07 }}
                    className="glass-card" style={{ padding:22, position:'relative', overflow:'hidden' }}>
                    {s.pulse && (
                      <div style={{ position:'absolute', top:14, right:14, width:8, height:8, borderRadius:'50%', background:s.color }} className="pulse-dot" />
                    )}
                    <div style={{ fontSize:28, marginBottom:12 }}>{s.icon}</div>
                    <div className="stat-number" style={{ fontSize:32, fontWeight:800, color:s.color, lineHeight:1, marginBottom:6 }}>{s.value}</div>
                    <div style={{ fontSize:12, color:'var(--ink-2)', fontWeight:500 }}>{s.label}</div>
                    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:s.color, opacity:.25, borderRadius:'0 0 20px 20px' }} />
                  </motion.div>
                ))}
              </div>

              {/* Pending approvals */}
              {pending.length > 0 ? (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.25 }} className="glass-card" style={{ padding:24, marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>Pending Approvals</div>
                        <div style={{ fontSize:11, color:'var(--ink-3)' }}>Action required</div>
                      </div>
                    </div>
                    <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', color:'#f59e0b', fontSize:12, fontWeight:700 }}>
                      {pending.length} waiting
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <AnimatePresence>
                      {pending.map((doc, i) => (
                        <motion.div key={doc.id}
                          initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:30, height:0, marginBottom:0, overflow:'hidden' }}
                          transition={{ delay: i * .06, exit: { duration:.35 } }}
                          style={{ padding:'18px 20px', borderRadius:16, background:'var(--bg)', border:'1px solid var(--line)', position:'relative', overflow:'hidden' }}>
                          <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'linear-gradient(180deg,#f59e0b,#06b6d4)', borderRadius:'3px 0 0 3px' }} />
                          <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                            <Avatar initials={doc.avatar} size={46} gradient="linear-gradient(135deg,#0ea5e9,#7c3aed)" />
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                                <span style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>{doc.name}</span>
                                <div className="badge badge-pending">Pending</div>
                              </div>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px', fontSize:12, color:'var(--ink-2)', marginBottom:10 }}>
                                <span>🩺 {doc.specialty || '—'}</span>
                                <span>🏥 {doc.hospital || '—'}</span>
                                <span>📋 {doc.license || '—'}</span>
                                <span>⭐ {doc.experience || '—'} yrs exp.</span>
                              </div>
                              <div style={{ fontSize:11, color:'var(--ink-3)' }}>
                                Applied {doc.created ? new Date(doc.created).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '—'}
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                              <motion.button
                                whileHover={{ y:-2 }} whileTap={{ scale:.95 }}
                                disabled={processing === doc.id}
                                onClick={() => handleApprove(doc)}
                                style={{ padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:600, color:'white', background: processing === doc.id ? '#555' : 'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all .2s', boxShadow: processing !== doc.id ? '0 4px 12px -4px rgba(34,197,94,0.4)' : 'none' }}>
                                {processing === doc.id
                                  ? <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', borderRadius:'50%', animation:'spin360 0.8s linear infinite' }} />
                                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                }
                                {processing === doc.id ? '…' : 'Approve'}
                              </motion.button>
                              <motion.button
                                whileHover={{ y:-2 }} whileTap={{ scale:.95 }}
                                disabled={processing === doc.id}
                                onClick={() => handleReject(doc)}
                                style={{ padding:'9px 16px', borderRadius:10, fontSize:13, fontWeight:600, color:'#ef4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all .2s' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                Reject
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.25 }}
                  className="glass-card" style={{ padding:28, textAlign:'center', marginBottom:24 }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:4 }}>All approvals processed</div>
                  <div style={{ fontSize:13, color:'var(--ink-3)' }}>No pending doctor applications at this time</div>
                </motion.div>
              )}

              {/* Top Rated Doctors Leaderboard */}
              {topDoctors.length > 0 && (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3 }}
                  className="glass-card" style={{ padding:26, marginBottom:20, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#f59e0b,#0ea5e9 40%,#7c3aed)' }} />
                  <div style={{ position:'absolute', top:'20%', right:'-5%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,0.06),transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(6,182,212,0.15))', border:'1px solid rgba(245,158,11,0.3)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>Most Rated Doctors</div>
                        <div style={{ fontSize:11, color:'var(--ink-3)' }}>Based on patient reviews</div>
                      </div>
                    </div>
                    <button onClick={() => setTab('Reviews')} style={{ fontSize:12, color:'#f59e0b', fontWeight:600, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', padding:'6px 14px', borderRadius:10, cursor:'pointer' }}>
                      All Reviews →
                    </button>
                  </div>

                  {/* Podium for top 3 */}
                  {topDoctors.length >= 1 && (
                    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:12, marginBottom:20 }}>
                      {[
                        topDoctors[1],
                        topDoctors[0],
                        topDoctors[2],
                      ].filter(Boolean).map((doc, idx) => {
                        const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                        const medals = { 1:{ emoji:'🥇', color:'#f59e0b', glow:'rgba(245,158,11,0.35)', h:165, bg:'linear-gradient(180deg,rgba(245,158,11,0.15),rgba(245,158,11,0.04))' }, 2:{ emoji:'🥈', color:'#9ca3af', glow:'rgba(156,163,175,0.2)', h:140, bg:'linear-gradient(180deg,rgba(156,163,175,0.1),rgba(156,163,175,0.03))' }, 3:{ emoji:'🥉', color:'#f97316', glow:'rgba(249,115,22,0.2)', h:128, bg:'linear-gradient(180deg,rgba(249,115,22,0.1),rgba(249,115,22,0.03))' } };
                        const m = medals[rank];
                        return (
                          <motion.div key={doc.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.05*idx+.4 }}
                            style={{ flex:1, maxWidth:200, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
                            {/* Crown + avatar sit ABOVE the card so overflow:hidden never clips them */}
                            {rank === 1 && (
                              <div style={{ fontSize:20, marginBottom:4, lineHeight:1 }}>👑</div>
                            )}
                            <div style={{
                              width:rank===1?56:46, height:rank===1?56:46, borderRadius:rank===1?16:13,
                              background:'linear-gradient(135deg,#0ea5e9,#7c3aed)',
                              display:'grid', placeItems:'center',
                              fontSize:rank===1?18:14, fontWeight:700, color:'white',
                              boxShadow:`0 4px 16px -4px ${m.glow}`, flexShrink:0,
                              marginBottom:-Math.round((rank===1?56:46)/2),  // overlap into card by half the avatar height
                              position:'relative', zIndex:1,
                            }}>{doc.avatar}</div>
                            <div style={{ width:'100%', minHeight:m.h, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', paddingBottom:14, paddingTop:Math.round((rank===1?56:46)/2)+8, borderRadius:20, background:m.bg, border:`1px solid ${m.color}22`, boxShadow:`0 0 24px -6px ${m.glow}`, position:'relative', overflow:'hidden' }}>
                              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:m.color, opacity:.6 }} />
                              <div style={{ position:'absolute', top:10, right:10, fontSize:rank===1?18:14 }}>{m.emoji}</div>
                              <div style={{ fontSize:rank===1?13:12, fontWeight:700, color:'var(--ink)', marginBottom:2, paddingInline:8, maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name.replace('Dr. ','Dr.')}</div>
                              <div style={{ fontSize:10, color:'var(--ink-3)', marginBottom:6, maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingInline:8 }}>{doc.specialty}</div>
                              <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'center' }}>
                                <Stars value={Math.round(doc.avg)} size={rank===1?13:11} />
                              </div>
                              <div style={{ fontSize:rank===1?13:11, fontWeight:800, color:m.color, marginTop:2 }}>
                                {doc.avg > 0 ? doc.avg : '—'}
                              </div>
                              <div style={{ fontSize:10, color:'var(--ink-3)', marginTop:1 }}>{doc.count} review{doc.count!==1?'s':''}</div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Ranks 4–5 as list */}
                  {topDoctors.slice(3).map((doc, i) => (
                    <motion.div key={doc.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:.55+i*.05 }}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background:'var(--bg)', border:'1px solid var(--line)', marginBottom:6 }}>
                      <div style={{ width:24, height:24, borderRadius:8, background:'var(--line)', display:'grid', placeItems:'center', fontSize:11, fontWeight:700, color:'var(--ink-3)', flexShrink:0 }}>{i+4}</div>
                      <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', display:'grid', placeItems:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>{doc.avatar}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{doc.name}</div>
                        <div style={{ fontSize:11, color:'var(--ink-3)' }}>{doc.specialty}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end', marginBottom:2 }}>
                          <Stars value={Math.round(doc.avg)} size={11} />
                          <span style={{ fontSize:12, fontWeight:700, color:'#f59e0b' }}>{doc.avg}</span>
                        </div>
                        <div style={{ fontSize:10, color:'var(--ink-3)' }}>{doc.count} reviews</div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* All doctors summary */}
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.35 }} className="glass-card" style={{ padding:22 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:16 }}>All Registered Doctors</div>
                <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                  {doctors.map((doc, i) => (
                    <motion.div key={doc.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:.4 + i * .05 }}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'11px 6px', borderBottom: i < doctors.length-1 ? '1px solid var(--line)' : 'none' }}>
                      <Avatar initials={doc.avatar} size={36} gradient="linear-gradient(135deg,#0ea5e9,#7c3aed)" />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{doc.name}</div>
                        <div style={{ fontSize:11, color:'var(--ink-3)' }}>{doc.specialty} · {doc.hospital}</div>
                      </div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', minWidth:80, textAlign:'center' }}>{doc.license}</div>
                      <StatusBadge doctor={doc} />
                      {!doc.approved && !doc.rejected && (
                        <div style={{ display:'flex', gap:6 }}>
                          <button disabled={processing === doc.id} onClick={() => handleApprove(doc)}
                            style={{ padding:'4px 12px', borderRadius:8, fontSize:11, fontWeight:600, color:'#22c55e', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', cursor:'pointer' }}>
                            Approve
                          </button>
                          <button disabled={processing === doc.id} onClick={() => handleReject(doc)}
                            style={{ padding:'4px 12px', borderRadius:8, fontSize:11, fontWeight:600, color:'#ef4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer' }}>
                            Reject
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── Doctors tab ── */}
          {tab === 'Doctors' && (
            <motion.div key="doctors" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }} style={{ paddingRight:72 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
                <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)' }}>Doctor Management</h2>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {stats.pendingDoctors > 0 && <div className="badge badge-pending">{stats.pendingDoctors} pending review</div>}
                  <div style={{ fontSize:11, color:'var(--ink-3)' }}>{doctors.length} total</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <AnimatePresence>
                  {doctors.map((doc, i) => {
                    const patCount = getPatientsByDoctor(doc.id).length;
                    return (
                      <motion.div key={doc.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:40, height:0, overflow:'hidden', marginBottom:0 }} transition={{ delay: i * .06, exit:{ duration:.3 } }}
                        className="glass-card" style={{ padding:20, display:'flex', alignItems:'center', gap:16 }}>
                        {/* Avatar */}
                        <div style={{ position:'relative', flexShrink:0 }}>
                          <Avatar initials={doc.avatar} size={52} gradient="linear-gradient(135deg,#0ea5e9,#7c3aed)" />
                          {doc.approved && <div style={{ position:'absolute', bottom:-2, right:-2, width:14, height:14, borderRadius:'50%', background:'#22c55e', border:'2px solid var(--frame)', display:'grid', placeItems:'center' }}><svg width="7" height="7" viewBox="0 0 10 10" fill="none"><polyline points="1 5 4 8 9 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/></svg></div>}
                        </div>
                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                            <span style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>{doc.name}</span>
                            <StatusBadge doctor={doc} />
                            <button onClick={() => { setSelectedDoctor(doc); setDoctorPatients(getPatientsByDoctor(doc.id)); }}
                              style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:100, background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.2)', color:'#06b6d4', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                              {patCount} {patCount === 1 ? 'patient' : 'patients'}
                            </button>
                          </div>
                          <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--ink-2)', flexWrap:'wrap' }}>
                            <span>🩺 {doc.specialty}</span>
                            <span>🏥 {doc.hospital}</span>
                            <span>📋 {doc.license}</span>
                            <span>⭐ {doc.experience} yrs</span>
                          </div>
                        </div>
                        {/* Actions */}
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                          {/* View patients button */}
                          <motion.button whileHover={{ y:-1 }} whileTap={{ scale:.97 }}
                            onClick={() => { setSelectedDoctor(doc); setDoctorPatients(getPatientsByDoctor(doc.id)); }}
                            style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:600, color:'#06b6d4', background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            Patients
                          </motion.button>
                          {/* Approve / Reject if pending */}
                          {!doc.approved && !doc.rejected && (<>
                            <motion.button whileHover={{ y:-1 }} disabled={processing===doc.id} onClick={() => handleApprove(doc)}
                              style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:600, color:'white', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', cursor:'pointer' }}>
                              ✓ Approve
                            </motion.button>
                            <motion.button whileHover={{ y:-1 }} disabled={processing===doc.id} onClick={() => handleReject(doc)}
                              style={{ padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:600, color:'#ef4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer' }}>
                              ✗ Reject
                            </motion.button>
                          </>)}
                          {/* Revoke if approved */}
                          {doc.approved && (
                            <button onClick={() => { updateUserApproval(doc.id, false, false); refreshData(); }}
                              style={{ padding:'7px 11px', borderRadius:10, fontSize:11, fontWeight:500, color:'var(--ink-3)', background:'var(--line)', border:'none', cursor:'pointer' }}>
                              Revoke
                            </button>
                          )}
                          {/* Delete with inline confirm */}
                          <AnimatePresence mode="wait">
                            {deletingId === doc.id ? (
                              <motion.div key="confirm" initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:.9 }}
                                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:10, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)' }}>
                                <span style={{ fontSize:11, color:'#ef4444', fontWeight:600, whiteSpace:'nowrap' }}>Remove?</span>
                                <button onClick={() => handleDeleteDoctor(doc)} style={{ padding:'4px 9px', borderRadius:6, fontSize:11, fontWeight:700, color:'white', background:'#ef4444', border:'none', cursor:'pointer' }}>Yes</button>
                                <button onClick={() => setDeletingId(null)} style={{ padding:'4px 9px', borderRadius:6, fontSize:11, fontWeight:600, color:'var(--ink-2)', background:'var(--line)', border:'none', cursor:'pointer' }}>No</button>
                              </motion.div>
                            ) : (
                              <motion.button key="trash" whileHover={{ y:-1 }} whileTap={{ scale:.95 }} onClick={() => setDeletingId(doc.id)}
                                style={{ width:34, height:34, borderRadius:9, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.06)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {doctors.length === 0 && (
                  <div style={{ textAlign:'center', padding:'48px 0', color:'var(--ink-3)', fontSize:13 }}>No doctors registered yet.</div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Patients tab ── */}
          {tab === 'Patients' && (
            <motion.div key="patients" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }} style={{ paddingRight:72 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
                <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)' }}>Registered Patients</h2>
                <div className="badge badge-patient">{stats.totalPatients} total</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {patients.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * .07 }}
                    className="glass-card" style={{ padding:18, display:'flex', alignItems:'center', gap:14 }}>
                    <Avatar initials={p.avatar} size={44} gradient="linear-gradient(135deg,#0ea5e9,#06b6d4)" />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:3 }}>{p.name}</div>
                      <div style={{ fontSize:12, color:'var(--ink-3)' }}>{p.email} · Blood Type: {p.bloodType || '—'}</div>
                    </div>
                    <div className="badge badge-approved">Active</div>
                    <div style={{ fontSize:11, color:'var(--ink-3)' }}>
                      Joined {p.created ? new Date(p.created).toLocaleDateString('en-US', { month:'short', year:'numeric' }) : '—'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Reviews tab ── */}
          {tab === 'Reviews' && (
            <motion.div key="reviews" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }} style={{ paddingRight:72 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <div>
                  <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:2 }}>Patient Reviews</h2>
                  <p style={{ fontSize:13, color:'var(--ink-3)' }}>{allReviews.length} total review{allReviews.length!==1?'s':''} · public visibility</p>
                </div>
                <div style={{ padding:'6px 14px', borderRadius:100, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#f59e0b', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Live ratings
                </div>
              </div>

              {/* Top doctor rankings */}
              {topDoctors.length > 0 && (
                <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}
                  className="glass-card" style={{ padding:22, marginBottom:20 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    <span>🏆</span> Doctor Rankings
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {topDoctors.map((doc, i) => {
                      const pct = doc.avg > 0 ? (doc.avg / 5) * 100 : 0;
                      const rankColors = ['#f59e0b','#9ca3af','#f97316','var(--ink-3)','var(--ink-3)'];
                      const rankBg = ['rgba(245,158,11,0.1)','rgba(156,163,175,0.1)','rgba(249,115,22,0.1)','var(--bg)','var(--bg)'];
                      return (
                        <motion.div key={doc.id} initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay:.15+i*.06 }}
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:14, background:rankBg[i], border:`1px solid ${i<3?rankColors[i]+'33':'var(--line)'}` }}>
                          <div style={{ width:28, height:28, borderRadius:9, background:`${rankColors[i]}22`, border:`1px solid ${rankColors[i]}44`, display:'grid', placeItems:'center', flexShrink:0 }}>
                            <span style={{ fontSize:12, fontWeight:800, color:rankColors[i] }}>{i+1}</span>
                          </div>
                          <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', display:'grid', placeItems:'center', fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>{doc.avatar}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:4 }}>{doc.name}</div>
                            <div style={{ height:5, borderRadius:100, background:'var(--line)', overflow:'hidden' }}>
                              <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ delay:.3+i*.06, duration:.6, ease:'easeOut' }}
                                style={{ height:'100%', borderRadius:100, background:`linear-gradient(90deg,${rankColors[i]},${rankColors[i]}99)` }} />
                            </div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
                              <Stars value={Math.round(doc.avg)} size={12} />
                              <span style={{ fontSize:13, fontWeight:800, color:rankColors[i] }}>{doc.avg}</span>
                            </div>
                            <div style={{ fontSize:10, color:'var(--ink-3)', marginTop:2 }}>{doc.count} review{doc.count!==1?'s':''}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* All reviews feed */}
              {allReviews.length === 0 ? (
                <div className="glass-card" style={{ padding:48, textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>⭐</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No reviews yet</div>
                  <div style={{ fontSize:13, color:'var(--ink-3)' }}>Patient reviews will appear here once submitted</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:4 }}>All Reviews · Most Recent First</div>
                  <AnimatePresence>
                    {allReviews.map((r, i) => {
                      const timeAgoFn = (iso) => {
                        const diff = Date.now() - new Date(iso).getTime();
                        const days = Math.floor(diff / 86400000);
                        if (days < 1) return 'today'; if (days === 1) return 'yesterday';
                        if (days < 30) return `${days}d ago`;
                        return `${Math.floor(days/30)}mo ago`;
                      };
                      return (
                        <motion.div key={r.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.04 }}
                          className="glass-card" style={{ padding:20, position:'relative', overflow:'hidden' }}>
                          <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:`linear-gradient(180deg,#f59e0b,#0ea5e9)`, borderRadius:'3px 0 0 3px' }} />
                          <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                            <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#0ea5e9,#06b6d4)', display:'grid', placeItems:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>{r.patientAvatar}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3, flexWrap:'wrap' }}>
                                <span style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{r.patientName}</span>
                                <span style={{ fontSize:10, color:'var(--ink-3)' }}>reviewed</span>
                                <span style={{ fontSize:13, fontWeight:600, color:'#0ea5e9' }}>{r.doctorName}</span>
                              </div>
                              <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:8 }}>{r.specialty} · {timeAgoFn(r.created)}</div>
                              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:r.comment?10:0 }}>
                                <Stars value={r.rating} size={14} />
                                <span style={{ fontSize:12, fontWeight:700, color:'#f59e0b' }}>{r.rating}.0</span>
                                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#f59e0b', fontWeight:600 }}>
                                  {['','Poor','Fair','Good','Very Good','Excellent'][r.rating]}
                                </span>
                              </div>
                              {r.comment && (
                                <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.65, margin:0, fontStyle:'italic', paddingLeft:10, borderLeft:'2px solid rgba(245,158,11,0.3)' }}>"{r.comment}"</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* ── System tab ── */}
          {tab === 'System' && (
            <motion.div key="system" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }} style={{ paddingRight:72 }}>
              <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', marginBottom:24 }}>System Status</h2>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                {[
                  { name:'MedVision AI Engine', status:'Operational', uptime:'99.98%', color:'#22c55e' },
                  { name:'Medical Records DB', status:'Operational', uptime:'100%', color:'#22c55e' },
                  { name:'Diagnostic API', status:'Operational', uptime:'99.95%', color:'#22c55e' },
                  { name:'Authentication Service', status:'Operational', uptime:'100%', color:'#22c55e' },
                ].map((s, i) => (
                  <motion.div key={s.name} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * .08 }}
                    className="glass-card" style={{ padding:22 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:s.color }} className="pulse-dot" />
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{s.name}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div className="badge badge-approved">{s.status}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:s.color }}>↑ {s.uptime}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.35 }}
                className="glass-card" style={{ padding:24, marginTop:16 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:14 }}>Platform Overview</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {[
                    { label:'Total Users', value: stats.totalDoctors + stats.totalPatients + 1 },
                    { label:'Approved Doctors', value: stats.approvedDoctors },
                    { label:'Active Patients', value: stats.totalPatients },
                    { label:'AI Scans Today', value: aiScansToday },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign:'center', padding:14, borderRadius:12, background:'var(--bg)', border:'1px solid var(--line)' }}>
                      <div style={{ fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>{m.value}</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', fontWeight:500 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Doctor patients panel */}
      <AnimatePresence>
        {selectedDoctor && (
          <DoctorPatientsPanel
            doctor={selectedDoctor}
            patients={doctorPatients}
            onClose={() => { setSelectedDoctor(null); setDoctorPatients([]); }}
          />
        )}
      </AnimatePresence>

      {/* Floating notification cards */}
      <div style={{ position:'fixed', right:20, bottom:20, zIndex:1000, display:'flex', flexDirection:'column-reverse', gap:10, width:380, pointerEvents:'none' }}>
        <AnimatePresence>
          {docNotifs.filter(n => !hiddenNotifIds.has(n.id)).slice(0, 3).map((notif, i, arr) => (
            <NotificationCard key={notif.id} notif={notif} onApprove={handleNotifApprove} onReject={handleNotifReject} onDismiss={handleNotifDismiss} processing={processingNotif} index={i} total={arr.length} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
