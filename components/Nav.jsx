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
      <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em]" style={{ color: 'var(--ink)' }}>
        <div
          className="w-[34px] h-[34px] rounded-[9px] relative overflow-hidden grid place-items-center text-white font-serif italic text-[18px]"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #ffb8c4, #ff5a7d 60%, #7a4dff)',
            boxShadow: '0 4px 12px -4px rgba(255,90,125,0.5)',
          }}
        >
          N
          <span className="absolute inset-0 rounded-[inherit]" style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.4),transparent 50%)' }} />
        </div>
        <span>NEURAL <span className="font-normal tracking-[0.18em] ml-1" style={{ color: 'var(--ink-3)' }}>/ AI BRAIN</span></span>
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
