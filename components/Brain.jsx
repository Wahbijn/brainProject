'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const NS = 'http://www.w3.org/2000/svg';

function buildSulci(parent, side) {
  const sign = side === 'L' ? -1 : 1;
  const cx = 400 + sign * 130;
  const deep = [
    [-90, 60, 280, 0.95], [-70, 95, 250, 0.85], [-50, 120, 230, 0.85],
    [-30, 150, 210, 0.80], [-10, 175, 200, 0.78], [10, 175, 210, 0.78],
    [30, 150, 220, 0.80], [50, 120, 240, 0.85], [70, 95, 260, 0.85], [90, 60, 290, 0.92],
  ];
  deep.forEach((s, i) => {
    const startX = cx - sign * s[1];
    const startY = 230 + Math.abs(s[0]) * 0.3;
    let d = `M ${startX} ${startY}`;
    let x = startX, y = startY;
    const segs = 8;
    for (let k = 0; k < segs; k++) {
      const t = k / segs;
      const ang = (s[0] * Math.PI / 180) + Math.sin(t * Math.PI * 2) * 0.15;
      x += Math.cos(ang) * (s[2] / segs) * sign * 0.2 + Math.sin(t * 3 + i) * 4;
      y += (s[2] / segs) * 0.85;
      d += ` Q ${x + sign * 6} ${y - 4}, ${x} ${y}`;
    }
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'url(#sulcusGrad)');
    p.setAttribute('stroke-width', 4 + Math.random() * 1.5);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-opacity', s[3]);
    p.setAttribute('filter', 'url(#softBlur)');
    parent.appendChild(p);
  });
  for (let i = 0; i < 26; i++) {
    const angle = (Math.random() * 0.9 + 0.1) * Math.PI;
    const r = 60 + Math.random() * 150;
    const sx = cx + Math.cos(angle) * r * sign * 0.6 + (Math.random() - 0.5) * 30;
    const sy = 280 + Math.sin(angle) * r * 0.85 + (Math.random() - 0.5) * 30;
    const len = 30 + Math.random() * 50;
    const dirX = (Math.random() - 0.5);
    let d = `M ${sx} ${sy}`;
    let x = sx, y = sy;
    for (let k = 0; k < 4; k++) {
      x += dirX * len / 4 + (Math.random() - 0.5) * 8;
      y += len / 4 + (Math.random() - 0.5) * 4;
      d += ` Q ${x + 3} ${y - 2}, ${x} ${y}`;
    }
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', '#7a1822');
    p.setAttribute('stroke-width', (0.8 + Math.random() * 0.8).toFixed(2));
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-opacity', 0.45 + Math.random() * 0.25);
    parent.appendChild(p);
  }
}

function veinPath(x, y, angle, length, depth, color, group, opts = {}) {
  if (depth <= 0 || length < 6) return;
  const segs = 5 + Math.floor(Math.random() * 3);
  const points = [{ x, y }];
  let cx = x, cy = y, ca = angle;
  for (let i = 0; i < segs; i++) {
    const segLen = length / segs;
    ca += (Math.random() - 0.5) * 0.7;
    cx += Math.cos(ca) * segLen;
    cy += Math.sin(ca) * segLen;
    points.push({ x: cx, y: cy });
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i];
    const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y}, ${mx} ${my}`;
  }
  d += ` T ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', opts.width || 1.4);
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-opacity', opts.opacity || 0.85);
  path.setAttribute('class', 'vein');
  path.style.animationDelay = (Math.random() * 3) + 's';
  group.appendChild(path);

  if (opts.corp !== false && Math.random() > 0.4 && depth >= 2) {
    const corp = document.createElementNS(NS, 'circle');
    corp.setAttribute('r', 1.6 + Math.random() * 1.2);
    corp.setAttribute('fill', color);
    corp.setAttribute('class', 'corp');
    corp.style.animationDelay = (Math.random() * 2.6) + 's';
    const motion = document.createElementNS(NS, 'animateMotion');
    motion.setAttribute('dur', (1.8 + Math.random() * 1.6) + 's');
    motion.setAttribute('repeatCount', 'indefinite');
    motion.setAttribute('path', d);
    motion.setAttribute('rotate', 'auto');
    corp.appendChild(motion);
    group.appendChild(corp);
  }

  const lastP = points[points.length - 1];
  const branchCount = Math.random() > 0.35 ? 2 : 1;
  for (let b = 0; b < branchCount; b++) {
    const newAngle = angle + (Math.random() - 0.5) * 1.5;
    const newLen = length * (0.55 + Math.random() * 0.25);
    veinPath(lastP.x, lastP.y, newAngle, newLen, depth - 1, color, group, { ...opts, width: (opts.width || 1.4) * 0.7 });
  }
}

