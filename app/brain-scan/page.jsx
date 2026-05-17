'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ── Tumor type palette ─────────────────────────────────────────
const TC = {
  glioma:     { label:'Glioma',          color:'#E24B4A', glow:'rgba(226,75,74,0.25)'  },
  meningioma: { label:'Meningioma',      color:'#EF9F27', glow:'rgba(239,159,39,0.25)' },
  notumor:    { label:'No Tumor',        color:'#1D9E75', glow:'rgba(29,158,117,0.25)' },
  pituitary:  { label:'Pituitary Tumor', color:'#378ADD', glow:'rgba(55,138,221,0.25)' },
};

// ── SVG Confidence Ring ────────────────────────────────────────
function ConfidenceRing({ value, color }) {
  const r    = 52;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position:'relative', width:130, height:130, flexShrink:0 }}>
      <svg width="130" height="130" style={{ transform:'rotate(-90deg)', display:'block' }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--line)" strokeWidth="9" />
        <motion.circle
          cx="65" cy="65" r={r} fill="none"
          stroke={color} strokeWidth="9" strokeLinecap="round"
          initial={{ strokeDasharray:`0 ${circ}` }}
          animate={{ strokeDasharray:`${(value/100)*circ} ${circ}` }}
          transition={{ duration:1.4, ease:'easeOut', delay:0.25 }}
        />
      </svg>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:2,
      }}>
        <motion.span
          initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:0.5, type:'spring', stiffness:260 }}
          style={{ fontSize:26, fontWeight:900, color, lineHeight:1 }}
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

// ── Probability bar ────────────────────────────────────────────
function ProbBar({ label, value, color, active }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12, fontWeight: active ? 700 : 500, color: active ? color : 'var(--ink-2)' }}>
          {label}
        </span>
        <span style={{ fontSize:12, fontWeight:700, color: active ? color : 'var(--ink-3)', fontVariantNumeric:'tabular-nums' }}>
          {value}%
        </span>
      </div>
      <div style={{ height:5, background:'var(--line)', borderRadius:3, overflow:'hidden' }}>
        <motion.div
          initial={{ width:0 }}
          animate={{ width:`${value}%` }}
          transition={{ duration:0.9, ease:'easeOut', delay:0.15 }}
          style={{
            height:'100%', borderRadius:3,
            background: active ? `linear-gradient(90deg,${color}99,${color})` : 'var(--line)',
            opacity: active ? 1 : 0.45,
          }}
        />
      </div>
    </div>
  );
}

