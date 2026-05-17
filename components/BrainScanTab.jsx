'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrainRegionAnalysis from '@/components/BrainRegionAnalysis';

// ── Tumor palette ──────────────────────────────────────────────────
const TC = {
  glioma:     { label:'Glioma',          color:'#E24B4A', glow:'rgba(226,75,74,0.15)'  },
  meningioma: { label:'Meningioma',      color:'#EF9F27', glow:'rgba(239,159,39,0.15)' },
  notumor:    { label:'No Tumor',        color:'#1D9E75', glow:'rgba(29,158,117,0.15)' },
  pituitary:  { label:'Pituitary Tumor', color:'#378ADD', glow:'rgba(55,138,221,0.15)' },
};

// ── Stroke palette ─────────────────────────────────────────────────
const SC = {
  stroke: { label:'Stroke Detected', color:'#7C3AED', glow:'rgba(124,58,237,0.15)' },
  normal: { label:'No Stroke Signs', color:'#06B6D4', glow:'rgba(6,182,212,0.15)'  },
};

// ── Confidence ring ────────────────────────────────────────────────
function ConfRing({ value, color, size = 124 }) {
  const r    = size * 0.403;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)', display:'block' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <motion.circle
          cx={cx} cy={cx} r={r} fill="none" stroke={color}
          strokeWidth="8" strokeLinecap="round"
          initial={{ strokeDasharray:`0 ${circ}` }}
          animate={{ strokeDasharray:`${(value / 100) * circ} ${circ}` }}
          transition={{ duration:1.3, ease:'easeOut', delay:0.2 }}
        />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
        <motion.span
          initial={{ opacity:0, scale:0.6 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:0.45, type:'spring', stiffness:260 }}
          style={{ fontSize: size > 100 ? 24 : 18, fontWeight:900, color, lineHeight:1 }}
        >
          {value}%
        </motion.span>
        <span style={{ fontSize:9, color:'var(--ink-3)', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>
          confidence
        </span>
      </div>
    </div>
  );
}

// ── Probability bar ────────────────────────────────────────────────
function ProbBar({ label, value, color, active }) {
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11.5, fontWeight: active ? 700 : 500, color: active ? color : 'var(--ink-2)' }}>{label}</span>
        <span style={{ fontSize:11.5, fontWeight:700, color: active ? color : 'var(--ink-3)' }}>{value}%</span>
      </div>
      <div style={{ height:5, background:'var(--line)', borderRadius:3, overflow:'hidden' }}>
        <motion.div
          initial={{ width:0 }} animate={{ width:`${value}%` }}
          transition={{ duration:0.9, ease:'easeOut', delay:0.1 }}
          style={{
            height:'100%', borderRadius:3,
            background: active ? `linear-gradient(90deg,${color}88,${color})` : 'var(--line)',
            opacity: active ? 1 : 0.35,
          }}
        />
      </div>
    </div>
  );
}

