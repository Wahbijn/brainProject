'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Tumor palette ──────────────────────────────────────────────
const TC = {
  glioma:     { label:'Glioma',          color:'#E24B4A', glow:'rgba(226,75,74,0.18)'  },
  meningioma: { label:'Meningioma',      color:'#EF9F27', glow:'rgba(239,159,39,0.18)' },
  notumor:    { label:'No Tumor',        color:'#1D9E75', glow:'rgba(29,158,117,0.18)' },
  pituitary:  { label:'Pituitary Tumor', color:'#378ADD', glow:'rgba(55,138,221,0.18)' },
};

// ── SVG Confidence Ring ────────────────────────────────────────
function ConfRing({ value, color }) {
  const r    = 50;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position:'relative', width:124, height:124, flexShrink:0 }}>
      <svg width="124" height="124" style={{ transform:'rotate(-90deg)', display:'block' }}>
        <circle cx="62" cy="62" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <motion.circle
          cx="62" cy="62" r={r} fill="none" stroke={color}
          strokeWidth="8" strokeLinecap="round"
          initial={{ strokeDasharray:`0 ${circ}` }}
          animate={{ strokeDasharray:`${(value/100)*circ} ${circ}` }}
          transition={{ duration:1.3, ease:'easeOut', delay:0.2 }}
        />
      </svg>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:1,
      }}>
        <motion.span
          initial={{ opacity:0, scale:0.6 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:0.45, type:'spring', stiffness:260 }}
          style={{ fontSize:24, fontWeight:900, color, lineHeight:1 }}
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
            opacity: active ? 1 : 0.38,
          }}
        />
      </div>
    </div>
  );
}

// ── Tabbed image viewer ────────────────────────────────────────
function ImgViewer({ original, overlay, mask, color }) {
  const [tab, setTab] = useState('overlay');
  const src = { original, overlay, mask }[tab];
  const TABS = [{ id:'original', label:'Original' },{ id:'overlay', label:'AI Overlay' },{ id:'mask', label:'Mask' }];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{
        position:'relative', borderRadius:16, overflow:'hidden',
        border:'1px solid var(--line)', background:'#000', aspectRatio:'1/1',
      }}>
        <AnimatePresence mode="wait">
          <motion.img key={tab} src={`data:image/png;base64,${src}`} alt={tab}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.22 }}
            style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}
          />
        </AnimatePresence>
        <div style={{
          position:'absolute', top:8, left:8,
          background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)',
          borderRadius:7, padding:'3px 9px',
          fontSize:9, fontWeight:700, color:'#fff', letterSpacing:'0.09em', textTransform:'uppercase',
        }}>
          {TABS.find(t=>t.id===tab)?.label}
        </div>
        {tab==='overlay' && (
          <div style={{
            position:'absolute', bottom:8, right:8,
            background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)',
            borderRadius:7, padding:'3px 9px', fontSize:9, fontWeight:600, color:'#fff',
            display:'flex', alignItems:'center', gap:5,
          }}>
            <div style={{ width:7, height:7, borderRadius:2, background:color }} />
            Tumor region
          </div>
        )}
      </div>
      <div style={{ display:'flex', gap:5 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'7px 0', borderRadius:9, cursor:'pointer',
            border:`1px solid ${tab===t.id ? 'var(--ink)' : 'var(--line)'}`,
            background: tab===t.id ? 'var(--ink)' : 'transparent',
            color: tab===t.id ? 'var(--frame)' : 'var(--ink-3)',
            fontSize:11, fontWeight:700, transition:'all 0.18s',
          }}>{t.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Upload drop zone ───────────────────────────────────────────
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
        border:`2px dashed ${drag ? '#ff3d6e' : 'var(--line)'}`,
        background: drag ? 'rgba(255,61,110,0.04)' : 'var(--frame)',
        boxShadow: drag ? '0 0 0 5px rgba(255,61,110,0.08)' : 'none',
        transition:'all 0.22s',
        display:'flex', flexDirection:'column', alignItems:'center', gap:16,
      }}
    >
      {/* Icon + pulse rings */}
      <div style={{ position:'relative', width:80, height:80 }}>
        {[0,1].map(i => (
          <motion.div key={i}
            animate={{ scale:[1,1.45,1], opacity:[0.4,0,0.4] }}
            transition={{ repeat:Infinity, duration:2.8, delay:i*1.1 }}
            style={{
              position:'absolute', inset:-(i+1)*14, borderRadius:'50%',
              border:'1px solid rgba(255,61,110,0.22)',
            }}
          />
        ))}
        <motion.div animate={{ rotate: drag ? 15 : 0 }} transition={{ type:'spring', stiffness:200 }}
          style={{
            width:80, height:80, borderRadius:22,
            background:'linear-gradient(135deg,rgba(255,61,110,0.13),rgba(122,77,255,0.13))',
            border:'1px solid rgba(255,61,110,0.22)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >
          {/* Brain icon */}
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <path d="M9 3C6.24 3 4 5.24 4 8C4 9.68 4.83 11.17 6.1 12C4.83 12.83 4 14.32 4 16C4 18.76 6.24 21 9 21H15C17.76 21 20 18.76 20 16C20 14.32 19.17 12.83 17.9 12C19.17 11.17 20 9.68 20 8C20 5.24 17.76 3 15 3H9Z" stroke="#ff6a8d" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M9 9.5C9 9.5 10.2 10.5 12 10.5C13.8 10.5 15 9.5 15 9.5" stroke="#7a4dff" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M9 14C9 14 10.2 15 12 15C13.8 15 15 14 15 14" stroke="#7a4dff" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="12" y1="5.5" x2="12" y2="18.5" stroke="#ff6a8d" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </motion.div>
      </div>

      <div>
        <p style={{ fontSize:16, fontWeight:800, color:'var(--ink)', marginBottom:5 }}>
          {drag ? 'Release to upload' : 'Drop your MRI scan here'}
        </p>
        <p style={{ fontSize:12, color:'var(--ink-3)' }}>
          Drag & drop or click to browse · JPG, PNG
        </p>
      </div>

      <div style={{
        padding:'9px 26px', borderRadius:11,
        background:'linear-gradient(135deg,#ff3d6e,#7a4dff)',
        color:'#fff', fontSize:12, fontWeight:700, pointerEvents:'none',
      }}>
        Choose MRI File
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display:'none' }}
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