// ── Tabbed Image Viewer ────────────────────────────────────────
function ImageViewer({ original, overlay, mask, color }) {
  const [tab, setTab] = useState('overlay');
  const TABS = [
    { id:'original', label:'Original' },
    { id:'overlay',  label:'AI Overlay' },
    { id:'mask',     label:'Seg. Mask' },
  ];
  const src = { original, overlay, mask }[tab];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{
        position:'relative', borderRadius:18, overflow:'hidden',
        border:'1px solid var(--line)', background:'#000',
        aspectRatio:'1/1',
      }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={tab}
            src={`data:image/png;base64,${src}`}
            alt={tab}
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.25 }}
            style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}
          />
        </AnimatePresence>
        {/* Top-left tab label */}
        <div style={{
          position:'absolute', top:10, left:10,
          background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)',
          borderRadius:8, padding:'4px 10px',
          fontSize:10, fontWeight:700, color:'#fff', letterSpacing:'0.08em', textTransform:'uppercase',
        }}>
          {TABS.find(t => t.id === tab)?.label}
        </div>
        {tab === 'overlay' && (
          <div style={{
            position:'absolute', bottom:10, right:10,
            background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)',
            borderRadius:8, padding:'4px 10px',
            display:'flex', alignItems:'center', gap:5,
            fontSize:10, color:'#fff', fontWeight:600,
          }}>
            <div style={{ width:8, height:8, borderRadius:2, background:color }} />
            Tumor region
          </div>
        )}
      </div>
      {/* Tab strip */}
      <div style={{ display:'flex', gap:6 }}>
        {TABS.map(t => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex:1, padding:'8px 0', borderRadius:10, cursor:'pointer',
              border:`1px solid ${tab===t.id ? 'var(--ink)' : 'var(--line)'}`,
              background: tab===t.id ? 'var(--ink)' : 'transparent',
              color: tab===t.id ? 'var(--frame)' : 'var(--ink-3)',
              fontSize:11, fontWeight:700, transition:'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Upload Zone ────────────────────────────────────────────────
function UploadZone({ onFile }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const handleDrop = useCallback(e => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);
  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }}
      style={{ display:'flex', flexDirection:'column', alignItems:'center' }}
    >
      {/* Hero copy */}
      <div style={{ textAlign:'center', marginBottom:40 }}>
        <motion.h1
          initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
          style={{ fontSize:38, fontWeight:900, lineHeight:1.1, marginBottom:12 }}
        >
          <span className="text-gradient">AI Brain Tumor</span>
          <br />Detection & Analysis
        </motion.h1>
        <motion.p
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.15 }}
          style={{ fontSize:14, color:'var(--ink-2)', maxWidth:480, margin:'0 auto 20px' }}
        >
          Upload an MRI scan to classify tumor type, measure confidence, and see the exact tumor location highlighted by our segmentation model.
        </motion.p>
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.25 }}
          style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}
        >
          {[
            ['🧠','ResNet-50 Classification'],
            ['🎯','UNet Segmentation'],
            ['📊','4 Tumor Classes'],
            ['🔬','96% Accuracy'],
          ].map(([icon, label]) => (
            <span key={label} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'5px 13px', borderRadius:20,
              background:'var(--frame)', border:'1px solid var(--line)',
              fontSize:11, fontWeight:600, color:'var(--ink-2)',
            }}>{icon} {label}</span>
          ))}
        </motion.div>
      </div>

      {/* Drop target */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          width:'100%', maxWidth:500, cursor:'pointer',
          padding:'56px 40px', borderRadius:28, textAlign:'center',
          border:`2px dashed ${drag ? '#06b6d4' : 'var(--line)'}`,
          background: drag ? 'rgba(6,182,212,0.04)' : 'var(--frame)',
          boxShadow: drag ? '0 0 0 5px rgba(6,182,212,0.08)' : 'none',
          transition:'all 0.25s',
          display:'flex', flexDirection:'column', alignItems:'center', gap:18,
        }}
      >
        {/* Icon with pulse rings */}
        <div style={{ position:'relative', width:80, height:80 }}>
          {[0,1].map(i => (
            <motion.div key={i}
              animate={{ scale:[1,1.4,1], opacity:[0.4,0,0.4] }}
              transition={{ repeat:Infinity, duration:2.6, delay:i*1 }}
              style={{
                position:'absolute',
                inset: -(i+1)*14,
                borderRadius:'50%',
                border:'1px solid rgba(6,182,212,0.25)',
              }}
            />
          ))}
          <div style={{
            width:80, height:80, borderRadius:22,
            background:'linear-gradient(135deg,rgba(6,182,212,0.12),rgba(124,58,237,0.12))',
            border:'1px solid rgba(6,182,212,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M9 3C6.24 3 4 5.24 4 8C4 9.68 4.83 11.17 6.1 12C4.83 12.83 4 14.32 4 16C4 18.76 6.24 21 9 21H15C17.76 21 20 18.76 20 16C20 14.32 19.17 12.83 17.9 12C19.17 11.17 20 9.68 20 8C20 5.24 17.76 3 15 3H9Z" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9 9C9 9 10.2 10 12 10C13.8 10 15 9 15 9" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 14C9 14 10.2 15 12 15C13.8 15 15 14 15 14" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="6" x2="12" y2="18" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div>
          <p style={{ fontSize:17, fontWeight:800, color:'var(--ink)', marginBottom:5 }}>
            {drag ? 'Release to upload' : 'Drop your MRI scan here'}
          </p>
          <p style={{ fontSize:12, color:'var(--ink-3)' }}>
            or click to browse · JPG, PNG supported
          </p>
        </div>

        <div style={{
          padding:'10px 28px', borderRadius:12,
          background:'linear-gradient(135deg,#06b6d4,#7c3aed)',
          color:'#fff', fontSize:13, fontWeight:700,
          pointerEvents:'none',
        }}>
          Choose MRI File
        </div>
        <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
    </motion.div>
  );
}