// ── Image viewer — Original · Tumor AI · Stroke CAM (no separate Mask tab) ──
function ImgViewer({ original, tumorOverlay, tumorMask, strokeOverlay, tumorColor, strokeColor }) {
  // The tumor overlay already shows the mask region as a colored highlight.
  // When "Tumor AI" is active we also composite the binary mask as a thin outline.
  const ALL_TABS = [
    { id:'original', label:'Original',    src:original,      badge:null,               color:null        },
    { id:'tumor',    label:'Tumor AI',    src:tumorOverlay,  badge:'Tumor region',     color:tumorColor  },
    { id:'stroke',   label:'Stroke CAM',  src:strokeOverlay, badge:'Grad-CAM heatmap', color:strokeColor },
  ].filter(t => t.src);

  const [tab, setTab] = useState(ALL_TABS[1]?.id ?? 'original');
  const current = ALL_TABS.find(t => t.id === tab) ?? ALL_TABS[0];

  // tumorMask base64 is shown as a subtle canvas overlay when on the Tumor AI tab
  const showMaskOverlay = tab === 'tumor' && tumorMask;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{
        position:'relative', borderRadius:16, overflow:'hidden',
        border:'1px solid var(--line)', background:'#000', aspectRatio:'1/1',
      }}>
        <AnimatePresence mode="wait">
          <motion.img key={tab}
            src={`data:image/png;base64,${current?.src}`} alt={tab}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.22 }}
            style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}
          />
        </AnimatePresence>

        {/* Mask outline overlay on Tumor AI tab */}
        {showMaskOverlay && (
          <motion.img
            key="mask-overlay"
            src={`data:image/png;base64,${tumorMask}`}
            alt="mask"
            initial={{ opacity:0 }} animate={{ opacity:0.28 }} exit={{ opacity:0 }}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain', mixBlendMode:'screen', pointerEvents:'none' }}
          />
        )}

        {/* Label badge */}
        <div style={{
          position:'absolute', top:8, left:8,
          background:'rgba(0,0,0,0.68)', backdropFilter:'blur(8px)',
          borderRadius:7, padding:'3px 9px',
          fontSize:9, fontWeight:700, color:'#fff', letterSpacing:'0.09em', textTransform:'uppercase',
        }}>
          {current?.label}
        </div>

        {/* Color legend for tumor region */}
        {current?.badge && current?.color && tab !== 'stroke' && (
          <div style={{
            position:'absolute', bottom:8, right:8,
            background:'rgba(0,0,0,0.68)', backdropFilter:'blur(8px)',
            borderRadius:7, padding:'3px 9px', fontSize:9, fontWeight:600, color:'#fff',
            display:'flex', alignItems:'center', gap:5,
          }}>
            <div style={{ width:7, height:7, borderRadius:2, background:current.color }} />
            {current.badge}
          </div>
        )}

        {/* Grad-CAM legend on stroke tab */}
        {tab === 'stroke' && (
          <div style={{
            position:'absolute', bottom:8, left:8,
            background:'rgba(0,0,0,0.78)', backdropFilter:'blur(8px)',
            borderRadius:8, padding:'6px 10px', fontSize:9, color:'#fff',
          }}>
            <div style={{ opacity:0.65, marginBottom:4, fontWeight:700, letterSpacing:'0.05em' }}>GRAD-CAM INTENSITY</div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:8, opacity:0.7 }}>Low</span>
              <div style={{ width:72, height:5, borderRadius:2, background:'linear-gradient(90deg,#000004,#51127c,#b73779,#f98e09,#fcffa4)' }} />
              <span style={{ fontSize:8, opacity:0.7 }}>High</span>
            </div>
          </div>
        )}
      </div>

      {/* Tab buttons */}
      <div style={{ display:'flex', gap:5 }}>
        {ALL_TABS.map(t => {
          const isActive    = tab === t.id;
          const isStroke    = t.id === 'stroke';
          const accentColor = isStroke ? (strokeColor || '#7C3AED') : null;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'7px 0', borderRadius:9, cursor:'pointer',
              border:`1px solid ${isActive ? (accentColor || 'var(--ink)') : 'var(--line)'}`,
              background: isActive ? (accentColor ? `${accentColor}20` : 'var(--ink)') : 'transparent',
              color: isActive ? (accentColor || 'var(--frame)') : 'var(--ink-3)',
              fontSize:11, fontWeight:700, transition:'all 0.18s',
            }}>{t.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────
function DropZone({ onFile }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);
  const onDrop = useCallback(e => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => ref.current?.click()}
      style={{
        cursor:'pointer', width:'100%', maxWidth:480, margin:'0 auto',
        padding:'52px 36px', borderRadius:26, textAlign:'center',
        border:`2px dashed ${drag ? '#06b6d4' : 'var(--line)'}`,
        background: drag ? 'rgba(6,182,212,0.04)' : 'var(--frame)',
        boxShadow: drag ? '0 0 0 5px rgba(6,182,212,0.08)' : 'none',
        transition:'all 0.22s',
        display:'flex', flexDirection:'column', alignItems:'center', gap:16,
      }}
    >
      <div style={{ position:'relative', width:80, height:80 }}>
        {[0, 1].map(i => (
          <motion.div key={i}
            animate={{ scale:[1, 1.45, 1], opacity:[0.4, 0, 0.4] }}
            transition={{ repeat:Infinity, duration:2.8, delay:i * 1.1 }}
            style={{ position:'absolute', inset:-(i + 1) * 14, borderRadius:'50%', border:'1px solid rgba(6,182,212,0.20)' }}
          />
        ))}
        <motion.div animate={{ rotate: drag ? 15 : 0 }} transition={{ type:'spring', stiffness:200 }}
          style={{
            width:80, height:80, borderRadius:22,
            background:'linear-gradient(135deg,rgba(6,182,212,0.10),rgba(124,58,237,0.10))',
            border:'1px solid rgba(6,182,212,0.20)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <path d="M9 3C6.24 3 4 5.24 4 8C4 9.68 4.83 11.17 6.1 12C4.83 12.83 4 14.32 4 16C4 18.76 6.24 21 9 21H15C17.76 21 20 18.76 20 16C20 14.32 19.17 12.83 17.9 12C19.17 11.17 20 9.68 20 8C20 5.24 17.76 3 15 3H9Z" stroke="#06b6d4" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M9 9.5C9 9.5 10.2 10.5 12 10.5C13.8 10.5 15 9.5 15 9.5" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M9 14C9 14 10.2 15 12 15C13.8 15 15 14 15 14" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="12" y1="5.5" x2="12" y2="18.5" stroke="#06b6d4" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </motion.div>
      </div>

      <div>
        <p style={{ fontSize:16, fontWeight:800, color:'var(--ink)', marginBottom:5 }}>
          {drag ? 'Release to upload' : 'Drop your brain MRI here'}
        </p>
        <p style={{ fontSize:12, color:'var(--ink-3)' }}>Detects tumor type + stroke signs · JPG, PNG</p>
      </div>

      <div style={{
        padding:'9px 26px', borderRadius:11,
        background:'linear-gradient(135deg,#06b6d4,#7c3aed)',
        color:'#fff', fontSize:12, fontWeight:700, pointerEvents:'none',
      }}>
        Choose MRI File
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display:'none' }}
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

// ── Scanning animation ─────────────────────────────────────────────
function Scanning({ url }) {
  const steps = [
    { label:'Preprocessing', color:'#0ea5e9' },
    { label:'Tumor Class.',  color:'#E24B4A' },
    { label:'Segmentation',  color:'#7c3aed' },
    { label:'Stroke Class.', color:'#7C3AED' },
    { label:'Grad-CAM',      color:'#f98e09' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24, padding:'8px 0' }}>
      <div style={{
        position:'relative', width:300, height:300, borderRadius:18,
        overflow:'hidden', border:'1px solid var(--line)',
      }}>
        <img src={url} alt="scan" style={{ width:'100%', height:'100%', objectFit:'contain', background:'#000', filter:'brightness(0.5)' }} />
        {/* Grid overlay */}
        <div style={{
          position:'absolute', inset:0, opacity:0.09,
          backgroundImage:'linear-gradient(rgba(6,182,212,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.7) 1px,transparent 1px)',
          backgroundSize:'28px 28px',
        }} />
        {/* Sweep line */}
        <motion.div
          animate={{ top:['0%', '100%'] }}
          transition={{ repeat:Infinity, duration:1.7, ease:'linear' }}
          style={{
            position:'absolute', left:0, right:0, height:2,
            background:'linear-gradient(90deg,transparent,#06b6d4 35%,#7c3aed 65%,transparent)',
            boxShadow:'0 0 20px rgba(124,58,237,0.8)',
          }}
        />
        {/* Pulse rings */}
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            animate={{ scale:[0.6, 2.2], opacity:[0.8, 0] }}
            transition={{ repeat:Infinity, duration:2.2, delay:i * 0.7 }}
            style={{
              position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
              width:38, height:38, borderRadius:'50%',
              border:`1.5px solid rgba(${i < 2 ? '255,61,110' : '124,58,237'},${0.7 - i * 0.18})`,
            }}
          />
        ))}
        {/* Corner brackets */}
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            position:'absolute', width:18, height:18,
            borderColor:'#7C3AED', borderStyle:'solid', borderWidth:0,
            ...(i === 0 ? { top:7, left:7, borderTopWidth:2, borderLeftWidth:2 }
              : i === 1 ? { top:7, right:7, borderTopWidth:2, borderRightWidth:2 }
              : i === 2 ? { bottom:7, left:7, borderBottomWidth:2, borderLeftWidth:2 }
              : { bottom:7, right:7, borderBottomWidth:2, borderRightWidth:2 }),
          }} />
        ))}
      </div>

      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:18, fontWeight:800, color:'var(--ink)', marginBottom:5 }}>
          Dual-Model Analysis
          {[0, 1, 2].map(i => (
            <motion.span key={i} animate={{ opacity:[0, 1, 0] }} transition={{ repeat:Infinity, duration:1.5, delay:i * 0.3 }}>.</motion.span>
          ))}
        </p>
        <p style={{ fontSize:12, color:'var(--ink-2)' }}>Tumor detection + Stroke screening simultaneously</p>
      </div>

      <div style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center' }}>
        {steps.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i * 0.25 }}
            style={{ textAlign:'center', fontSize:10, color:'var(--ink-3)', maxWidth:68 }}
          >
            <motion.div
              animate={{ background:[`${s.color}25`, `${s.color}80`, `${s.color}25`] }}
              transition={{ repeat:Infinity, duration:2, delay:i * 0.28 }}
              style={{ width:7, height:7, borderRadius:'50%', margin:'0 auto 4px', background:`${s.color}25` }}
            />
            {s.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Stroke model error card ────────────────────────────────────────
function StrokeModelError({ loadError }) {
  const [retrying, setRetrying] = useState(false);
  const [retryMsg,  setRetryMsg]  = useState(null);

  const retry = async () => {
    setRetrying(true); setRetryMsg(null);
    try {
      const r = await fetch('/api/brain-scan?action=reload-stroke', { cache:'no-store' });
      const d = await r.json();
      if (d.ok) {
        setRetryMsg({ ok:true,  text:'Model loaded! Run your scan again.' });
      } else {
        setRetryMsg({ ok:false, text: d.error || 'Still failed — check Python console for details.' });
      }
    } catch {
      setRetryMsg({ ok:false, text:'Could not reach the AI server.' });
    } finally {
      setRetrying(false);
    }
  };

  const isFileMissing = loadError && loadError.includes('File not found');
  const isTFMissing   = loadError && (loadError.toLowerCase().includes('tensorflow') || loadError.toLowerCase().includes('tf not'));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Error reason */}
      <div style={{ padding:'13px 16px', borderRadius:13, background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.18)' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#ef4444', marginBottom:6 }}>
          {isFileMissing ? 'Model file not found'
            : isTFMissing ? 'TensorFlow not importable'
            : 'Model failed to load'}
        </p>
        {loadError && (
          <code style={{
            display:'block', fontSize:10.5, color:'var(--ink-2)', lineHeight:1.6,
            background:'var(--bg)', border:'1px solid var(--line)', borderRadius:7,
            padding:'7px 10px', wordBreak:'break-all',
          }}>{loadError}</code>
        )}
      </div>

      {/* Fixes */}
      {isFileMissing && (
        <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--frame)', border:'1px solid var(--line)', fontSize:11, color:'var(--ink-3)', lineHeight:1.7 }}>
          Place the model at:<br/>
          <code style={{ fontSize:10.5, color:'var(--ink-2)' }}>BrainStroke/MedVision_Final_V2.keras</code>
        </div>
      )}
      {isTFMissing && (
        <div style={{
          padding:'9px 12px', borderRadius:10,
          background:'var(--bg)', border:'1px solid var(--line)',
          fontFamily:'monospace', fontSize:11, color:'var(--ink-2)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
        }}>
          <span>pip install tensorflow</span>
          <button onClick={() => navigator.clipboard?.writeText('pip install tensorflow')}
            style={{ flexShrink:0, padding:'2px 8px', borderRadius:6, border:'1px solid var(--line)', background:'var(--frame)', color:'var(--ink-3)', fontSize:10, fontWeight:600, cursor:'pointer' }}>
            Copy
          </button>
        </div>
      )}

      {/* Retry button */}
      <button onClick={retry} disabled={retrying} style={{
        padding:'9px 0', borderRadius:11, cursor: retrying ? 'not-allowed' : 'pointer',
        border:'1px solid var(--line)', background: retrying ? 'var(--line)' : 'var(--frame)',
        color:'var(--ink-2)', fontSize:12, fontWeight:700,
        display:'flex', alignItems:'center', justifyContent:'center', gap:7,
      }}>
        {retrying ? (
          <>
            <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:'linear' }}
              style={{ width:12, height:12, borderRadius:'50%', border:'2px solid var(--line)', borderTopColor:'var(--ink-2)' }} />
            Retrying…
          </>
        ) : '↺ Retry loading stroke model'}
      </button>

      {retryMsg && (
        <p style={{ fontSize:11, fontWeight:600, color: retryMsg.ok ? '#1D9E75' : '#ef4444', textAlign:'center' }}>
          {retryMsg.text}
        </p>
      )}
    </div>
  );
}

