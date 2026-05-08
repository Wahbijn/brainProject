'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Nav from './Nav';
import Brain from './Brain';
import Particles from './Particles';
import Buttons from './Buttons';

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <Nav />
      <main className="relative grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 px-6 lg:px-12 pt-8 pb-12 min-h-[calc(100vh-108px)]">
        <Particles />

        <section className="relative z-20 flex flex-col justify-center pt-8">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-serif font-normal text-[clamp(46px,5.8vw,84px)] leading-[1.02] tracking-[-0.018em] text-balance"
            style={{ color: 'var(--ink)' }}
          >
            Smarter Medical{' '}
            <em className="not-italic font-normal bg-gradient-to-r from-[var(--neon-1,#ff6a8d)] to-[#7a4dff] bg-clip-text text-transparent italic">
              AI&nbsp;Brain,
            </em>
            <br />
            Brighter Human Life.
            <span className="inline-block font-sans text-[0.32em] align-super ml-1.5 font-light" style={{ color: 'var(--ink-2)' }}>®</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Buttons />
          </motion.div>
        </section>

        {mounted && (
          <div className="lg:absolute lg:top-0 lg:right-0 lg:bottom-0 lg:w-[62%] z-10 pointer-events-none grid place-items-center min-h-[480px]">
            <Brain />
          </div>
        )}
      </main>
    </>
  );
}