// ── Preview state ──────────────────────────────────────────────
function PreviewPanel({ file, previewUrl, onAnalyze, onCancel, canAnalyze }) {
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24 }}
    >
      <div style={{
        position:'relative', width:360, height:360, borderRadius:22,
        overflow:'hidden', border:'1px solid var(--line)', background:'#000',
      }}>
        <img src={previewUrl} alt="preview"
          style={{ width:'100%', height:'100%', objectFit:'contain', filter:'brightness(0.85)' }} />
        {/* Corner brackets */}
        {[{t:10,l:10,bt:'top',bl:'left'},{t:10,r:10,bt:'top',br:'right'},{b:10,l:10,bb:'bottom',bl:'left'},{b:10,r:10,bb:'bottom',br:'right'}].map((s, i) => {
          const style = {
            position:'absolute', width:22, height:22,
            borderColor:'rgba(6,182,212,0.8)', borderStyle:'solid', borderWidth:0,
            ...( i===0 ? {top:s.t,left:s.l,borderTopWidth:2,borderLeftWidth:2}
               : i===1 ? {top:s.t,right:s.r,borderTopWidth:2,borderRightWidth:2}
               : i===2 ? {bottom:s.b,left:s.l,borderBottomWidth:2,borderLeftWidth:2}
               : {bottom:s.b,right:s.r,borderBottomWidth:2,borderRightWidth:2}),
          };
          return <div key={i} style={style} />;
        })}
        {/* ai-scan CSS animation */}
        <div className="ai-scan" style={{ position:'absolute', inset:0 }} />
        {/* Center target */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <motion.div
            animate={{ scale:[1,1.25,1], opacity:[0.4,0.9,0.4] }}
            transition={{ repeat:Infinity, duration:2 }}
            style={{ width:36, height:36, border:'1.5px solid rgba(6,182,212,0.7)', borderRadius:'50%' }}
          />
        </div>
      </div>
      <p style={{ fontSize:12, color:'var(--ink-3)' }}>
        {file.name} · {(file.size/1024).toFixed(0)} KB
      </p>
      <div style={{ display:'flex', gap:12 }}>
        <button onClick={onCancel} style={{
          padding:'10px 24px', borderRadius:12, cursor:'pointer',
          border:'1px solid var(--line)', background:'transparent',
          color:'var(--ink-2)', fontSize:13, fontWeight:600,
        }}>
          Cancel
        </button>
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          style={{
            padding:'10px 32px', borderRadius:12, border:'none', cursor: canAnalyze ? 'pointer' : 'not-allowed',
            background: canAnalyze ? 'linear-gradient(135deg,#06b6d4,#7c3aed)' : 'var(--line)',
            color: canAnalyze ? '#fff' : 'var(--ink-3)',
            fontSize:13, fontWeight:700,
          }}
        >
          {canAnalyze ? 'Analyze Scan →' : 'Server Offline'}
        </button>
      </div>
    </motion.div>
  );
}