export default function Brain() {
  const sulciL = useRef(null);
  const sulciR = useRef(null);
  const front = useRef(null);
  const mid = useRef(null);
  const back = useRef(null);
  const surfaceN = useRef(null);
  const flashes = useRef(null);

  useEffect(() => {
    if (!sulciL.current) return;
    sulciL.current.innerHTML = ''; sulciR.current.innerHTML = '';
    front.current.innerHTML = ''; mid.current.innerHTML = ''; back.current.innerHTML = '';
    surfaceN.current.innerHTML = '';

    buildSulci(sulciL.current, 'L');
    buildSulci(sulciR.current, 'R');

    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 180;
      const x = 400 + Math.cos(angle) * r * 0.95;
      const y = 410 + Math.sin(angle) * r * 0.85;
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      dot.setAttribute('r', 1.1 + Math.random() * 1.4);
      dot.setAttribute('fill', Math.random() > 0.5 ? '#ffe5d8' : '#ffaab2');
      dot.setAttribute('opacity', 0.7);
      const an = document.createElementNS(NS, 'animate');
      an.setAttribute('attributeName', 'opacity');
      an.setAttribute('values', '0.2;1;0.2');
      an.setAttribute('dur', (1.5 + Math.random() * 2) + 's');
      an.setAttribute('repeatCount', 'indefinite');
      an.setAttribute('begin', (Math.random() * 3) + 's');
      dot.appendChild(an);
      surfaceN.current.appendChild(dot);
    }

    const seeds = [
      { x: 400, y: 230, a: -Math.PI / 2, len: 140, c: 'red' }, { x: 380, y: 230, a: -1.9, len: 120, c: 'blue' },
      { x: 420, y: 228, a: -1.2, len: 130, c: 'red' }, { x: 355, y: 240, a: -2.2, len: 110, c: 'blue' },
      { x: 445, y: 240, a: -0.95, len: 120, c: 'red' }, { x: 215, y: 300, a: Math.PI, len: 140, c: 'red' },
      { x: 200, y: 340, a: Math.PI + 0.2, len: 130, c: 'blue' }, { x: 155, y: 380, a: Math.PI - 0.1, len: 120, c: 'red' },
      { x: 140, y: 420, a: Math.PI + 0.3, len: 140, c: 'blue' }, { x: 585, y: 300, a: 0, len: 140, c: 'blue' },
      { x: 600, y: 340, a: 0.2, len: 130, c: 'red' }, { x: 645, y: 380, a: 0.05, len: 120, c: 'blue' },
      { x: 660, y: 420, a: -0.2, len: 140, c: 'red' }, { x: 200, y: 530, a: Math.PI + 0.6, len: 140, c: 'red' },
      { x: 240, y: 580, a: Math.PI + 0.9, len: 130, c: 'blue' }, { x: 600, y: 530, a: -0.6, len: 140, c: 'blue' },
      { x: 560, y: 580, a: -0.9, len: 130, c: 'red' }, { x: 400, y: 725, a: Math.PI / 2, len: 90, c: 'red' },
    ];
    const col = (c, l) => l === 'back'
      ? (c === 'red' ? '#a82c3a' : '#3a72c4')
      : l === 'mid' ? (c === 'red' ? '#c93d4a' : '#4a90e2') : (c === 'red' ? '#e64a55' : '#5fa8ff');
    seeds.forEach(s => {
      veinPath(s.x, s.y, s.a + (Math.random() - 0.5) * 0.3, s.len * 1.4, 4, col(s.c, 'back'), back.current, { width: 0.7, opacity: 0.6, corp: false });
      veinPath(s.x, s.y, s.a + (Math.random() - 0.5) * 0.2, s.len * 1.15, 4, col(s.c, 'mid'), mid.current, { width: 1.0, opacity: 0.75 });
      veinPath(s.x, s.y, s.a, s.len, 4, col(s.c, 'front'), front.current, { width: 1.5, opacity: 0.92 });
    });

    const id = setInterval(() => {
      if (!flashes.current) return;
      const angle = Math.random() * Math.PI * 2;
      const r = 220 + Math.random() * 50;
      const x = 400 + Math.cos(angle) * r;
      const y = 410 + Math.sin(angle) * r * 0.9;
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y);
      c.setAttribute('r', '2'); c.setAttribute('fill', '#fff');
      c.setAttribute('filter', 'url(#softBlur)');
      c.style.opacity = '0';
      flashes.current.appendChild(c);
      c.animate(
        [{ opacity: 0, r: 0 }, { opacity: 1, r: 3 }, { opacity: 0, r: 8 }],
        { duration: 800 + Math.random() * 600, easing: 'ease-out' }
      ).onfinish = () => c.remove();
    }, 380);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="relative"
      style={{ width: 'min(760px, 98%)', aspectRatio: '1 / 1' }}
      animate={{ y: [0, -14, 0], rotate: [-2.5, 2.5, -2.5] }}
      transition={{ duration: 18, ease: 'easeInOut', repeat: Infinity }}
    >
      <div className="brain-glow" />
      <svg viewBox="0 0 800 800" className="w-full h-full overflow-visible" xmlns={NS}>
        <defs>
          <radialGradient id="brainShade" cx="36%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#ffe2dc" />
            <stop offset="22%" stopColor="#ffb3ab" />
            <stop offset="48%" stopColor="#ff8a82" />
            <stop offset="72%" stopColor="#e85f64" />
            <stop offset="100%" stopColor="#8a1f2a" />
          </radialGradient>
          <radialGradient id="brainHi" cx="32%" cy="22%" r="32%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sulcusGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a1822" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3a0a12" stopOpacity="0.75" />
          </linearGradient>
          <radialGradient id="coreGlow" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="#ff5a5a" stopOpacity="0" />
            <stop offset="60%" stopColor="#c93d4a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#5a1018" stopOpacity="0.6" />
          </radialGradient>
          <filter id="softBlur"><feGaussianBlur stdDeviation="0.6" /></filter>
          <filter id="bigBlur"><feGaussianBlur stdDeviation="6" /></filter>
          <clipPath id="brainClip">
            <path d="M395 215 C 320 210, 250 235, 213 290 C 178 285, 142 312, 138 358 C 108 380, 98 425, 128 462 C 113 502, 145 542, 195 547 C 195 583, 234 608, 285 602 C 295 627, 340 638, 380 617 C 395 627, 405 627, 405 617 L 405 215 Z M405 215 C 480 210, 550 235, 587 290 C 622 285, 658 312, 662 358 C 692 380, 702 425, 672 462 C 687 502, 655 542, 605 547 C 605 583, 566 608, 515 602 C 505 627, 460 638, 420 617 C 405 627, 395 627, 395 617 L 395 215 Z" />
          </clipPath>
        </defs>

        <g ref={back} opacity="0.55" />
        <g ref={mid} opacity="0.78" />

        <ellipse cx="400" cy="660" rx="245" ry="22" fill="#000" opacity="0.22" filter="url(#bigBlur)" />

        <g>
          <path d="M395 215 C 320 210, 250 235, 213 290 C 178 285, 142 312, 138 358 C 108 380, 98 425, 128 462 C 113 502, 145 542, 195 547 C 195 583, 234 608, 285 602 C 295 627, 340 638, 380 617 C 395 627, 405 627, 405 617 L 405 215 Z" fill="url(#brainShade)" />
          <path d="M405 215 C 480 210, 550 235, 587 290 C 622 285, 658 312, 662 358 C 692 380, 702 425, 672 462 C 687 502, 655 542, 605 547 C 605 583, 566 608, 515 602 C 505 627, 460 638, 420 617 C 405 627, 395 627, 395 617 L 405 215 Z" fill="url(#brainShade)" />
        </g>

        <g>
          <path d="M335 600 C 330 645, 360 672, 400 672 C 440 672, 470 645, 465 600 Z" fill="url(#brainShade)" />
          <g stroke="#8a1f2a" strokeWidth="1.1" fill="none" opacity="0.65" strokeLinecap="round">
            <path d="M345 615 Q 358 638, 358 668" />
            <path d="M362 610 Q 374 638, 374 670" />
            <path d="M380 608 Q 388 638, 388 672" />
            <path d="M412 608 Q 412 638, 412 672" />
            <path d="M428 610 Q 426 638, 426 670" />
            <path d="M446 614 Q 442 638, 442 668" />
          </g>
        </g>
        <path d="M380 660 C 380 695, 390 715, 400 725 C 410 715, 420 695, 420 660 Z" fill="#a8323d" />

        <g clipPath="url(#brainClip)">
          <g ref={sulciL} className="gyri-shimmer" />
          <g ref={sulciR} className="gyri-shimmer" />
          <path d="M400 215 Q 397 320, 400 420 Q 403 520, 400 605" stroke="#3a0a12" strokeWidth="3.5" fill="none" opacity="0.7" />
          <path d="M400 220 Q 398 320, 400 420 Q 402 520, 400 600" stroke="#1a0408" strokeWidth="1.5" fill="none" opacity="0.85" />
          <ellipse cx="345" cy="265" rx="80" ry="38" fill="url(#brainHi)" opacity="0.7" />
          <ellipse cx="400" cy="430" rx="220" ry="200" fill="url(#coreGlow)" opacity="0.6" />
          <g ref={surfaceN} />
        </g>

        <g ref={front} opacity="0.92" />
        <g ref={flashes} />
      </svg>
    </motion.div>
  );
}