// ── Stroke analysis panel ──────────────────────────────────────────
function StrokePanel({ data }) {
  // data may be undefined if the server is old and doesn't return a stroke field
  const available   = data && data.model_available;
  const hasData     = !!data;
  const cfg         = hasData ? (SC[data.prediction] ?? SC.normal) : SC.normal;
  // Use raw_probability (direct sigmoid output) for the bars — more honest than the
  // confidence value which was already flipped for the "normal" direction.
  const rawProb     = hasData && available ? (data.raw_probability ?? (data.has_stroke ? data.confidence : 100 - data.confidence)) : 0;
  const strokePct   = Math.round(rawProb);
  const normalPct   = Math.max(0, 100 - strokePct);
  const ood         = hasData && data.out_of_distribution;

  return (
    <motion.div
      initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
      transition={{ delay:0.25, type:'spring', stiffness:180, damping:22 }}
      style={{
        marginTop:22, padding:22, borderRadius:20,
        background: available
          ? ood
            ? 'linear-gradient(135deg,rgba(245,158,11,0.06),transparent)'
            : `linear-gradient(135deg, ${cfg.glow}, transparent)`
          : 'rgba(100,100,100,0.04)',
        border:`1px solid ${available ? (ood ? 'rgba(245,158,11,0.3)' : cfg.color + '40') : 'var(--line)'}`,
      }}
    >
      {/* ── Panel header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:available ? 20 : 14 }}>
        <div style={{
          width:44, height:44, borderRadius:13, flexShrink:0,
          background:`${cfg.color}15`, border:`1px solid ${cfg.color}30`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8 2 5 5 5 8.5C5 11.2 6.6 13.5 9 14.6L8.2 21H15.8L15 14.6C17.4 13.5 19 11.2 19 8.5C19 5 16 2 12 2Z" stroke={cfg.color} strokeWidth="1.6" strokeLinejoin="round"/>
            <circle cx="12" cy="8" r="2" stroke={cfg.color} strokeWidth="1.4"/>
            <path d="M10 8 Q12 6 14 8" stroke={cfg.color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2, flexWrap:'wrap' }}>
            <span style={{ fontSize:15, fontWeight:900, color:'var(--ink)' }}>Stroke Analysis</span>
            {available && data.has_stroke && !ood && (
              <motion.span
                initial={{ scale:0.7, opacity:0 }} animate={{ scale:1, opacity:1 }}
                transition={{ delay:0.4, type:'spring', stiffness:300 }}
                style={{
                  padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:800,
                  background:`${cfg.color}18`, border:`1px solid ${cfg.color}40`,
                  color:cfg.color, letterSpacing:'0.12em', textTransform:'uppercase',
                }}
              >
                CRITICAL
              </motion.span>
            )}
            {available && !data.has_stroke && !ood && (
              <span style={{
                padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:800,
                background:`${SC.normal.color}15`, border:`1px solid ${SC.normal.color}35`,
                color:SC.normal.color, letterSpacing:'0.10em', textTransform:'uppercase',
              }}>
                CLEAR
              </span>
            )}
            {available && ood && (
              <span style={{
                padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:800,
                background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)',
                color:'#d97706', letterSpacing:'0.10em', textTransform:'uppercase',
              }}>
                UNCERTAIN
              </span>
            )}
            {!available && (
              <span style={{
                padding:'2px 9px', borderRadius:20, fontSize:9, fontWeight:700,
                background:'rgba(100,100,100,0.1)', border:'1px solid var(--line)',
                color:'var(--ink-3)', letterSpacing:'0.08em', textTransform:'uppercase',
              }}>
                UNAVAILABLE
              </span>
            )}
          </div>
          <span style={{ fontSize:11, color: ood ? '#a16207' : 'var(--ink-3)' }}>
            {available
              ? ood
                ? 'Results may be unreliable when a brain tumor is present'
                : 'MedVision ResNet-50 · Grad-CAM localization'
              : hasData
                ? 'Install TensorFlow and add BrainStroke/MedVision_Final_V2.keras'
                : 'Restart the AI server to enable stroke screening'}
          </span>
        </div>
      </div>

      {/* ── Out-of-distribution warning ── */}
      {available && ood && (
        <motion.div
          initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
          style={{
            marginBottom:18, padding:'10px 14px', borderRadius:12,
            background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.28)',
            display:'flex', alignItems:'flex-start', gap:10,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:1 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#f59e0b" strokeWidth="1.8" strokeLinejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="12" cy="17" r="0.5" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5"/>
          </svg>
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:'#d97706', marginBottom:3 }}>
              Tumor scan — stroke screening may be unreliable
            </p>
            <p style={{ fontSize:10.5, color:'#92400e', lineHeight:1.55 }}>
              This stroke model was trained on stroke-specific brain scans. When a brain tumor is present,
              the model may report elevated stroke risk because tumor and stroke patterns can look similar to AI.
              The raw stroke probability ({strokePct}%) shown below is for reference only.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Full result (model available) ── */}
      {available && (
        <div style={{ display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-start' }}>

          {/* Confidence ring + badges */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <ConfRing value={ood ? strokePct : data.confidence} color={ood ? '#f59e0b' : cfg.color} size={110} />
            <div style={{
              padding:'4px 14px', borderRadius:20,
              background: ood ? 'rgba(245,158,11,0.12)' : `${cfg.color}1a`,
              border:`1px solid ${ood ? 'rgba(245,158,11,0.35)' : cfg.color + '38'}`,
              fontSize:10, fontWeight:800, color: ood ? '#d97706' : cfg.color,
              textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center',
            }}>
              {ood ? 'Unreliable' : cfg.label}
            </div>
            <div style={{
              padding:'3px 10px', borderRadius:12,
              background:'var(--frame)', border:'1px solid var(--line)',
              fontSize:9, fontWeight:700, color:'var(--ink-3)',
              textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'center',
            }}>
              {ood ? 'Tumor detected' : data.urgency}
            </div>
          </div>

          {/* Probability bars + clinical info */}
          <div style={{ flex:1, minWidth:200, display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <p style={{ fontSize:9, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>
                  Stroke Probability
                </p>
                {ood && (
                  <span style={{ fontSize:9, color:'#f59e0b', fontWeight:600 }}>⚠ Tumor context</span>
                )}
              </div>
              <ProbBar label="Stroke Signs" value={strokePct} color={SC.stroke.color} active={data.has_stroke}  />
              <ProbBar label="Normal"       value={normalPct} color={SC.normal.color} active={!data.has_stroke} />
            </div>

            <div>
              <p style={{ fontSize:9, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:7 }}>
                Clinical Note
              </p>
              <p style={{ fontSize:11.5, color:'var(--ink-2)', lineHeight:1.65, marginBottom:12 }}>
                {data.description}
              </p>
              <p style={{ fontSize:9, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:7 }}>
                Recommended Actions
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {(data.treatment ?? []).map((t, i) => (
                  <motion.div key={i}
                    initial={{ opacity:0, x:-5 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay:0.08 * i + 0.3 }}
                    style={{ display:'flex', alignItems:'flex-start', gap:7 }}
                  >
                    <div style={{ width:5, height:5, borderRadius:'50%', background:cfg.color, flexShrink:0, marginTop:5 }} />
                    <span style={{ fontSize:11.5, color:'var(--ink-2)', lineHeight:1.5 }}>{t}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Model not available (TF missing / keras load error) ── */}
      {!available && hasData && <StrokeModelError loadError={data.load_error} />}

      {/* ── Old server (no stroke field returned at all) ── */}
      {!hasData && (
        <div style={{
          padding:'14px 16px', borderRadius:14,
          background:'var(--frame)', border:'1px solid var(--line)',
          display:'flex', alignItems:'center', gap:12,
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 9v4m0 4h.01" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <p style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.55 }}>
            Stroke screening requires the updated AI server.
            Restart it with: <code style={{ fontFamily:'monospace', background:'var(--bg)', padding:'1px 5px', borderRadius:3 }}>python BrainTumor/brain_api.py</code>
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ── Full results view ──────────────────────────────────────────────
function ScanResults({ data, onReset }) {
  const cfg      = TC[data.prediction] ?? TC.notumor;
  const strokeData = data.stroke;
  const strokeCfg  = strokeData ? (SC[strokeData.prediction] ?? SC.normal) : null;

  return (
    <motion.div
      initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
      transition={{ type:'spring', stiffness:200, damping:24 }}
    >
      {/* ── Reset button ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {/* Tumor chip */}
          <div style={{
            padding:'4px 12px', borderRadius:20, fontSize:10, fontWeight:800,
            background:`${cfg.color}15`, border:`1px solid ${cfg.color}30`, color:cfg.color,
            display:'flex', alignItems:'center', gap:5,
          }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:cfg.color }} />
            Tumor: {cfg.label}
          </div>
          {/* Stroke chip — always shown */}
          <div style={{
            padding:'4px 12px', borderRadius:20, fontSize:10, fontWeight:800,
            background: strokeCfg ? `${strokeCfg.color}15` : 'rgba(100,100,100,0.08)',
            border: strokeCfg ? `1px solid ${strokeCfg.color}30` : '1px solid var(--line)',
            color: strokeCfg ? strokeCfg.color : 'var(--ink-3)',
            display:'flex', alignItems:'center', gap:5,
          }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background: strokeCfg?.color ?? 'var(--ink-3)' }} />
            Stroke: {strokeData && strokeCfg ? strokeCfg.label : 'N/A'}
          </div>
        </div>
        <button onClick={onReset} style={{
          padding:'7px 18px', borderRadius:10, cursor:'pointer',
          border:'1px solid var(--line)', background:'transparent',
          color:'var(--ink-2)', fontSize:12, fontWeight:600,
        }}>
          ← Scan Another
        </button>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>

        {/* Image viewer */}
        <div style={{ flex:'1 1 340px', minWidth:0 }}>
          <ImgViewer
            original={data.original_b64}
            tumorOverlay={data.overlay_b64}
            tumorMask={data.mask_b64}
            strokeOverlay={strokeData?.overlay_b64}
            tumorColor={cfg.color}
            strokeColor={strokeCfg?.color}
          />
        </div>

        {/* ── Tumor analysis ── */}
        <div style={{ flex:'1 1 300px', minWidth:0, display:'flex', flexDirection:'column', gap:12 }}>

          {/* Tumor hero card */}
          <div style={{
            padding:20, borderRadius:18,
            background:`linear-gradient(135deg,${cfg.glow},transparent)`,
            border:`1px solid ${cfg.color}38`,
            display:'flex', alignItems:'center', gap:18,
          }}>
            <ConfRing value={data.confidence} color={cfg.color} />
            <div style={{ minWidth:0 }}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'3px 10px', borderRadius:20, marginBottom:7,
                background:`${cfg.color}1a`, border:`1px solid ${cfg.color}35`,
                fontSize:9, fontWeight:800, color:cfg.color, letterSpacing:'0.1em', textTransform:'uppercase',
              }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:cfg.color }} />
                {data.urgency}
              </div>
              <p style={{ fontSize:20, fontWeight:900, color:'var(--ink)', lineHeight:1.2, marginBottom:4 }}>
                {cfg.label}
              </p>
              {data.low_confidence && (
                <p style={{ fontSize:10, color:'#f59e0b', fontWeight:700 }}>⚠️ Low confidence — review recommended</p>
              )}
            </div>
          </div>

          {/* Class probabilities */}
          <div style={{ padding:16, borderRadius:16, background:'var(--frame)', border:'1px solid var(--line)' }}>
            <p style={{ fontSize:9, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
              Tumor Class Probabilities
            </p>
            {Object.entries(data.all_confidences).map(([cls, val]) => (
              <ProbBar key={cls} label={TC[cls]?.label ?? cls} value={val}
                color={TC[cls]?.color ?? '#888'} active={cls === data.prediction} />
            ))}
          </div>

          {/* Clinical description */}
          <div style={{ padding:16, borderRadius:16, background:'var(--frame)', border:'1px solid var(--line)' }}>
            <p style={{ fontSize:9, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
              Clinical Description
            </p>
            <p style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.65, marginBottom:14 }}>{data.description}</p>
            <p style={{ fontSize:9, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
              Suggested Approaches
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {data.treatment.map((t, i) => (
                <motion.div key={i} initial={{ opacity:0, x:-5 }} animate={{ opacity:1, x:0 }}
                  transition={{ delay:0.07 * i }}
                  style={{ display:'flex', alignItems:'flex-start', gap:7 }}
                >
                  <div style={{ width:5, height:5, borderRadius:'50%', background:cfg.color, flexShrink:0, marginTop:5 }} />
                  <span style={{ fontSize:11.5, color:'var(--ink-2)', lineHeight:1.5 }}>{t}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Segmentation stat */}
          {data.has_tumor && data.tumor_pixels > 0 && (
            <div style={{
              padding:11, borderRadius:12,
              background:`${cfg.color}0d`, border:`1px solid ${cfg.color}25`,
              display:'flex', alignItems:'center', gap:7,
              fontSize:11, color:cfg.color, fontWeight:600,
            }}>
              <svg width="13" height="13" fill={cfg.color} viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {data.tumor_pixels.toLocaleString()} tumor pixels segmented
            </div>
          )}
        </div>
      </div>

      {/* ── Stroke panel (always rendered — handles missing/failed/unavailable states) ── */}
      <StrokePanel data={strokeData} />

      {/* ── Neural Region Impact Analysis ── */}
      <BrainRegionAnalysis
        tumorClass={data.prediction}
        hasTumor={data.has_tumor}
        maskB64={data.mask_b64}
        overlayB64={data.overlay_b64}
        strokeDetected={strokeData?.has_stroke}
        strokeConfidence={strokeData?.confidence ? Math.round(strokeData.confidence) : undefined}
      />

      {/* Disclaimer */}
      <div style={{
        marginTop:18, padding:10, borderRadius:12,
        background:'rgba(100,100,100,0.05)', border:'1px solid var(--line)',
        fontSize:10, color:'var(--ink-3)', lineHeight:1.55,
      }}>
        ⚕️ For informational purposes only. Always consult a qualified neurologist or oncologist for diagnosis and treatment decisions.
      </div>
    </motion.div>
  );
}

// ── Main exported component ────────────────────────────────────────
export default function BrainScanTab({ onScanDone } = {}) {
  const [serverOk, setServerOk] = useState(null);
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [scanning, setScanning] = useState(false);
  const [results,  setResults]  = useState(null);
  const [error,    setError]    = useState(null);

  const checkServer = async () => {
    try {
      const r = await fetch('/api/brain-scan', { cache:'no-store' });
      const d = await r.json();
      setServerOk(!!d.classification);
    } catch {
      setServerOk(false);
    }
  };

  useEffect(() => {
    checkServer();
    const iv = setInterval(checkServer, 12000);
    return () => clearInterval(iv);
  }, []);

  const handleFile = useCallback(f => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f); setPreview(URL.createObjectURL(f));
    setResults(null); setError(null);
  }, [preview]);

  const analyze = async () => {
    if (!file) return;
    setScanning(true); setError(null); setResults(null);

    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 90000);  // 90s for dual-model

    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await fetch('/api/brain-scan', { method:'POST', body:fd, signal:ctrl.signal });
      clearTimeout(tid);
      const d = await r.json();
      if (!r.ok || d.error) {
        setError(d.error || 'Analysis failed — make sure the AI server is running.');
      } else {
        setResults(d);
        onScanDone?.();
      }
    } catch (e) {
      clearTimeout(tid);
      setError(
        e.name === 'AbortError'
          ? 'Request timed out. Start the server: python BrainTumor/brain_api.py'
          : (e.message || 'Connection failed — AI server may be offline.')
      );
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setResults(null); setError(null); setScanning(false);
  };

  return (
    <motion.div key="brain-scan"
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
      transition={{ duration:.4 }}
    >
      {/* ── Section header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', margin:0 }}>
          Neural <em className="text-gradient">Brain Scan AI</em>
        </h2>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {['Tumor + Stroke', 'Grad-CAM', '96% Acc.'].map(f => (
            <span key={f} style={{
              padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:700,
              background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.18)',
              color:'#9061f9', display:'none',
            }} className="hidden sm:inline-flex">{f}</span>
          ))}
          {/* Server status pill */}
          <div style={{
            display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20,
            background: serverOk === true  ? 'rgba(29,158,117,0.1)'
                      : serverOk === false ? 'rgba(239,68,68,0.1)'
                      : 'rgba(100,100,100,0.07)',
            border:`1px solid ${serverOk === true ? 'rgba(29,158,117,0.3)' : serverOk === false ? 'rgba(239,68,68,0.3)' : 'var(--line)'}`,
          }}>
            <div style={{
              width:6, height:6, borderRadius:'50%',
              background: serverOk === true ? '#1D9E75' : serverOk === false ? '#ef4444' : 'var(--ink-3)',
            }} />
            <span style={{
              fontSize:11, fontWeight:700,
              color: serverOk === true ? '#1D9E75' : serverOk === false ? '#ef4444' : 'var(--ink-3)',
            }}>
              {serverOk === null ? 'Connecting…' : serverOk ? 'AI Ready' : 'Server Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ── State machine ── */}
      <AnimatePresence mode="wait">

        {/* Offline / connecting */}
        {!scanning && !results && serverOk !== true && (
          <motion.div key="offline"
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0, paddingTop:8 }}
          >
            <div style={{
              width:'100%', maxWidth:580, padding:32, borderRadius:24, marginBottom:20,
              background: serverOk === null ? 'var(--frame)' : 'rgba(239,68,68,0.04)',
              border:`1px solid ${serverOk === null ? 'var(--line)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              {/* Status header */}
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
                <div style={{
                  width:52, height:52, borderRadius:16, flexShrink:0,
                  background: serverOk === null ? 'rgba(100,100,100,0.08)' : 'rgba(239,68,68,0.1)',
                  border:`1px solid ${serverOk === null ? 'var(--line)' : 'rgba(239,68,68,0.25)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {serverOk === null ? (
                    <motion.div
                      animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1.2, ease:'linear' }}
                      style={{ width:22, height:22, borderRadius:'50%', border:'2.5px solid var(--line)', borderTopColor:'var(--ink-2)' }}
                    />
                  ) : (
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path d="M18.36 5.64a9 9 0 1 1-12.72 0" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="2" x2="12" y2="12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p style={{ fontSize:18, fontWeight:800, color:'var(--ink)', marginBottom:3 }}>
                    {serverOk === null ? 'Connecting to AI Server…' : 'AI Server Not Running'}
                  </p>
                  <p style={{ fontSize:12, color:'var(--ink-3)' }}>
                    {serverOk === null
                      ? 'Checking localhost:5001 — please wait'
                      : 'The Python server must be running to analyze scans'}
                  </p>
                </div>
              </div>

              {serverOk === false && (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
                    {[
                      {
                        n:1, label:'Install Python dependencies',
                        cmd:'pip install flask flask-cors torch torchvision monai tensorflow opencv-python pillow numpy',
                        sub:'Only needed once',
                      },
                      {
                        n:2, label:'Start the AI server',
                        cmd:'python BrainTumor/brain_api.py',
                        sub:'Keep this terminal open',
                      },
                    ].map(s => (
                      <div key={s.n} style={{ padding:'14px 16px', borderRadius:14, background:'var(--frame)', border:'1px solid var(--line)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                          <div style={{
                            width:22, height:22, borderRadius:'50%', flexShrink:0,
                            background:'linear-gradient(135deg,#06b6d4,#7c3aed)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:11, fontWeight:800, color:'#fff',
                          }}>{s.n}</div>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--ink)' }}>{s.label}</span>
                          <span style={{ fontSize:10, color:'var(--ink-3)', marginLeft:'auto' }}>{s.sub}</span>
                        </div>
                        <div style={{
                          padding:'8px 12px', borderRadius:9,
                          background:'var(--bg)', border:'1px solid var(--line)',
                          fontFamily:'monospace', fontSize:11, color:'var(--ink-2)',
                          wordBreak:'break-all', lineHeight:1.5,
                          display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
                        }}>
                          <span>{s.cmd}</span>
                          <button
                            onClick={() => navigator.clipboard?.writeText(s.cmd)}
                            style={{
                              flexShrink:0, padding:'3px 8px', borderRadius:6,
                              border:'1px solid var(--line)', background:'var(--frame)',
                              color:'var(--ink-3)', fontSize:10, fontWeight:600, cursor:'pointer',
                            }}
                          >Copy</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expected output */}
                  <div style={{
                    padding:'12px 14px', borderRadius:12,
                    background:'rgba(29,158,117,0.06)', border:'1px solid rgba(29,158,117,0.2)',
                    fontFamily:'monospace', fontSize:10.5, color:'#1D9E75', lineHeight:1.85,
                  }}>
                    <span style={{ opacity:0.6 }}>Expected output after step 2:</span><br/>
                    🧠 MedVision Brain Analysis API<br/>
                    &nbsp;&nbsp;&nbsp;Tumor Clf&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : ✅ ResNet-50 loaded (cpu)<br/>
                    &nbsp;&nbsp;&nbsp;Tumor Seg&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : ✅ MONAI UNet loaded (cpu)<br/>
                    &nbsp;&nbsp;&nbsp;Stroke&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : ✅ MedVision loaded (TF 2.x)<br/>
                    &nbsp;&nbsp;&nbsp;Endpoint&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : http://localhost:5001/analyze
                  </div>
                </>
              )}
            </div>

            <button
              onClick={async () => { setServerOk(null); await checkServer(); }}
              style={{
                padding:'10px 28px', borderRadius:12, cursor:'pointer',
                border:'1px solid var(--line)', background:'var(--frame)',
                color:'var(--ink-2)', fontSize:12, fontWeight:700,
                display:'flex', alignItems:'center', gap:7,
              }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Check Connection
            </button>
          </motion.div>
        )}

        {/* Upload (server online, no file) */}
        {serverOk === true && !file && !scanning && !results && !error && (
          <motion.div key="upload" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:28 }}>
              {[
                { icon:'🧠', title:'4 Tumor Classes',   sub:'Glioma · Meningioma · Pituitary · None',   color:'#0ea5e9' },
                { icon:'🩸', title:'Stroke Detection',  sub:'MedVision dual-output ResNet-50',           color:'#7C3AED' },
                { icon:'🎯', title:'Grad-CAM Heatmap',  sub:'Magma colormap localization overlay',       color:'#f98e09' },
                { icon:'⚡', title:'Dual AI Scan',      sub:'Tumor + stroke analyzed simultaneously',    color:'#06B6D4' },
              ].map(c => (
                <div key={c.title} style={{
                  padding:'14px 16px', borderRadius:14,
                  background:'var(--frame)', border:'1px solid var(--line)',
                  display:'flex', alignItems:'flex-start', gap:10,
                }}>
                  <div style={{
                    width:34, height:34, borderRadius:10, flexShrink:0,
                    background:`${c.color}15`, border:`1px solid ${c.color}25`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                  }}>{c.icon}</div>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginBottom:2 }}>{c.title}</p>
                    <p style={{ fontSize:10, color:'var(--ink-3)', lineHeight:1.4 }}>{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <DropZone onFile={handleFile} />
          </motion.div>
        )}

        {/* Preview */}
        {serverOk === true && file && !scanning && !results && !error && (
          <motion.div key="preview"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}
          >
            <div style={{
              position:'relative', width:320, height:320, borderRadius:18,
              overflow:'hidden', border:'1px solid var(--line)', background:'#000',
            }}>
              <img src={preview} alt="preview"
                style={{ width:'100%', height:'100%', objectFit:'contain', filter:'brightness(0.82)' }} />
              <div className="ai-scan" style={{ position:'absolute', inset:0 }} />
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  position:'absolute', width:18, height:18,
                  borderColor:'rgba(124,58,237,0.75)', borderStyle:'solid', borderWidth:0,
                  ...(i === 0 ? { top:8, left:8, borderTopWidth:2, borderLeftWidth:2 }
                    : i === 1 ? { top:8, right:8, borderTopWidth:2, borderRightWidth:2 }
                    : i === 2 ? { bottom:8, left:8, borderBottomWidth:2, borderLeftWidth:2 }
                    : { bottom:8, right:8, borderBottomWidth:2, borderRightWidth:2 }),
                }} />
              ))}
            </div>
            <p style={{ fontSize:12, color:'var(--ink-3)' }}>
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={reset} style={{
                padding:'9px 22px', borderRadius:11, cursor:'pointer',
                border:'1px solid var(--line)', background:'transparent',
                color:'var(--ink-2)', fontSize:12, fontWeight:600,
              }}>Cancel</button>
              <button onClick={analyze} disabled={serverOk !== true} style={{
                padding:'9px 28px', borderRadius:11, border:'none',
                cursor: serverOk !== true ? 'not-allowed' : 'pointer',
                background: serverOk !== true ? 'var(--line)' : 'linear-gradient(135deg,#06b6d4,#7c3aed)',
                color: serverOk !== true ? 'var(--ink-3)' : '#fff',
                fontSize:12, fontWeight:700, transition:'all 0.2s',
              }}>
                {serverOk === null ? 'Checking server…' : serverOk ? 'Run Dual Scan →' : 'Server Offline'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Scanning */}
        {scanning && (
          <motion.div key="scanning" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <Scanning url={preview} />
          </motion.div>
        )}

        {/* Error */}
        {error && !scanning && (
          <motion.div key="error"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ textAlign:'center', padding:'48px 0' }}
          >
            <div style={{
              width:56, height:56, borderRadius:16, margin:'0 auto 16px',
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.22)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg width="24" height="24" fill="#ef4444" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <p style={{ fontSize:16, fontWeight:800, color:'var(--ink)', marginBottom:7 }}>Analysis Failed</p>
            <p style={{ fontSize:12, color:'var(--ink-2)', maxWidth:380, margin:'0 auto 22px', lineHeight:1.6 }}>{error}</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={reset} style={{
                padding:'9px 22px', borderRadius:11, border:'1px solid var(--line)',
                background:'transparent', color:'var(--ink-2)', fontSize:12, fontWeight:600, cursor:'pointer',
              }}>Try Different Image</button>
              <button onClick={analyze} disabled={serverOk !== true} style={{
                padding:'9px 24px', borderRadius:11, border:'none',
                cursor: serverOk !== true ? 'not-allowed' : 'pointer',
                background: serverOk !== true ? 'var(--line)' : 'linear-gradient(135deg,#06b6d4,#7c3aed)',
                color: serverOk !== true ? 'var(--ink-3)' : '#fff',
                fontSize:12, fontWeight:700,
              }}>
                {serverOk !== true ? 'Server Offline' : 'Retry'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {results && !scanning && (
          <motion.div key="results" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <ScanResults data={results} onReset={reset} />
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