// ── Scanning animation ─────────────────────────────────────────
function ScanAnimation({ previewUrl }) {
  const steps = ['Image preprocessing','ResNet-50 classification','UNet segmentation','Overlay generation'];
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28, padding:'20px 0' }}
    >
      {/* Scan image */}
      <div style={{
        position:'relative', width:320, height:320, borderRadius:20,
        overflow:'hidden', border:'1px solid var(--line)',
      }}>
        <img src={previewUrl} alt="scan"
          style={{ width:'100%', height:'100%', objectFit:'contain', background:'#000', filter:'brightness(0.6)' }} />

        {/* Grid overlay */}
        <div style={{
          position:'absolute', inset:0, opacity:0.12,
          backgroundImage:'linear-gradient(rgba(6,182,212,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.7) 1px,transparent 1px)',
          backgroundSize:'32px 32px',
        }} />

        {/* Sweeping scan line */}
        <motion.div
          animate={{ top:['0%','100%'] }}
          transition={{ repeat:Infinity, duration:1.8, ease:'linear' }}
          style={{
            position:'absolute', left:0, right:0, height:2,
            background:'linear-gradient(90deg,transparent,#06b6d4 40%,#7c3aed 60%,transparent)',
            boxShadow:'0 0 18px rgba(6,182,212,0.9)',
          }}
        />

        {/* Pulsing center rings */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {[0,1,2].map(i => (
            <motion.div key={i}
              animate={{ scale:[0.8,2], opacity:[0.7,0] }}
              transition={{ repeat:Infinity, duration:2.2, delay:i*0.7 }}
              style={{
                position:'absolute', width:40, height:40, borderRadius:'50%',
                border:`1.5px solid rgba(6,182,212,${0.7 - i*0.2})`,
              }}
            />
          ))}
        </div>

        {/* Corner brackets */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            position:'absolute', width:20, height:20,
            borderColor:'#06b6d4', borderStyle:'solid', borderWidth:0,
            ...(i===0?{top:8,left:8,borderTopWidth:2,borderLeftWidth:2}
              :i===1?{top:8,right:8,borderTopWidth:2,borderRightWidth:2}
              :i===2?{bottom:8,left:8,borderBottomWidth:2,borderLeftWidth:2}
              :{bottom:8,right:8,borderBottomWidth:2,borderRightWidth:2}),
          }} />
        ))}
      </div>

      {/* Status text */}
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:20, fontWeight:800, color:'var(--ink)', marginBottom:6 }}>
          Analyzing MRI Scan
          {[0,1,2].map(i => (
            <motion.span key={i}
              animate={{ opacity:[0,1,0] }}
              transition={{ repeat:Infinity, duration:1.5, delay:i*0.35 }}
            >.</motion.span>
          ))}
        </p>
        <p style={{ fontSize:13, color:'var(--ink-2)' }}>Running classification + segmentation models</p>
      </div>

      {/* Progress steps */}
      <div style={{ display:'flex', gap:24, flexWrap:'wrap', justifyContent:'center' }}>
        {steps.map((step, i) => (
          <motion.div key={step}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:i*0.35 }}
            style={{ textAlign:'center', fontSize:11, color:'var(--ink-3)', maxWidth:80 }}
          >
            <motion.div
              animate={{ background:['rgba(6,182,212,0.15)','rgba(124,58,237,0.45)','rgba(6,182,212,0.15)'] }}
              transition={{ repeat:Infinity, duration:2, delay:i*0.35 }}
              style={{ width:8, height:8, borderRadius:'50%', margin:'0 auto 5px' }}
            />
            {step}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Results Panel ──────────────────────────────────────────────
function Results({ data, onNewScan }) {
  const cfg = TC[data.prediction] || TC.notumor;
  return (
    <motion.div
      initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
      transition={{ type:'spring', stiffness:200, damping:24 }}
      style={{ display:'flex', gap:28, flexWrap:'wrap' }}
    >
      {/* Image viewer */}
      <div style={{ flex:'1 1 360px', minWidth:0 }}>
        <ImageViewer
          original={data.original_b64}
          overlay={data.overlay_b64}
          mask={data.mask_b64}
          color={cfg.color}
        />
      </div>

      {/* Analysis column */}
      <div style={{ flex:'1 1 320px', minWidth:0, display:'flex', flexDirection:'column', gap:14 }}>

        {/* Diagnosis card */}
        <div style={{
          padding:22, borderRadius:20,
          background:`linear-gradient(135deg, ${cfg.glow}, transparent)`,
          border:`1px solid ${cfg.color}40`,
          display:'flex', alignItems:'center', gap:20,
        }}>
          <ConfidenceRing value={data.confidence} color={cfg.color} />
          <div style={{ minWidth:0 }}>
            <motion.div
              initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }}
              style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'3px 11px', borderRadius:20, marginBottom:8,
                background:`${cfg.color}20`, border:`1px solid ${cfg.color}40`,
                fontSize:10, fontWeight:700, color:cfg.color, letterSpacing:'0.09em', textTransform:'uppercase',
              }}
            >
              <div style={{ width:5, height:5, borderRadius:'50%', background:cfg.color }} />
              {data.urgency}
            </motion.div>
            <motion.p
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
              style={{ fontSize:22, fontWeight:900, color:'var(--ink)', lineHeight:1.2, marginBottom:4 }}
            >
              {cfg.label}
            </motion.p>
            {data.low_confidence && (
              <motion.p
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
                style={{ fontSize:11, color:'#f59e0b', fontWeight:600 }}
              >
                ⚠️ Low confidence — specialist review recommended
              </motion.p>
            )}
          </div>
        </div>

        {/* Probability breakdown */}
        <div style={{
          padding:18, borderRadius:18,
          background:'var(--frame)', border:'1px solid var(--line)',
        }}>
          <p style={{ fontSize:10, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>
            Class Probabilities
          </p>
          {Object.entries(data.all_confidences).map(([cls, val]) => (
            <ProbBar
              key={cls}
              label={TC[cls]?.label ?? cls}
              value={val}
              color={TC[cls]?.color ?? '#888'}
              active={cls === data.prediction}
            />
          ))}
        </div>

        {/* Clinical info */}
        <div style={{
          padding:18, borderRadius:18,
          background:'var(--frame)', border:'1px solid var(--line)',
        }}>
          <p style={{ fontSize:10, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
            Clinical Description
          </p>
          <p style={{ fontSize:12.5, color:'var(--ink-2)', lineHeight:1.65, marginBottom:16 }}>
            {data.description}
          </p>
          <p style={{ fontSize:10, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
            Suggested Approaches
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {data.treatment.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
                transition={{ delay:0.1 + i*0.07 }}
                style={{ display:'flex', alignItems:'flex-start', gap:8 }}
              >
                <div style={{
                  width:6, height:6, borderRadius:'50%', background:cfg.color,
                  flexShrink:0, marginTop:5,
                }} />
                <span style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.5 }}>{t}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Segmentation stat */}
        {data.has_tumor && data.tumor_pixels > 0 && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
            style={{
              padding:12, borderRadius:14,
              background:`${cfg.color}10`, border:`1px solid ${cfg.color}28`,
              display:'flex', alignItems:'center', gap:8, fontSize:11, color:cfg.color, fontWeight:600,
            }}
          >
            <svg width="14" height="14" fill={cfg.color} viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/>
              <path d="M11 7h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            Tumor region identified · {data.tumor_pixels.toLocaleString()} segmented pixels
          </motion.div>
        )}

        {/* Disclaimer */}
        <div style={{
          padding:12, borderRadius:14,
          background:'rgba(100,100,100,0.05)', border:'1px solid var(--line)',
          fontSize:11, color:'var(--ink-3)', lineHeight:1.55,
        }}>
          ⚕️ For informational purposes only. This AI output does not constitute medical diagnosis. Always consult a qualified neurologist or oncologist.
        </div>

        {/* New scan button */}
        <button onClick={onNewScan} style={{
          padding:'11px 0', borderRadius:14, cursor:'pointer',
          border:'1px solid var(--line)', background:'transparent',
          color:'var(--ink-2)', fontSize:13, fontWeight:700, transition:'all 0.2s',
        }}>
          ← Scan Another Image
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function BrainScanPage() {
  const [serverStatus, setServerStatus] = useState(null); // null=loading, true/false
  const [file,         setFile]         = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [scanning,     setScanning]     = useState(false);
  const [results,      setResults]      = useState(null);
  const [error,        setError]        = useState(null);
  const [dashPath,     setDashPath]     = useState('/');

  // Resolve back-button destination from localStorage user
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('neural_user') || 'null');
      if (u?.role === 'doctor')  setDashPath('/dashboard/doctor');
      else if (u?.role === 'patient') setDashPath('/dashboard/patient');
      else if (u?.role === 'admin')   setDashPath('/dashboard/admin');
    } catch {}
  }, []);

  // Poll server status every 10s
  useEffect(() => {
    const check = async () => {
      try {
        const res  = await fetch('/api/brain-scan', { cache:'no-store' });
        const data = await res.json();
        setServerStatus(!!data.classification);
      } catch {
        setServerStatus(false);
      }
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, []);

  const handleFile = useCallback(f => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResults(null);
    setError(null);
  }, [previewUrl]);

  const handleAnalyze = async () => {
    if (!file) return;
    setScanning(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await fetch('/api/brain-scan', { method:'POST', body:fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed');
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setPreviewUrl(null);
    setResults(null); setError(null); setScanning(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:16 }}>
      <div className="frame" style={{ padding:0, minHeight:'calc(100vh - 32px)' }}>

        {/* ── Header ── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 24px', borderBottom:'1px solid var(--line)',
          background:'var(--frame)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <Link href={dashPath} style={{
              display:'flex', alignItems:'center', gap:5,
              color:'var(--ink-2)', fontSize:12, fontWeight:600, textDecoration:'none',
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Dashboard
            </Link>
            <div style={{ width:1, height:18, background:'var(--line)' }} />
            {/* Logo */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:34, height:34, borderRadius:10,
                background:'linear-gradient(135deg,rgba(6,182,212,0.15),rgba(124,58,237,0.15))',
                border:'1px solid rgba(6,182,212,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M9 3C6.24 3 4 5.24 4 8C4 9.68 4.83 11.17 6.1 12C4.83 12.83 4 14.32 4 16C4 18.76 6.24 21 9 21H15C17.76 21 20 18.76 20 16C20 14.32 19.17 12.83 17.9 12C19.17 11.17 20 9.68 20 8C20 5.24 17.76 3 15 3H9Z" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round"/>
                  <line x1="12" y1="6" x2="12" y2="18" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize:15, fontWeight:800, color:'var(--ink)', lineHeight:1.2 }}>MedVision Brain Scan</p>
                <p style={{ fontSize:10, color:'var(--ink-3)', lineHeight:1.2 }}>AI-powered tumor detection</p>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {(results || file) && !scanning && (
              <button onClick={reset} style={{
                padding:'6px 14px', borderRadius:9, cursor:'pointer',
                border:'1px solid var(--line)', background:'transparent',
                color:'var(--ink-2)', fontSize:11, fontWeight:600,
              }}>
                New Scan
              </button>
            )}
            {/* Server status pill */}
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'5px 12px', borderRadius:20,
              background: serverStatus === true  ? 'rgba(29,158,117,0.1)' :
                          serverStatus === false ? 'rgba(239,68,68,0.1)'  : 'rgba(100,100,100,0.08)',
              border:`1px solid ${serverStatus === true ? 'rgba(29,158,117,0.3)' : serverStatus === false ? 'rgba(239,68,68,0.3)' : 'var(--line)'}`,
            }}>
              <div className="pulse-dot" style={{
                width:6, height:6, borderRadius:'50%',
                background: serverStatus === true ? '#1D9E75' : serverStatus === false ? '#ef4444' : 'var(--ink-3)',
              }} />
              <span style={{
                fontSize:11, fontWeight:700,
                color: serverStatus === true ? '#1D9E75' : serverStatus === false ? '#ef4444' : 'var(--ink-3)',
              }}>
                {serverStatus === null ? 'Connecting…' : serverStatus ? 'AI Ready' : 'Server Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Server offline banner ── */}
        <AnimatePresence>
          {serverStatus === false && (
            <motion.div
              initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
              exit={{ height:0, opacity:0 }}
              style={{
                overflow:'hidden', borderBottom:'1px solid rgba(239,68,68,0.2)',
                background:'rgba(239,68,68,0.07)',
              }}
            >
              <div style={{ padding:'10px 24px', fontSize:12, color:'#ef4444', display:'flex', alignItems:'center', gap:8 }}>
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                AI server offline — start it with:&nbsp;
                <code style={{
                  fontFamily:'monospace', fontSize:11,
                  background:'rgba(239,68,68,0.15)', padding:'2px 7px', borderRadius:5,
                }}>
                  python brainTumor/brain_api.py
                </code>
                &nbsp;(port 5001)
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ── */}
        <div style={{ padding:'36px 28px' }}>
          <AnimatePresence mode="wait">

            {/* Upload state */}
            {!file && !scanning && !results && !error && (
              <motion.div key="upload">
                <UploadZone onFile={handleFile} />
              </motion.div>
            )}

            {/* File selected — preview */}
            {file && !scanning && !results && !error && (
              <motion.div key="preview">
                <PreviewPanel
                  file={file}
                  previewUrl={previewUrl}
                  onAnalyze={handleAnalyze}
                  onCancel={reset}
                  canAnalyze={serverStatus !== false}
                />
              </motion.div>
            )}

            {/* Scanning */}
            {scanning && (
              <motion.div key="scanning">
                <ScanAnimation previewUrl={previewUrl} />
              </motion.div>
            )}

            {/* Error */}
            {error && !scanning && (
              <motion.div key="error"
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                style={{ textAlign:'center', padding:'60px 0' }}
              >
                <div style={{
                  width:64, height:64, borderRadius:18, margin:'0 auto 20px',
                  background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <svg width="28" height="28" fill="#ef4444" viewBox="0 0 24 24">
                    <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </div>
                <p style={{ fontSize:18, fontWeight:800, color:'var(--ink)', marginBottom:8 }}>Analysis Failed</p>
                <p style={{ fontSize:13, color:'var(--ink-2)', maxWidth:420, margin:'0 auto 28px', lineHeight:1.6 }}>
                  {error}
                </p>
                <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                  <button onClick={reset} style={{
                    padding:'10px 24px', borderRadius:12,
                    border:'1px solid var(--line)', background:'transparent',
                    color:'var(--ink-2)', fontSize:13, fontWeight:600, cursor:'pointer',
                  }}>
                    Upload Different Image
                  </button>
                  <button onClick={handleAnalyze} style={{
                    padding:'10px 28px', borderRadius:12, border:'none', cursor:'pointer',
                    background:'linear-gradient(135deg,#06b6d4,#7c3aed)',
                    color:'#fff', fontSize:13, fontWeight:700,
                  }}>
                    Retry
                  </button>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {results && !scanning && (
              <motion.div key="results">
                <Results data={results} onNewScan={reset} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
