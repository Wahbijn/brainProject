'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signup, initAuth, getCurrentUser, createDoctorNotification } from '@/lib/auth';
import Particles from '@/components/Particles';

const ROLES = [
  {
    id: 'patient',
    title: 'Patient',
    subtitle: 'Access health records, book appointments, and receive AI-powered health insights.',
    gradient: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
    glow: 'rgba(6,182,212,0.35)',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    id: 'doctor',
    title: 'Doctor',
    subtitle: 'Manage patients, use AI diagnostics, and collaborate with your medical team.',
    gradient: 'linear-gradient(135deg,#0ea5e9,#7c3aed)',
    glow: 'rgba(6,182,212,0.35)',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
];

const PATIENT_FIELDS = [
  { name: 'firstName',       label: 'First Name',     type: 'text',   half: true },
  { name: 'lastName',        label: 'Last Name',      type: 'text',   half: true },
  { name: 'email',           label: 'Email Address',  type: 'email' },
  { name: 'password',        label: 'Password',       type: 'password' },
  { name: 'confirmPassword', label: 'Confirm Password', type: 'password' },
  { name: 'dob',             label: 'Date of Birth',  type: 'date',   half: true },
  { name: 'phone',           label: 'Phone Number',   type: 'tel',    half: true },
  {
    name: 'bloodType', label: 'Blood Type (Optional)', type: 'select', optional: true,
    options: ['A+','A-','B+','B-','AB+','AB-','O+','O-'],
  },
];

const DOCTOR_FIELDS = [
  { name: 'firstName',       label: 'First Name',          type: 'text',   half: true },
  { name: 'lastName',        label: 'Last Name',           type: 'text',   half: true },
  { name: 'email',           label: 'Email Address',       type: 'email' },
  { name: 'password',        label: 'Password',            type: 'password' },
  { name: 'confirmPassword', label: 'Confirm Password',    type: 'password' },
  {
    name: 'specialty', label: 'Medical Specialty', type: 'select',
    options: ['Neurology','Cardiology','Oncology','Radiology','Surgery','Pediatrics','Psychiatry','Orthopedics','Dermatology','Other'],
  },
  { name: 'license',    label: 'Medical License No.',    type: 'text', half: true },
  { name: 'experience', label: 'Years of Experience',    type: 'number', half: true },
  { name: 'hospital',   label: 'Hospital / Clinic Name', type: 'text' },
  { name: 'phone',      label: 'Phone Number',           type: 'tel' },
];

function Field({ field, value, onChange, error }) {
  const base = {
    width: '100%', height: '44px', borderRadius: '12px', padding: '0 14px',
    fontSize: '14px', outline: 'none', transition: 'border-color .2s',
    background: 'var(--frame)', color: 'var(--ink)',
    border: `1px solid ${error ? '#ef4444' : 'var(--line)'}`,
  };

  return (
    <div className={field.half ? '' : 'col-span-2'}>
      <label className="block mb-1.5" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        {field.label}
      </label>
      {field.type === 'select' ? (
        <select value={value || ''} onChange={e => onChange(field.name, e.target.value)} style={{ ...base, height: '44px', appearance: 'none', cursor: 'pointer' }}>
          <option value="">Select…</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={field.type}
          value={value || ''}
          onChange={e => onChange(field.name, e.target.value)}
          style={base}
        />
      )}
      {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [role, setRole]       = useState(null);
  const [form, setForm]       = useState({});
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [dark, setDark]       = useState(false);

  useEffect(() => {
    initAuth();
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.classList.toggle('dark', saved);
    const user = getCurrentUser();
    if (user) router.replace(`/dashboard/${user.role}`);
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(t); router.push('/login'); }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [step]);

  const toggleDark = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const setField = (name, val) => setForm(f => ({ ...f, [name]: val }));

  const validate = () => {
    const e = {};
    if (!form.firstName?.trim()) e.firstName = 'Required';
    if (!form.lastName?.trim())  e.lastName  = 'Required';
    if (!form.email?.includes('@')) e.email  = 'Valid email required';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (role === 'doctor') {
      if (!form.specialty) e.specialty = 'Required';
      if (!form.license?.trim()) e.license = 'Required';
      if (!form.hospital?.trim()) e.hospital = 'Required';
    }
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const user = signup({ ...form, role });
      if (role === 'doctor') createDoctorNotification(user);
      setStep(2);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fields = role === 'patient' ? PATIENT_FIELDS : DOCTOR_FIELDS;

  return (
    <div className="frame" style={{ minHeight: 'calc(100vh - 28px)', overflow: 'hidden', position: 'relative' }}>
      <Particles />

      {/* Ambient glows */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.15),transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.12),transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Top bar */}
      <motion.header initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:.7, ease:[.2,.8,.2,1] }}
        style={{ position:'relative', zIndex:30, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 32px' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#030d18 0%,#060f1e 55%,#0c0520 100%)', border:'1px solid rgba(6,182,212,0.22)', display:'grid', placeItems:'center', overflow:'hidden', boxShadow:'0 0 14px rgba(6,182,212,0.25), 0 2px 8px rgba(0,0,0,0.18)', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M2 12C2 12 6.5 5 12 5C17.5 5 22 12 22 12C22 12 17.5 19 12 19C6.5 19 2 12 2 12Z" stroke="url(#mv-signup-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3.2" stroke="url(#mv-signup-g)" strokeWidth="1.6"/>
              <circle cx="12" cy="12" r="1.3" fill="url(#mv-signup-g)"/>
              <defs><linearGradient id="mv-signup-g" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#9061f9"/></linearGradient></defs>
            </svg>
          </div>
          <div style={{ lineHeight:1 }}>
            <div style={{ fontSize:13, fontWeight:800, letterSpacing:'-0.025em', display:'flex', alignItems:'baseline' }}>
              <span style={{ color:'var(--ink)' }}>Med</span>
              <span style={{ backgroundImage:'linear-gradient(90deg,#06b6d4 0%,#7c3aed 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Vision</span>
              <span style={{ fontSize:8, fontWeight:500, marginLeft:1.5, color:'var(--ink-3)', WebkitTextFillColor:'var(--ink-3)' }}>™</span>
            </div>
            <div style={{ fontSize:7, fontWeight:700, letterSpacing:'0.26em', color:'var(--ink-3)', textTransform:'uppercase', marginTop:2, fontFamily:'JetBrains Mono, monospace' }}>DIAGNOSTIC AI</div>
          </div>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <Link href="/login" style={{ fontSize:13, fontWeight:500, color:'var(--ink-2)', textDecoration:'none' }}>
            Already registered? <span style={{ color:'#06b6d4' }}>Login →</span>
          </Link>
          <button onClick={toggleDark} style={{ width:48, height:26, borderRadius:100, border:'none', cursor:'pointer', background: dark ? '#2a2c33' : '#dfe3eb', position:'relative', transition:'background .4s' }}>
            <motion.span animate={{ left: dark ? 25 : 3 }} transition={{ type:'spring', stiffness:380, damping:24 }}
              style={{ position:'absolute', top:3, width:20, height:20, borderRadius:'50%', display:'grid', placeItems:'center', color:'white', fontSize:10, background: dark ? 'linear-gradient(180deg,#ffd089,#f7a14a)' : 'linear-gradient(180deg,#b8c5e8,#8aa3da)', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}>
              {dark ? '☀' : '◑'}
            </motion.span>
          </button>
        </div>
      </motion.header>

      {/* Step indicator */}
      <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:8, position:'relative', zIndex:10 }}>
        {['Role','Details','Done'].map((label, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', display:'grid', placeItems:'center', fontSize:11, fontWeight:700, background: i <= step ? 'linear-gradient(135deg,#06b6d4,#7c3aed)' : 'var(--line)', color: i <= step ? 'white' : 'var(--ink-3)', transition:'all .4s' }}>{i + 1}</div>
            <span style={{ fontSize:11, fontWeight:500, color: i <= step ? 'var(--ink-2)' : 'var(--ink-3)', letterSpacing:'0.05em' }}>{label}</span>
            {i < 2 && <div style={{ width:24, height:1, background: i < step ? 'linear-gradient(90deg,#06b6d4,#7c3aed)' : 'var(--line)', marginLeft:4 }} />}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px 24px 48px', minHeight:'calc(100vh - 160px)' }}>
        <AnimatePresence mode="wait">

          {/* ── Step 0: Role selection ── */}
          {step === 0 && (
            <motion.div key="role" initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }} transition={{ duration:.6, ease:[.2,.8,.2,1] }} style={{ width:'100%', maxWidth:600 }}>
              <div style={{ textAlign:'center', marginBottom:36 }}>
                <motion.div initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay:.15 }}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:100, fontSize:11, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.18)', color:'#22d3ee', marginBottom:16 }}>
                  <span className="pulse-dot" style={{ width:6, height:6, borderRadius:'50%', background:'#06b6d4' }} /> Create Account
                </motion.div>
                <h1 className="font-serif" style={{ fontSize:'clamp(30px,4vw,50px)', fontWeight:400, lineHeight:1.1, color:'var(--ink)' }}>
                  Choose your <em style={{ fontStyle:'italic', background:'linear-gradient(135deg,#22d3ee,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>role</em>
                </h1>
                <p style={{ marginTop:10, fontSize:14, color:'var(--ink-2)' }}>Select how you'll access the MedVision platform</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
                {ROLES.map((r, i) => (
                  <motion.button key={r.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.25 + i * .1 }}
                    whileHover={{ y:-4, scale:1.02 }} whileTap={{ scale:.98 }}
                    onClick={() => { setRole(r.id); setStep(1); }}
                    className="glass-card"
                    style={{ padding:28, textAlign:'left', cursor:'pointer', border:'none', transition:'box-shadow .3s', position:'relative', overflow:'hidden' }}>
                    <div style={{ width:54, height:54, borderRadius:14, background:r.gradient, display:'flex', alignItems:'center', justifyContent:'center', color:'white', marginBottom:18, boxShadow:`0 8px 20px -6px ${r.glow}` }}>
                      {r.icon}
                    </div>
                    <div style={{ fontSize:18, fontWeight:600, color:'var(--ink)', marginBottom:8 }}>{r.title}</div>
                    <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.55, marginBottom:16 }}>{r.subtitle}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, letterSpacing:'0.06em', color:'#22d3ee' }}>
                      Continue as {r.title}
                      <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 0%,${r.glow},transparent 60%)`, opacity:0, transition:'opacity .3s', borderRadius:'inherit', pointerEvents:'none' }} className="role-glow" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 1: Form ── */}
          {step === 1 && (
            <motion.div key="form" initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }} transition={{ duration:.5, ease:[.2,.8,.2,1] }} style={{ width:'100%', maxWidth:540 }}>
              <button onClick={() => { setStep(0); setErrors({}); }}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--ink-2)', background:'none', border:'none', cursor:'pointer', marginBottom:24, padding:0 }}>
                <svg width="16" height="16" viewBox="0 0 12 12" fill="none"><path d="M10 6H2M6 10l-4-4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back to role selection
              </button>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                <div style={{ width:60, height:60, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', color:'white', margin:'0 auto 14px', background: role === 'patient' ? 'linear-gradient(135deg,#0ea5e9,#06b6d4)' : 'linear-gradient(135deg,#0ea5e9,#7c3aed)', boxShadow:`0 8px 20px -6px ${role==='patient'?'rgba(6,182,212,.4)':'rgba(6,182,212,.4)'}` }}>
                  {ROLES.find(r => r.id === role)?.icon}
                </div>
                <h2 className="font-serif" style={{ fontSize:28, fontWeight:400, color:'var(--ink)' }}>
                  {role === 'patient' ? 'Create Patient Account' : 'Doctor Registration'}
                </h2>
                {role === 'doctor' && (
                  <p style={{ fontSize:13, color:'var(--ink-2)', marginTop:8, lineHeight:1.5 }}>
                    Premium features require Head of Department approval after signup.
                  </p>
                )}
              </div>
              <form onSubmit={handleSubmit} className="glass-card" style={{ padding:28 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {fields.map(f => (
                    <Field key={f.name} field={f} value={form[f.name]} onChange={setField} error={errors[f.name]} />
                  ))}
                </div>
                {errors.submit && (
                  <div style={{ marginTop:14, padding:'10px 14px', borderRadius:10, fontSize:13, color:'#06b6d4', background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)' }}>
                    {errors.submit}
                  </div>
                )}
                <motion.button type="submit" disabled={loading} whileHover={{ y:-2 }} whileTap={{ scale:.98 }}
                  className="btn-signup"
                  style={{ width:'100%', height:52, borderRadius:14, marginTop:20, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:'white', background:'linear-gradient(135deg,#0ea5e9 0%,#06b6d4 50%,#7c3aed 100%)', boxShadow:'0 0 0 1px rgba(255,255,255,0.2) inset, 0 16px 32px -10px rgba(6,182,212,0.5)', opacity: loading ? .7 : 1, position:'relative' }}>
                  <span className="shimmer-track" />
                  <span style={{ position:'relative', zIndex:3 }}>
                    {loading ? 'Creating Account…' : `Create ${role === 'patient' ? 'Patient' : 'Doctor'} Account`}
                  </span>
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Success ── */}
          {step === 2 && (
            <motion.div key="success" initial={{ opacity:0, scale:.88 }} animate={{ opacity:1, scale:1 }} transition={{ duration:.6, ease:[.2,.8,.2,1] }} style={{ textAlign:'center', maxWidth:420 }}>
              <motion.div initial={{ scale:0, rotate:-180 }} animate={{ scale:1, rotate:0 }} transition={{ type:'spring', stiffness:180, damping:18, delay:.1 }}
                style={{ width:90, height:90, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 0 40px -5px rgba(34,197,94,0.55)' }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </motion.div>
              <motion.h2 initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.35 }} className="font-serif" style={{ fontSize:38, fontWeight:400, color:'var(--ink)', marginBottom:12 }}>
                Account Created!
              </motion.h2>
              <motion.p initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.45 }} style={{ fontSize:15, color:'var(--ink-2)', lineHeight:1.6, marginBottom:16 }}>
                {role === 'doctor'
                  ? 'Your doctor account is ready. Sign in to access the platform — premium features unlock after Head of Department approval.'
                  : 'Your patient account is active. Sign in to access your personalized health dashboard.'}
              </motion.p>
              {role === 'doctor' && (
                <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.55 }}
                  style={{ padding:'10px 16px', borderRadius:12, fontSize:13, color:'#f59e0b', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', marginBottom:20 }}>
                  ⚡ Premium features unlock after admin verification
                </motion.div>
              )}
              <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.65 }} style={{ fontSize:13, color:'var(--ink-3)' }}>
                Redirecting to login in {countdown}s…
              </motion.p>
              <motion.div initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ duration:3, ease:'linear' }}
                style={{ height:3, borderRadius:100, marginTop:12, maxWidth:180, marginLeft:'auto', marginRight:'auto', background:'linear-gradient(90deg,#06b6d4,#7c3aed)', transformOrigin:'left' }} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
