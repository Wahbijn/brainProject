'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function Nav() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.classList.toggle('dark', saved);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative z-30 flex items-center justify-between px-8 py-5"
    >
      <div className="flex items-center gap-[11px]">
        {/* MedVision icon mark */}
        <div style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
          <motion.div
            animate={{ boxShadow: [
              '0 0 0 0px rgba(6,182,212,0), 0 0 14px rgba(6,182,212,0.35), 0 2px 8px rgba(0,0,0,0.18)',
              '0 0 0 3px rgba(6,182,212,0.10), 0 0 22px rgba(124,58,237,0.40), 0 2px 8px rgba(0,0,0,0.18)',
              '0 0 0 0px rgba(6,182,212,0), 0 0 14px rgba(6,182,212,0.35), 0 2px 8px rgba(0,0,0,0.18)',
            ]}}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '100%', height: '100%', borderRadius: 11,
              background: 'linear-gradient(135deg,#030d18 0%,#060f1e 55%,#0c0520 100%)',
              border: '1px solid rgba(6,182,212,0.22)',
              display: 'grid', placeItems: 'center',
              overflow: 'hidden', position: 'relative',
            }}
          >
            <motion.div
              animate={{ y: [-19, 19] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
              style={{
                position: 'absolute', left: 0, right: 0, height: 1.5,
                background: 'linear-gradient(90deg,transparent,rgba(6,182,212,0.65),rgba(144,97,249,0.45),transparent)',
              }}
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M2 12C2 12 6.5 5 12 5C17.5 5 22 12 22 12C22 12 17.5 19 12 19C6.5 19 2 12 2 12Z"
                stroke="url(#mv-nav-g)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3.2" stroke="url(#mv-nav-g)" strokeWidth="1.6"/>
              <circle cx="12" cy="12" r="1.3" fill="url(#mv-nav-g)"/>
              <defs>
                <linearGradient id="mv-nav-g" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#06b6d4"/>
                  <stop offset="100%" stopColor="#9061f9"/>
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        </div>

        {/* MedVision wordmark */}
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.025em', display: 'flex', alignItems: 'baseline' }}>
            <span style={{ color: 'var(--ink)' }}>Med</span>
            <span style={{
              backgroundImage: 'linear-gradient(90deg,#06b6d4 0%,#7c3aed 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Vision</span>
            <span style={{ fontSize: 9, fontWeight: 500, marginLeft: 1.5, color: 'var(--ink-3)', WebkitTextFillColor: 'var(--ink-3)' }}>™</span>
          </div>
          <div style={{
            fontSize: 7, fontWeight: 700, letterSpacing: '0.26em', color: 'var(--ink-3)',
            textTransform: 'uppercase', marginTop: 2.5, fontFamily: 'JetBrains Mono, monospace',
          }}>DIAGNOSTIC AI</div>
        </div>
      </div>

      <nav
        className="flex items-center p-[5px] rounded-full backdrop-blur-md"
        style={{
          background: 'var(--frame)',
          border: '1px solid var(--line)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        {['Platform', 'Diagnostics', 'Research', 'Clinicians'].map((t) => (
          <a key={t} href="#" className="px-[18px] py-[9px] rounded-full text-[13px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'var(--ink)' }}>
            {t}
          </a>
        ))}
      </nav>

      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="relative w-[54px] h-[28px] rounded-full p-0 cursor-pointer transition-colors duration-500 border-0"
        style={{ background: dark ? '#2a2c33' : '#dfe3eb' }}
      >
        <motion.span
          animate={{ left: dark ? 29 : 3 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          className="absolute top-[3px] w-[22px] h-[22px] rounded-full grid place-items-center text-white"
          style={{
            background: dark ? 'linear-gradient(180deg,#ffd089,#f7a14a)' : 'linear-gradient(180deg,#b8c5e8,#8aa3da)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          {dark ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </g>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
            </svg>
          )}
        </motion.span>
      </button>
    </motion.header>
  );
}
