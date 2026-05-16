'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, initAuth, getCurrentUser } from '@/lib/auth';
import Particles from '@/components/Particles';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [dark, setDark]     = useState(false);

  useEffect(() => {
    initAuth();
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.classList.toggle('dark', saved);
    const user = getCurrentUser();
    if (user) router.replace(`/dashboard/${user.role}`);
  }, []);

  const toggleDark = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const user = login(form.email, form.password);
      window.location.href = `/dashboard/${user.role}`;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const inputStyle = (hasErr) => ({
    width: '100%', height: 44, borderRadius: 12, padding: '0 14px',
    fontSize: 14, outline: 'none', background: 'var(--frame)', color: 'var(--ink)',
    border: `1px solid ${hasErr ? '#ff3d6e' : 'var(--line)'}`, transition: 'border-color .2s',
  });

  return (
    <div className="frame" style={{ minHeight: 'calc(100vh - 28px)', overflow: 'hidden', position: 'relative' }}>
      <Particles />

      {/* Ambient glows */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'20%', right:'12%', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,rgba(122,77,255,0.14),transparent 70%)', filter:'blur(60px)' }} />
        <div style={{ position:'absolute', bottom:'15%', left:'10%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,61,110,0.12),transparent 70%)', filter:'blur(60px)' }} />
      </div>

      {/* Top bar */}
      <motion.header initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:.7, ease:[.2,.8,.2,1] }}
        style={{ position:'relative', zIndex:30, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 32px' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#030d18 0%,#060f1e 55%,#0c0520 100%)', border:'1px solid rgba(6,182,212,0.22)', display:'grid', placeItems:'center', overflow:'hidden', boxShadow:'0 0 14px rgba(6,182,212,0.25), 0 2px 8px rgba(0,0,0,0.18)', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M2 12C2 12 6.5 5 12 5C17.5 5 22 12 22 12C22 12 17.5 19 12 19C6.5 19 2 12 2 12Z" stroke="url(#mv-login-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3.2" stroke="url(#mv-login-g)" strokeWidth="1.6"/>
              <circle cx="12" cy="12" r="1.3" fill="url(#mv-login-g)"/>
              <defs><linearGradient id="mv-login-g" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#9061f9"/></linearGradient></defs>
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
          <Link href="/signup" style={{ fontSize:13, fontWeight:500, color:'var(--ink-2)', textDecoration:'none' }}>
            New here? <span style={{ color:'#ff3d6e' }}>Create account →</span>
          </Link>
          <button onClick={toggleDark} style={{ width:48, height:26, borderRadius:100, border:'none', cursor:'pointer', background: dark ? '#2a2c33' : '#dfe3eb', position:'relative', transition:'background .4s' }}>
            <motion.span animate={{ left: dark ? 25 : 3 }} transition={{ type:'spring', stiffness:380, damping:24 }}
              style={{ position:'absolute', top:3, width:20, height:20, borderRadius:'50%', display:'grid', placeItems:'center', color:'white', fontSize:10, background: dark ? 'linear-gradient(180deg,#ffd089,#f7a14a)' : 'linear-gradient(180deg,#b8c5e8,#8aa3da)', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}>
              {dark ? '☀' : '◑'}
            </motion.span>
          </button>
        </div>
      </motion.header>

      {/* Login card */}
      <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 24px 60px', minHeight:'calc(100vh - 120px)' }}>
        <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:.7, ease:[.2,.8,.2,1] }} style={{ width:'100%', maxWidth:420 }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:200, damping:18, delay:.15 }}
              style={{ width:64, height:64, borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', background:'linear-gradient(135deg,#030d18 0%,#060f1e 55%,#0c0520 100%)', border:'1px solid rgba(6,182,212,0.25)', boxShadow:'0 0 0 3px rgba(6,182,212,0.10), 0 0 28px rgba(6,182,212,0.30), 0 10px 28px -8px rgba(124,58,237,0.5)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M2 12C2 12 6.5 5 12 5C17.5 5 22 12 22 12C22 12 17.5 19 12 19C6.5 19 2 12 2 12Z" stroke="url(#mv-badge-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3.2" stroke="url(#mv-badge-g)" strokeWidth="1.6"/>
                <circle cx="12" cy="12" r="1.3" fill="url(#mv-badge-g)"/>
                <defs><linearGradient id="mv-badge-g" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#9061f9"/></linearGradient></defs>
              </svg>
            </motion.div>
            <h1 className="font-serif" style={{ fontSize:36, fontWeight:400, color:'var(--ink)', marginBottom:6 }}>Welcome Back</h1>
            <p style={{ fontSize:14, color:'var(--ink-2)' }}>Sign in to your MedVision account</p>
          </div>

          {/* Form */}
          <div className="glass-card" style={{ padding:28 }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:18 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:6 }}>Email Address</label>
                <input type="email" placeholder="your@email.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle(!!error)} />
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:6 }}>Password</label>
                <div style={{ position:'relative' }}>
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ ...inputStyle(!!error), paddingRight:44 }} />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--ink-3)', padding:2, display:'flex' }}>
                    {showPass
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                  style={{ padding:'9px 14px', borderRadius:10, fontSize:13, color:'#ff3d6e', background:'rgba(255,61,110,0.08)', border:'1px solid rgba(255,61,110,0.2)', marginBottom:14 }}>
                  {error}
                </motion.div>
              )}

              <motion.button type="submit" disabled={loading} whileHover={{ y:-2 }} whileTap={{ scale:.98 }}
                className="btn-signup"
                style={{ width:'100%', height:52, borderRadius:14, marginTop:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:'white', background:'linear-gradient(135deg,#ff7a9c 0%,#ff3d6e 50%,#7a4dff 100%)', boxShadow:'0 0 0 1px rgba(255,255,255,0.2) inset, 0 16px 32px -10px rgba(255,61,110,0.5)', opacity: loading ? .7 : 1, position:'relative' }}>
                <span className="shimmer-track" />
                <span style={{ position:'relative', zIndex:3 }}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </span>
              </motion.button>
            </form>
          </div>

          {/* Demo credentials */}
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.5 }}
            style={{ marginTop:20, padding:16, borderRadius:16, background:'rgba(122,77,255,0.07)', border:'1px solid rgba(122,77,255,0.15)' }}>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'#7a4dff', marginBottom:10 }}>Demo Credentials</p>
            <div style={{ display:'flex', flexDirection:'column', gap:7, fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>
              {[
                { label: 'Head of Dept', email: 'admin@neural.ai',          pass: 'Admin@2024'  },
                { label: 'Doctor',       email: 'sarah.chen@neural.ai',     pass: 'Doctor@123' },
                { label: 'Patient',      email: 'alex.morgan@email.com',    pass: 'Patient@123'},
              ].map(c => (
                <div key={c.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'var(--line)', color:'var(--ink-3)', fontFamily:'Inter,sans-serif', fontWeight:500 }}>{c.label}</span>
                  <span style={{ color:'var(--ink-2)' }}>{c.email}</span>
                  <span style={{ color:'var(--ink-3)' }}>/ {c.pass}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