// ── Scanning animation ─────────────────────────────────────────
function Scanning({ url }) {
  const steps = ['Preprocessing','Classification','Segmentation','Overlay'];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24, padding:'8px 0' }}>
      <div style={{
        position:'relative', width:300, height:300, borderRadius:18,
        overflow:'hidden', border:'1px solid var(--line)',
      }}>
        <img src={url} alt="scan" style={{ width:'100%', height:'100%', objectFit:'contain', background:'#000', filter:'brightness(0.55)' }} />
        {/* Grid */}
        <div style={{
          position:'absolute', inset:0, opacity:0.1,
          backgroundImage:'linear-gradient(rgba(255,61,110,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,61,110,0.8) 1px,transparent 1px)',
          backgroundSize:'28px 28px',
        }} />
        {/* Sweep line */}
        <motion.div
          animate={{ top:['0%','100%'] }}
          transition={{ repeat:Infinity, duration:1.7, ease:'linear' }}
          style={{
            position:'absolute', left:0, right:0, height:2,
            background:'linear-gradient(90deg,transparent,#ff3d6e 35%,#7a4dff 65%,transparent)',
            boxShadow:'0 0 20px rgba(255,61,110,0.85)',
          }}
        />
        {/* Pulse rings */}
        {[0,1,2].map(i => (
          <motion.div key={i}
            animate={{ scale:[0.6,2.2], opacity:[0.8,0] }}
            transition={{ repeat:Infinity, duration:2.2, delay:i*0.7 }}
            style={{
              position:'absolute',
              top:'50%', left:'50%', transform:'translate(-50%,-50%)',
              width:38, height:38, borderRadius:'50%',
              border:`1.5px solid rgba(255,61,110,${0.7-i*0.18})`,
            }}
          />
        ))}
        {/* Corner brackets */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            position:'absolute', width:18, height:18,
            borderColor:'#ff3d6e', borderStyle:'solid', borderWidth:0,
            ...(i===0?{top:7,left:7,borderTopWidth:2,borderLeftWidth:2}
              :i===1?{top:7,right:7,borderTopWidth:2,borderRightWidth:2}
              :i===2?{bottom:7,left:7,borderBottomWidth:2,borderLeftWidth:2}
              :{bottom:7,right:7,borderBottomWidth:2,borderRightWidth:2}),
          }} />
        ))}
      </div>

      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:18, fontWeight:800, color:'var(--ink)', marginBottom:5 }}>
          Analyzing Scan
          {[0,1,2].map(i => (
            <motion.span key={i} animate={{ opacity:[0,1,0] }} transition={{ repeat:Infinity, duration:1.5, delay:i*0.3 }}>.</motion.span>
          ))}
        </p>
        <p style={{ fontSize:12, color:'var(--ink-2)' }}>ResNet-50 + UNet segmentation</p>
      </div>

      <div style={{ display:'flex', gap:18 }}>
        {steps.map((s,i) => (
          <motion.div key={s} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.3 }}
            style={{ textAlign:'center', fontSize:10, color:'var(--ink-3)', maxWidth:72 }}
          >
            <motion.div
              animate={{ background:['rgba(255,61,110,0.15)','rgba(122,77,255,0.5)','rgba(255,61,110,0.15)'] }}
              transition={{ repeat:Infinity, duration:2, delay:i*0.3 }}
              style={{ width:7, height:7, borderRadius:'50%', margin:'0 auto 4px' }}
            />
            {s}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Results view ───────────────────────────────────────────────
function ScanResults({ data, onReset }) {
  const cfg = TC[data.prediction] ?? TC.notumor;
  return (
    <motion.div
      initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
      transition={{ type:'spring', stiffness:200, damping:24 }}
    >
      {/* Reset button row */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:18 }}>
        <button onClick={onReset} style={{
          padding:'7px 18px', borderRadius:10, cursor:'pointer',
          border:'1px solid var(--line)', background:'transparent',
          color:'var(--ink-2)', fontSize:12, fontWeight:600,
        }}>
          ← Scan Another
        </button>
      </div>

      <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>

        {/* ── Left: image viewer ── */}
        <div style={{ flex:'1 1 340px', minWidth:0 }}>
          <ImgViewer
            original={data.original_b64}
            overlay={data.overlay_b64}
            mask={data.mask_b64}
            color={cfg.color}
          />
        </div>

        {/* ── Right: analysis ── */}
        <div style={{ flex:'1 1 300px', minWidth:0, display:'flex', flexDirection:'column', gap:12 }}>

          {/* Diagnosis hero card */}
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
              <p style={{ fontSize:20, fontWeight:900, color:'var(--ink)', lineHeight:1.2, marginBottom:4 }}>{cfg.label}</p>
              {data.low_confidence && (
                <p style={{ fontSize:10, color:'#f59e0b', fontWeight:700 }}>⚠️ Low confidence — review recommended</p>
              )}
            </div>
          </div>

          {/* Probabilities */}
          <div style={{ padding:16, borderRadius:16, background:'var(--frame)', border:'1px solid var(--line)' }}>
            <p style={{ fontSize:9, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
              Class Probabilities
            </p>
            {Object.entries(data.all_confidences).map(([cls, val]) => (
              <ProbBar key={cls} label={TC[cls]?.label??cls} value={val}
                color={TC[cls]?.color??'#888'} active={cls===data.prediction} />
            ))}
          </div>

          {/* Clinical info */}
          <div style={{ padding:16, borderRadius:16, background:'var(--frame)', border:'1px solid var(--line)' }}>
            <p style={{ fontSize:9, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
              Clinical Description
            </p>
            <p style={{ fontSize:12, color:'var(--ink-2)', lineHeight:1.65, marginBottom:14 }}>{data.description}</p>
            <p style={{ fontSize:9, fontWeight:800, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
              Suggested Approaches
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {data.treatment.map((t,i) => (
                <motion.div key={i} initial={{ opacity:0, x:-5 }} animate={{ opacity:1, x:0 }}
                  transition={{ delay:0.08*i }} style={{ display:'flex', alignItems:'flex-start', gap:7 }}
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

          {/* Disclaimer */}
          <div style={{
            padding:10, borderRadius:12,
            background:'rgba(100,100,100,0.05)', border:'1px solid var(--line)',
            fontSize:10, color:'var(--ink-3)', lineHeight:1.55,
          }}>
            ⚕️ For informational purposes only. Always consult a qualified neurologist or oncologist for diagnosis.
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main exported component ────────────────────────────────────
export default function BrainScanTab() {
  const [serverOk, setServerOk] = useState(null);
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [scanning, setScanning] = useState(false);
  const [results,  setResults]  = useState(null);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/brain-scan', { cache:'no-store' });
        const d = await r.json();
        setServerOk(!!d.classification);
      } catch { setServerOk(false); }
    };
    check();
    const iv = setInterval(check, 12000);
    return () => clearInterval(iv);
  }, []);

  const handleFile = useCallback(f => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f); setPreview(URL.createObjectURL(f));
    setResults(null); setError(null);
  }, [preview]);

  const analyze = async () => {
    if (!file) return;
    setScanning(true);
    setError(null);
    setResults(null);

    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 65000);

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
      }
    } catch (e) {
      clearTimeout(tid);
      setError(
        e.name === 'AbortError'
          ? 'Request timed out. Start the server: python brainTumor/brain_api.py'
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
    <motion.div key="brain-scan" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.4 }}>

      {/* ── Section header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <h2 className="font-serif" style={{ fontSize:26, fontWeight:400, color:'var(--ink)', margin:0 }}>
          Neural <em className="text-gradient">Brain Scan AI</em>
        </h2>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Feature chips */}
          {['ResNet-50','UNet Seg.','96% Accuracy'].map(f => (
            <span key={f} style={{
              padding:'4px 11px', borderRadius:20, fontSize:10, fontWeight:700,
              background:'rgba(255,61,110,0.08)', border:'1px solid rgba(255,61,110,0.18)',
              color:'#ff6a8d', display:'none',
            }}
            className="hidden sm:inline-flex"
            >{f}</span>
          ))}
          {/* Server status */}
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'5px 12px', borderRadius:20,
            background: serverOk === true  ? 'rgba(29,158,117,0.1)' :
                        serverOk === false ? 'rgba(239,68,68,0.1)'  : 'rgba(100,100,100,0.07)',
            border:`1px solid ${serverOk===true?'rgba(29,158,117,0.3)':serverOk===false?'rgba(239,68,68,0.3)':'var(--line)'}`,
          }}>
            <div className="pulse-dot" style={{
              width:6, height:6, borderRadius:'50%',
              background: serverOk===true?'#1D9E75':serverOk===false?'#ef4444':'var(--ink-3)',
            }} />
            <span style={{
              fontSize:11, fontWeight:700,
              color: serverOk===true?'#1D9E75':serverOk===false?'#ef4444':'var(--ink-3)',
            }}>
              {serverOk===null?'Connecting…':serverOk?'AI Ready':'Server Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ── States ── */}
      <AnimatePresence mode="wait">

        {/* ── Server offline / connecting screen ── */}
        {!scanning && !results && serverOk !== true && (
          <motion.div key="offline" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0, paddingTop:8 }}
          >
            {/* Status card */}
            <div style={{
              width:'100%', maxWidth:560,
              padding:32, borderRadius:24,
              background: serverOk === null ? 'var(--frame)' : 'rgba(239,68,68,0.04)',
              border:`1px solid ${serverOk === null ? 'var(--line)' : 'rgba(239,68,68,0.2)'}`,
              marginBottom:20,
            }}>
              {/* Icon row */}
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
                      : 'The Python inference server must be running to analyze scans'}
                  </p>
                </div>
              </div>

              {serverOk === false && (
                <>
                  {/* Steps */}
                  <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
                    {[
                      {
                        n:1, label:'Install Python dependencies',
                        cmd:'pip install flask flask-cors torch torchvision monai pillow numpy',
                        sub:'Only needed once',
                      },
                      {
                        n:2, label:'Start the AI server',
                        cmd:'python brainTumor/brain_api.py',
                        sub:'Run from your project root — keep this terminal open',
                      },
                    ].map(s => (
                      <div key={s.n} style={{
                        padding:'14px 16px', borderRadius:14,
                        background:'var(--frame)', border:'1px solid var(--line)',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                          <div style={{
                            width:22, height:22, borderRadius:'50%', flexShrink:0,
                            background:'linear-gradient(135deg,#ff3d6e,#7a4dff)',
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
                    fontFamily:'monospace', fontSize:10.5, color:'#1D9E75', lineHeight:1.8,
                  }}>
                    <span style={{ opacity:0.6 }}>Expected output after step 2:</span><br/>
                    🧠 Neural Brain Tumor Analysis API<br/>
                    &nbsp;&nbsp;&nbsp;Classification : ✅ ResNet-50 loaded (cpu)<br/>
                    &nbsp;&nbsp;&nbsp;Segmentation&nbsp;&nbsp; : ✅ MONAI UNet loaded (cpu)<br/>
                    &nbsp;&nbsp;&nbsp;Endpoint&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : http://localhost:5001/analyze
                  </div>
                </>
              )}
            </div>

            {/* Retry button */}
            <button
              onClick={async () => {
                setServerOk(null);
                try {
                  const r = await fetch('/api/brain-scan', { cache:'no-store' });
                  const d = await r.json();
                  setServerOk(!!d.classification);
                } catch { setServerOk(false); }
              }}
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

        {/* ── Upload (server confirmed online, no file yet) ── */}
        {serverOk === true && !file && !scanning && !results && !error && (
          <motion.div key="upload" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:28 }}>
              {[
                { icon:'🧠', title:'4 Tumor Classes', sub:'Glioma · Meningioma · Pituitary · None', color:'#ff3d6e' },
                { icon:'🎯', title:'Segmentation',    sub:'Exact tumor region highlighted',          color:'#7a4dff' },
                { icon:'📊', title:'Confidence Score',sub:'Per-class probability breakdown',         color:'#22c55e' },
                { icon:'⚡', title:'Real-time AI',    sub:'ResNet-50 + MONAI UNet models',           color:'#f59e0b' },
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
          <motion.div key="preview" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}
          >
            <div style={{
              position:'relative', width:320, height:320, borderRadius:18,
              overflow:'hidden', border:'1px solid var(--line)', background:'#000',
            }}>
              <img src={preview} alt="preview"
                style={{ width:'100%', height:'100%', objectFit:'contain', filter:'brightness(0.82)' }} />
              <div className="ai-scan" style={{ position:'absolute', inset:0 }} />
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  position:'absolute', width:18, height:18,
                  borderColor:'rgba(255,61,110,0.75)', borderStyle:'solid', borderWidth:0,
                  ...(i===0?{top:8,left:8,borderTopWidth:2,borderLeftWidth:2}
                    :i===1?{top:8,right:8,borderTopWidth:2,borderRightWidth:2}
                    :i===2?{bottom:8,left:8,borderBottomWidth:2,borderLeftWidth:2}
                    :{bottom:8,right:8,borderBottomWidth:2,borderRightWidth:2}),
                }} />
              ))}
            </div>
            <p style={{ fontSize:12, color:'var(--ink-3)' }}>
              {file.name} · {(file.size/1024).toFixed(0)} KB
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
                background: serverOk !== true ? 'var(--line)' : 'linear-gradient(135deg,#ff3d6e,#7a4dff)',
                color: serverOk !== true ? 'var(--ink-3)' : '#fff',
                fontSize:12, fontWeight:700, transition:'all 0.2s',
              }}>
                {serverOk === null ? 'Checking server…' : serverOk ? 'Analyze Scan →' : 'Server Offline'}
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
          <motion.div key="error" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
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
                background: serverOk !== true ? 'var(--line)' : 'linear-gradient(135deg,#ff3d6e,#7a4dff)',
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
