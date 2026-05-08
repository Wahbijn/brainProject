'use client';
import Link from 'next/link';
import { motion, useMotionValue, useSpring } from 'framer-motion';

function Magnetic({ children }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18 });
  const sy = useSpring(y, { stiffness: 200, damping: 18 });

  return (
    <motion.span
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.25);
        y.set((e.clientY - r.top - r.height / 2) * 0.3);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className="inline-block"
    >
      {children}
    </motion.span>
  );
}

const Arrow = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Buttons() {
  return (
    <div className="flex items-center gap-[18px] mt-[42px] flex-wrap">
      <Magnetic>
        <Link href="/signup" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="btn-signup relative h-[58px] px-8 rounded-2xl font-semibold text-[14px] tracking-[0.04em] uppercase text-white inline-flex items-center gap-3 cursor-pointer border-0"
            style={{
              background: 'linear-gradient(135deg,#ff7a9c 0%,#ff3d6e 50%,#7a4dff 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.25) inset, 0 18px 40px -12px rgba(255,61,110,0.55), 0 0 70px -10px rgba(122,77,255,0.45)',
            }}
          >
            <span className="shimmer-track" />
            <span className="relative z-[3] inline-flex items-center gap-3 whitespace-nowrap">
              Sign Up
              <span className="w-[26px] h-[26px] rounded-full grid place-items-center bg-white/20 text-white">
                <Arrow />
              </span>
            </span>
          </motion.button>
        </Link>
      </Magnetic>

      <Magnetic>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="btn-login relative h-[58px] px-8 rounded-2xl font-semibold text-[14px] tracking-[0.04em] uppercase inline-flex items-center gap-3 cursor-pointer overflow-hidden"
            style={{
              color: 'var(--ink)',
              background: 'var(--glass)',
              border: '1px solid var(--glass-stroke)',
              backdropFilter: 'blur(16px) saturate(140%)',
            }}
          >
            <span className="relative z-[3] inline-flex items-center gap-3 whitespace-nowrap">
              Login
              <span className="w-[26px] h-[26px] rounded-full grid place-items-center" style={{ background: 'rgba(255,61,110,0.12)', color: '#ff3d6e' }}>
                <Arrow />
              </span>
            </span>
          </motion.button>
        </Link>
      </Magnetic>
    </div>
  );
}
