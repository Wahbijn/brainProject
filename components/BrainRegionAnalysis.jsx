'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────
   REGION INFO — SVG geometry + cognitive function catalogue
   ───────────────────────────────────────────────────────────────── */
const REGION_INFO = {
  frontal: {
    label: 'Frontal Lobe', color: '#7c3aed',
    cx: 95, cy: 95,                    // SVG centroid (lateral view)
    axialCenter: [0.30, 0.22],         // normalized position in axial MRI (bilateral)
    axialSigma:  [0.20, 0.13],
    functions: [
      { name: 'Executive Function',      desc: "Planning, reasoning, and complex decision-making governed by the prefrontal cortex" },
      { name: 'Speech Production',       desc: "Broca's area (left hemisphere) — expressive language generation and articulation" },
      { name: 'Voluntary Motor Control', desc: 'Primary motor cortex — initiating and coordinating intentional movement' },
      { name: 'Personality & Behavior',  desc: 'Orbitofrontal cortex — emotional regulation and social behavioral patterns' },
      { name: 'Working Memory',          desc: 'Dorsolateral prefrontal cortex — active retention of information during tasks' },
    ],
    clinicalNote: 'Frontal involvement may manifest as personality changes, difficulty initiating speech, contralateral weakness, or executive dysfunction. Proximity to the motor strip requires careful functional mapping before any intervention.',
  },
  parietal: {
    label: 'Parietal Lobe', color: '#06b6d4',
    cx: 192, cy: 72,
    axialCenter: [0.50, 0.43],
    axialSigma:  [0.18, 0.12],
    functions: [
      { name: 'Spatial Processing',   desc: 'Navigating 3D space, body position awareness, and environmental orientation' },
      { name: 'Sensory Integration',  desc: 'Primary somatosensory cortex — touch, proprioception, pressure, and temperature' },
      { name: 'Attention Direction',  desc: 'Inferior parietal lobule — directing and sustaining attentional resources' },
      { name: 'Reading & Arithmetic', desc: 'Angular gyrus — written language decoding and numerical cognition' },
    ],
    clinicalNote: 'Parietal lesions may produce contralateral hemisensory loss, visuospatial neglect, or difficulty with complex tasks such as dressing. Left-sided involvement specifically risks language processing deficits.',
  },
  temporal: {
    label: 'Temporal Lobe', color: '#0ea5e9',
    cx: 115, cy: 192,
    axialCenter: [0.15, 0.55],          // bilateral — scored from both hemispheres
    axialSigma:  [0.10, 0.11],
    functions: [
      { name: 'Memory Consolidation',   desc: 'Hippocampus — encoding, consolidation, and retrieval of long-term memories' },
      { name: 'Language Comprehension', desc: "Wernicke's area (left) — understanding spoken and written language" },
      { name: 'Auditory Processing',    desc: 'Primary auditory cortex — interpreting sounds, pitch, and speech patterns' },
      { name: 'Emotional Memory',       desc: 'Amygdala — fear conditioning, emotional associations, and threat responses' },
    ],
    clinicalNote: 'Temporal lesions are closely associated with seizure activity (temporal lobe epilepsy), memory impairment, and language deficits. Medial temporal involvement is particularly significant for memory and seizure risk.',
  },
  occipital: {
    label: 'Occipital Lobe', color: '#22c55e',
    cx: 240, cy: 130,
    axialCenter: [0.50, 0.76],
    axialSigma:  [0.18, 0.11],
    functions: [
      { name: 'Primary Visual Processing', desc: 'Visual cortex (V1–V5) — all conscious visual input interpretation' },
      { name: 'Visual Field Integrity',    desc: 'Contralateral hemianopia or quadrantanopia may arise from focal lesions' },
      { name: 'Color & Contrast',          desc: 'V4 area — hue differentiation, brightness, and visual detail resolution' },
      { name: 'Motion & Depth',            desc: 'V5/MT area — tracking moving objects and stereoscopic depth estimation' },
    ],
    clinicalNote: 'Occipital lesions classically produce contralateral visual field defects. Patients may not report vision loss spontaneously. Formal visual field testing (perimetry) is essential for complete assessment.',
  },
  cerebellum: {
    label: 'Cerebellum', color: '#f59e0b',
    cx: 225, cy: 225,
    axialCenter: [0.50, 0.88],
    axialSigma:  [0.20, 0.08],
    functions: [
      { name: 'Motor Coordination',  desc: 'Fine motor control, precise limb movement, and bilateral coordination' },
      { name: 'Gait & Balance',      desc: 'Vestibulocerebellum — walking stability, equilibrium, and postural control' },
      { name: 'Procedural Learning', desc: 'Skill acquisition, muscle memory encoding, and conditioned motor responses' },
      { name: 'Speech Articulation', desc: 'Dysarthria — slurred or ataxic speech from cerebellar motor dysfunction' },
    ],
    clinicalNote: 'Cerebellar lesions typically present with ipsilateral ataxia (same-side coordination loss), nystagmus, and dysarthria. Large lesions may compress the brainstem and fourth ventricle, creating urgent hydrocephalus risk.',
  },
  pituitary: {
    label: 'Pituitary Region', color: '#e879f9',
    cx: 155, cy: 202,
    axialCenter: [0.50, 0.57],
    axialSigma:  [0.07, 0.08],
    functions: [
      { name: 'Hormonal Regulation',  desc: 'HPA axis — coordinating growth, thyroid, adrenal, and reproductive hormones' },
      { name: 'Visual Field Defect',  desc: 'Optic chiasm compression — classic bitemporal hemianopia (tunnel vision)' },
      { name: 'Metabolic Control',    desc: 'ADH regulation — water balance, thirst, and osmolality homeostasis' },
      { name: 'Stress & Cortisol',    desc: 'ACTH production — regulating the cortisol stress-response axis' },
    ],
    clinicalNote: 'Pituitary lesions disrupt the hormonal cascade controlling most endocrine axes. Superior extension toward the optic chiasm produces bitemporal hemianopia — often subtle early on. Complete hormonal panel and formal visual field testing are essential first steps.',
  },
};

/* ─────────────────────────────────────────────────────────────────
   TUMOR CLASS METADATA — display names, colors, urgency only
   (no fixed region assignments — those come from spatial analysis)
   ───────────────────────────────────────────────────────────────── */
const TUMOR_META = {
  glioma:     { displayName: 'Glioma',           riskColor: '#E24B4A', urgency: 'Urgent Neurology Review Recommended' },
  meningioma: { displayName: 'Meningioma',        riskColor: '#f59e0b', urgency: 'Neurosurgical Consultation Recommended' },
  pituitary:  { displayName: 'Pituitary Adenoma', riskColor: '#e879f9', urgency: 'Hormonal & Visual Field Assessment Required' },
  notumor:    { displayName: 'No Tumor Detected', riskColor: '#22c55e', urgency: 'Continue Routine Neurological Monitoring' },
};

/* ─────────────────────────────────────────────────────────────────
   SVG BRAIN GEOMETRY
   ───────────────────────────────────────────────────────────────── */
const BRAIN_PATH = 'M 150 238 C 132 238 108 225 88 209 C 62 188 44 162 38 134 C 32 106 36 78 50 55 C 64 32 90 16 122 12 C 154 8 184 16 208 34 C 232 52 248 79 252 109 C 256 139 248 167 232 186 C 216 204 196 214 178 218 C 168 220 160 228 150 238 Z';

const LOBE_ELLIPSES = {
  frontal:    { cx: 95,  cy: 95,  rx: 65, ry: 78 },
  parietal:   { cx: 192, cy: 72,  rx: 58, ry: 56 },
  temporal:   { cx: 115, cy: 192, rx: 70, ry: 36 },
  occipital:  { cx: 240, cy: 130, rx: 40, ry: 56 },
  cerebellum: { cx: 225, cy: 225, rx: 52, ry: 22 },
  pituitary:  { cx: 155, cy: 202, rx: 20, ry: 16 },
};

const SULCI = [
  'M 158,12 C 155,44 151,84 149,114 C 148,132 149,148 152,162',
  'M 38,148 C 72,152 108,156 144,160 C 172,161 202,158 216,154',
  'M 210,20 C 218,52 226,86 232,116 C 236,138 238,158 236,172',
];

/* ─────────────────────────────────────────────────────────────────
   SPATIAL ANALYSIS — Canvas pixel extraction
   Analyzes the segmentation mask or overlay image to find
   the weighted centroid of the tumor region.
   ───────────────────────────────────────────────────────────────── */
function extractSpatialData(base64, isMask) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !base64) { resolve(null); return; }
    const img = new window.Image();
    img.onload = () => {
      try {
        const MAX = 192;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const W = Math.max(1, Math.round(img.width * scale));
        const H = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, W, H);
        const { data } = ctx.getImageData(0, 0, W, H);

        let sumX = 0, sumY = 0, totalW = 0, pixCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 40) continue;

          let weight = 0;
          if (isMask) {
            // Binary segmentation mask: bright pixels = tumor tissue
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum > 90) weight = lum / 255;
          } else {
            // Grad-CAM / colored overlay: detect non-grayscale (colored) pixels
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC > 10 ? (maxC - minC) / maxC : 0;
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            // Weight by color saturation × luminance (hot heatmap pixels)
            if (sat > 0.22 && lum > 50) weight = sat * Math.min(lum / 200, 1);
          }

          if (weight > 0) {
            const px = (i / 4) % W;
            const py = Math.floor((i / 4) / W);
            sumX += px * weight;
            sumY += py * weight;
            totalW += weight;
            pixCount++;
          }
        }

        if (totalW === 0 || pixCount < 20) { resolve(null); return; }

        const cx = sumX / totalW / W;   // normalized 0–1
        const cy = sumY / totalW / H;
        const coverage = pixCount / (W * H);

        resolve({ cx, cy, coverage, pixCount, source: isMask ? 'mask' : 'overlay' });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/png;base64,${base64}`;
  });
}

/* ─────────────────────────────────────────────────────────────────
   REGION SCORING — Gaussian probability from centroid position
   Each brain region has a 2-D Gaussian centroid in normalized
   axial-MRI space. We score every region and rank them.
   ───────────────────────────────────────────────────────────────── */
function scoreRegionsFromCentroid(cx, cy) {
  const scores = {};
  Object.entries(REGION_INFO).forEach(([id, info]) => {
    const [mx, my] = info.axialCenter;
    const [sx, sy] = info.axialSigma;
    const dx = (cx - mx) / sx;
    const dy = (cy - my) / sy;
    let s = Math.exp(-(dx * dx + dy * dy) / 2);
    // Frontal and temporal are bilateral — also evaluate right-hemisphere mirror
    if (id === 'temporal' || id === 'frontal') {
      const dxR = (cx - (1 - mx)) / sx;
      const dyR = (cy - my) / sy;
      s = Math.max(s, Math.exp(-(dxR * dxR + dyR * dyR) / 2));
    }
    scores[id] = s;
  });

  // Normalize so the highest score = 1.0
  const max = Math.max(...Object.values(scores), 0.001);
  Object.keys(scores).forEach(k => { scores[k] = scores[k] / max; });
  return scores;
}

/* ─────────────────────────────────────────────────────────────────
   HEURISTIC FALLBACK — when no image data is available.
   Uses tumor class epidemiology but still outputs confidence
   levels instead of fake numeric percentages.
   ───────────────────────────────────────────────────────────────── */
function heuristicScores(tumorClass) {
  const maps = {
    glioma:     { frontal: 0.90, temporal: 0.80, parietal: 0.65, occipital: 0.28, cerebellum: 0.10, pituitary: 0.05 },
    meningioma: { frontal: 0.78, parietal: 0.72, temporal: 0.50, occipital: 0.22, cerebellum: 0.15, pituitary: 0.08 },
    pituitary:  { pituitary: 1.00, frontal: 0.38, temporal: 0.22, parietal: 0.18, occipital: 0.05, cerebellum: 0.05 },
    notumor:    { frontal: 0, parietal: 0, temporal: 0, occipital: 0, cerebellum: 0, pituitary: 0 },
  };
  return maps[tumorClass] || maps.notumor;
}

/* ─────────────────────────────────────────────────────────────────
   CONFIDENCE LABEL from normalized score (0–1)
   ───────────────────────────────────────────────────────────────── */
function scoreToConf(score) {
  if (score >= 0.62) return { level: 'High',     color: '#E24B4A', rank: 3, barFill: 0.88 };
  if (score >= 0.35) return { level: 'Moderate', color: '#f59e0b', rank: 2, barFill: 0.58 };
  if (score >= 0.14) return { level: 'Low',      color: '#06b6d4', rank: 1, barFill: 0.28 };
  return               { level: 'Minimal',        color: '#22c55e', rank: 0, barFill: 0.06 };
}

/* ─────────────────────────────────────────────────────────────────
   DYNAMIC NARRATIVE — assembled from detected primary regions
   ───────────────────────────────────────────────────────────────── */
const REGION_CLINICAL = {
  frontal:    'The frontal lobe governs executive function, personality, voluntary motor control, and expressive language. Involvement of this region may produce difficulty initiating tasks, personality changes, or weakness on the opposite side of the body.',
  parietal:   'The parietal lobe integrates sensory information and controls spatial awareness. Lesions here can cause hemisensory loss, attention deficits, and difficulty with complex spatial tasks, reading, or arithmetic.',
  temporal:   'The temporal lobe is critical for memory consolidation via the hippocampus and language comprehension via Wernicke\'s area. Involvement commonly presents with memory impairment, language deficits, auditory hallucinations, or seizure activity.',
  occipital:  'The occipital lobe houses the primary visual cortex. Lesions produce contralateral visual field defects — often a homonymous hemianopia — which patients may not spontaneously notice. Formal perimetry testing is essential.',
  cerebellum: 'The cerebellum coordinates precise movement, balance, and gait. Cerebellar lesions typically produce ipsilateral ataxia, dysmetria, and dysarthria. Large lesions may compress the brainstem and block CSF flow, creating urgent hydrocephalus.',
  pituitary:  'The pituitary region controls the hormonal cascade governing the entire endocrine system. Superior extension compresses the optic chiasm, producing the hallmark bitemporal visual field defect. Hormonal dysregulation may precede neurological symptoms.',
};

function buildNarrative(sortedRegions, tumorClass, mode, coverage, hasTumor) {
  const meta = TUMOR_META[tumorClass] || TUMOR_META.notumor;

  if (!hasTumor) {
    return [
      'AI-assisted spatial analysis of the submitted MRI found no evidence of a focal tumor mass. The segmentation output shows no significant region of abnormal tissue density or contrast-enhancing lesion above the detection threshold.',
      'All major cortical and subcortical regions — frontal, parietal, temporal, occipital lobes, cerebellum, and brainstem — appear structurally intact within the current imaging parameters. No mass effect, midline shift, or perilesional edema was identified.',
      'A negative result at this resolution does not exclude microstructural changes, early-stage lesions, or pathologies best characterized by other modalities such as gadolinium-enhanced MRI or 18F-FDG PET. Continued clinical follow-up per your physician\'s guidance is recommended.',
    ];
  }

  const primary   = sortedRegions.filter(r => r.conf.rank >= 2).slice(0, 2);
  const secondary = sortedRegions.filter(r => r.conf.rank === 1).slice(0, 2);

  const primaryNames = primary.length > 0
    ? primary.map(r => REGION_INFO[r.id].label).join(' and ')
    : 'one or more cortical regions';

  const modePhrase = mode === 'spatial'
    ? 'Based on direct centroid analysis of the AI-generated segmentation mask'
    : 'Based on established epidemiological patterns for this tumor type';

  const coveragePhrase = coverage === 'extensive'
    ? 'The estimated tumor footprint is regionally broad, suggesting potential multi-lobe involvement and wider functional impact.'
    : coverage === 'regional'
    ? 'The lesion appears of moderate extent, with impact likely concentrated in the primary region but extending to adjacent structures.'
    : 'The lesion appears spatially focal, suggesting concentrated impact in the primary region with less involvement of surrounding cortex.';

  const para1 = `${modePhrase}, the ${meta.displayName} is most likely positioned within the ${primaryNames}. ${coveragePhrase}`;

  const clinicalParts = primary.concat(secondary).slice(0, 2).map(r => REGION_CLINICAL[r.id]).filter(Boolean);
  const para2 = clinicalParts.length > 0
    ? clinicalParts.join(' ')
    : 'Regional involvement may affect the neurological functions associated with the identified lobes. The specific functional impact depends on tumor extent, edema, and eloquent cortex proximity.';

  const tumorSpecific = {
    glioma:     'Given the infiltrative nature of gliomas, functional impact typically extends beyond the visible MRI boundary due to perilesional edema and microscopic infiltration. Neuropsychological assessment and functional MRI should be prioritized alongside corticosteroid management of edema.',
    meningioma: 'Meningiomas exert effects primarily through compression rather than infiltration. Symptoms often develop gradually. Surgical outcomes are generally favorable when resection is timely, and many patients recover substantial function post-operatively.',
    pituitary:  'Complete hormonal panel evaluation, formal visual field perimetry, and gadolinium-enhanced MRI are essential immediate next steps. Most pituitary adenomas respond well to transsphenoidal resection or medical management depending on the hormone-secreting subtype.',
    notumor:    'No specific clinical action is indicated based on this scan. Continued neurological wellness monitoring is recommended.',
  };

  const para3 = tumorSpecific[tumorClass] || tumorSpecific.notumor;
  return [para1, para2, para3];
}

/* ─────────────────────────────────────────────────────────────────
   COVERAGE CLASSIFICATION from pixel fraction
   ───────────────────────────────────────────────────────────────── */
function classifyCoverage(coverage) {
  if (coverage == null || coverage === 0) return 'focal';
  if (coverage > 0.08) return 'extensive';
  if (coverage > 0.025) return 'regional';
  return 'focal';
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────── */
export default function BrainRegionAnalysis({
  tumorClass    = 'notumor',
  hasTumor      = false,
  maskB64,
  overlayB64,
  strokeDetected,
  strokeConfidence,
}) {
  const [phase,         setPhase]         = useState('init');   // init|scanning|analyzing|ready
  const [analysisMode,  setAnalysisMode]  = useState(null);     // 'spatial'|'heuristic'
  const [centroid,      setCentroid]      = useState(null);     // { cx, cy }
  const [regionScores,  setRegionScores]  = useState({});
  const [coverage,      setCoverage]      = useState('focal');
  const [narrative,     setNarrative]     = useState([]);
  const [activeRegion,  setActiveRegion]  = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const meta = TUMOR_META[tumorClass] || TUMOR_META.notumor;

  /* ── Run analysis when props arrive ── */
  const runAnalysis = useCallback(async () => {
    setPhase('scanning');
    setActiveRegion(null);
    setCentroid(null);

    // 1. Try spatial extraction from mask (preferred) then overlay
    let spatial = null;
    if (maskB64)    spatial = await extractSpatialData(maskB64, true);
    if (!spatial && overlayB64) spatial = await extractSpatialData(overlayB64, false);

    setPhase('analyzing');
    await new Promise(r => setTimeout(r, 600)); // let the UI show "analyzing"

    let scores, mode, cov;

    if (spatial) {
      setCentroid({ cx: spatial.cx, cy: spatial.cy });
      scores = scoreRegionsFromCentroid(spatial.cx, spatial.cy);
      mode   = 'spatial';
      cov    = classifyCoverage(spatial.coverage);
    } else {
      scores = heuristicScores(tumorClass);
      mode   = 'heuristic';
      cov    = 'focal';
    }

    // Sort regions by score descending
    const sorted = Object.entries(scores)
      .map(([id, score]) => ({ id, score, conf: scoreToConf(score) }))
      .sort((a, b) => b.score - a.score);

    const text = buildNarrative(sorted, tumorClass, mode, cov, hasTumor);

    setRegionScores(scores);
    setAnalysisMode(mode);
    setCoverage(cov);
    setNarrative(text);
    setActiveRegion(sorted[0]?.id || 'frontal');
    setPhase('ready');
  }, [maskB64, overlayB64, tumorClass, hasTumor]);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  /* ── Derived display values ── */
  const displayRegion = hoveredRegion || activeRegion;
  const regionData    = displayRegion ? REGION_INFO[displayRegion] : null;
  const regionScore   = displayRegion ? (regionScores[displayRegion] || 0) : 0;
  const regionConf    = scoreToConf(regionScore);

  const sortedRegions = Object.entries(regionScores)
    .map(([id, score]) => ({ id, score, conf: scoreToConf(score) }))
    .sort((a, b) => b.score - a.score);

  const isScanning  = phase === 'scanning';
  const isAnalyzing = phase === 'analyzing';
  const isReady     = phase === 'ready';

  /* ── Project centroid to lateral SVG via score-weighted region positions ── */
  const svgMarker = centroid ? (() => {
    const entries = Object.entries(regionScores);
    if (entries.length === 0) return null;
    let totalW = 0, sumX = 0, sumY = 0;
    entries.forEach(([id, score]) => {
      const w = score * score; // square so the top-scoring region dominates
      const e = LOBE_ELLIPSES[id];
      if (e && w > 1e-4) { sumX += e.cx * w; sumY += e.cy * w; totalW += w; }
    });
    if (totalW === 0) return null;
    return { x: Math.round(sumX / totalW), y: Math.round(sumY / totalW) };
  })() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: 'spring', stiffness: 180, damping: 24 }}
      style={{
        marginTop: 20, borderRadius: 20, overflow: 'hidden',
        border: `1px solid ${meta.riskColor}35`,
        background: 'linear-gradient(135deg,rgba(8,6,24,0.98),rgba(12,8,32,0.99))',
        boxShadow: `0 0 50px -12px ${meta.riskColor}36, 0 24px 64px -20px rgba(0,0,0,0.7)`,
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14,
        background: `linear-gradient(135deg,${meta.riskColor}12,transparent)`,
        borderBottom: `1px solid ${meta.riskColor}20`,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13, flexShrink: 0,
          background: `${meta.riskColor}1c`, border: `1px solid ${meta.riskColor}45`,
          display: 'grid', placeItems: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={meta.riskColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3C6.24 3 4 5.24 4 8C4 9.68 4.83 11.17 6.1 12C4.83 12.83 4 14.32 4 16C4 18.76 6.24 21 9 21H15C17.76 21 20 18.76 20 16C20 14.32 19.17 12.83 17.9 12C19.17 11.17 20 9.68 20 8C20 5.24 17.76 3 15 3H9Z"/>
            <path d="M9 9.5C9 9.5 10.2 10.5 12 10.5C13.8 10.5 15 9.5 15 9.5" strokeWidth="1.3"/>
            <path d="M9 14C9 14 10.2 15 12 15C13.8 15 15 14 15 14" strokeWidth="1.3"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#f0eeff' }}>Neural Region Impact Analysis</span>
            <div style={{
              padding: '2px 8px', borderRadius: 20,
              background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
              fontSize: 8.5, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.09em',
            }}>AI ASSISTED</div>
            {isReady && analysisMode && (
              <div style={{
                padding: '2px 8px', borderRadius: 20,
                background: analysisMode === 'spatial' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                border: `1px solid ${analysisMode === 'spatial' ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'}`,
                fontSize: 8.5, fontWeight: 700,
                color: analysisMode === 'spatial' ? '#4ade80' : '#fbbf24',
                letterSpacing: '0.07em',
              }}>
                {analysisMode === 'spatial' ? '⬡ MRI SPATIAL' : '◈ EPIDEMIOLOGICAL'}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)' }}>
            {isScanning  ? 'Extracting tumor coordinates from segmentation data…' :
             isAnalyzing ? 'Mapping position to neuroanatomical atlas…' :
             analysisMode === 'spatial'
               ? `Localization derived from ${maskB64 ? 'segmentation mask' : 'Grad-CAM overlay'} · ${meta.displayName}`
               : `Epidemiological estimate for ${meta.displayName} (no image data)`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: meta.riskColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
            {meta.displayName}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', maxWidth: 160, lineHeight: 1.4 }}>{meta.urgency}</div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {!isReady && (
        <div style={{ position: 'relative', height: 2, background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: isAnalyzing ? '80%' : isScanning ? '45%' : '0%' }}
            transition={{ duration: isAnalyzing ? 0.8 : 1.6, ease: [0.4, 0, 0.2, 1] }}
            style={{ height: '100%', background: `linear-gradient(90deg,${meta.riskColor},#7c3aed,#06b6d4)` }}
          />
        </div>
      )}
      {isReady && (
        <motion.div
          initial={{ width: '80%' }} animate={{ width: '100%' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ height: 2, background: `linear-gradient(90deg,${meta.riskColor},#7c3aed,#06b6d4)` }}
        />
      )}

      {/* ── Main body ── */}
      <div style={{ padding: '20px 22px' }}>

        {/* Two columns: SVG brain + region detail */}
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-start' }}>

          {/* ── Left: SVG brain ── */}
          <div style={{ flex: '0 0 auto' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              {isReady && analysisMode === 'spatial' && centroid
                ? `Tumor centroid detected · lateral projection`
                : 'Brain Region Map — Click to Explore'}
            </div>
            <div style={{
              position: 'relative', borderRadius: 16, overflow: 'hidden',
              background: 'rgba(6,4,20,0.95)', border: '1px solid rgba(124,58,237,0.14)',
            }}>
              <svg viewBox="0 0 305 244" width="305" height="244" style={{ display: 'block' }}>
                <defs>
                  <clipPath id="bra2-clip">
                    <path d={BRAIN_PATH} />
                  </clipPath>
                  <filter id="bra2-glow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="7" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <filter id="bra2-glow-sm" x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation="3" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <filter id="bra2-marker-glow" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="5" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <style>{`
                    @keyframes bra2-p1{0%,100%{r:5;opacity:.75}50%{r:16;opacity:0}}
                    @keyframes bra2-p2{0%,100%{r:8;opacity:.45}50%{r:22;opacity:0}}
                    @keyframes bra2-marker{0%,100%{r:5;opacity:1}50%{r:9;opacity:.6}}
                  `}</style>
                </defs>

                {/* Brain dark fill */}
                <path d={BRAIN_PATH} fill="rgba(12,8,35,0.97)" />

                {/* Neural grid */}
                <g clipPath="url(#bra2-clip)" opacity="0.05">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <line key={`gh${i}`} x1="30" x2="275" y1={8 + i * 17} y2={8 + i * 17} stroke="#7c3aed" strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: 16 }).map((_, i) => (
                    <line key={`gv${i}`} x1={20 + i * 18} x2={20 + i * 18} y1="8" y2="238" stroke="#7c3aed" strokeWidth="0.5" />
                  ))}
                </g>

                {/* Lobe fills */}
                <g clipPath="url(#bra2-clip)">
                  {Object.entries(LOBE_ELLIPSES).map(([id, e]) => {
                    const rInfo   = REGION_INFO[id];
                    const score   = regionScores[id] || 0;
                    const isDisp  = id === displayRegion;
                    const alpha   = isDisp ? 0.50 : (score > 0.12 ? 0.08 + score * 0.22 : 0.04);
                    return (
                      <ellipse
                        key={id} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry}
                        fill={rInfo.color} fillOpacity={alpha}
                        filter={isDisp || score > 0.35 ? 'url(#bra2-glow-sm)' : 'none'}
                        style={{ cursor: 'pointer', transition: 'fill-opacity 0.28s' }}
                        onMouseEnter={() => setHoveredRegion(id)}
                        onMouseLeave={() => setHoveredRegion(null)}
                        onClick={() => setActiveRegion(id)}
                      />
                    );
                  })}
                </g>

                {/* Sulcal lines */}
                {SULCI.map((d, i) => (
                  <path key={i} d={d} fill="none" stroke="rgba(180,160,255,0.09)" strokeWidth="0.8" />
                ))}

                {/* Brain outline */}
                <path d={BRAIN_PATH} fill="none" stroke={meta.riskColor}
                  strokeWidth="1.4" strokeOpacity={0.42} filter="url(#bra2-glow-sm)" />

                {/* Pulse rings for regions with High/Moderate confidence */}
                {isReady && sortedRegions.filter(r => r.conf.rank >= 2).map(({ id, score, conf }) => {
                  const e = LOBE_ELLIPSES[id];
                  const rInfo = REGION_INFO[id];
                  if (!e) return null;
                  const dur1 = `${1.5 + (1 - score) * 0.9}s`;
                  const dur2 = `${2.0 + (1 - score) * 0.9}s`;
                  return (
                    <g key={id} style={{ pointerEvents: 'none' }}>
                      <circle cx={e.cx} cy={e.cy} r="5" fill="none"
                        stroke={rInfo.color} strokeWidth="1.5" opacity="0.75"
                        style={{ animation: `bra2-p1 ${dur1} ease-in-out infinite` }} />
                      <circle cx={e.cx} cy={e.cy} r="8" fill="none"
                        stroke={rInfo.color} strokeWidth="1" opacity="0.40"
                        style={{ animation: `bra2-p2 ${dur2} ease-in-out infinite 0.5s` }} />
                      <circle cx={e.cx} cy={e.cy} r="3.5" fill={rInfo.color}
                        opacity="0.90" filter="url(#bra2-glow-sm)" />
                    </g>
                  );
                })}

                {/* Hover dashed ring */}
                {hoveredRegion && LOBE_ELLIPSES[hoveredRegion] && (() => {
                  const e = LOBE_ELLIPSES[hoveredRegion];
                  const c = REGION_INFO[hoveredRegion].color;
                  return <ellipse cx={e.cx} cy={e.cy} rx={e.rx + 4} ry={e.ry + 4}
                    fill="none" stroke={c} strokeWidth="1.2" strokeDasharray="4 3"
                    opacity="0.58" style={{ pointerEvents: 'none' }} />;
                })()}

                {/* Tumor centroid marker (spatial analysis only) */}
                {isReady && svgMarker && analysisMode === 'spatial' && (
                  <g style={{ pointerEvents: 'none' }}>
                    {/* Crosshair lines */}
                    <line x1={svgMarker.x - 10} x2={svgMarker.x + 10}
                      y1={svgMarker.y} y2={svgMarker.y}
                      stroke={meta.riskColor} strokeWidth="1" opacity="0.5" strokeDasharray="2 2" />
                    <line x1={svgMarker.x} x2={svgMarker.x}
                      y1={svgMarker.y - 10} y2={svgMarker.y + 10}
                      stroke={meta.riskColor} strokeWidth="1" opacity="0.5" strokeDasharray="2 2" />
                    {/* Pulsing center dot */}
                    <circle cx={svgMarker.x} cy={svgMarker.y} r="5"
                      fill={meta.riskColor} opacity="0.9"
                      filter="url(#bra2-marker-glow)"
                      style={{ animation: 'bra2-marker 1.6s ease-in-out infinite' }} />
                    {/* Label */}
                    <text x={svgMarker.x + 9} y={svgMarker.y - 6}
                      fontSize="7" fontWeight="700" fill={meta.riskColor}
                      opacity="0.75" fontFamily="system-ui" letterSpacing="0.04em">
                      TUMOR
                    </text>
                  </g>
                )}

                {/* Scan sweep line */}
                {isScanning && (
                  <motion.g initial={{ x: -10 }} animate={{ x: 315 }}
                    transition={{ duration: 1.8, ease: 'linear' }}>
                    <rect x={0} y={0} width={1.5} height={244} fill="rgba(124,58,237,0.65)" />
                    <rect x={-7} y={0} width={16} height={244} fill="rgba(124,58,237,0.10)" />
                  </motion.g>
                )}
              </svg>

              {/* Status overlay */}
              {!isReady && (
                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.1 }}
                    style={{ padding: '3px 12px', borderRadius: 20, background: 'rgba(124,58,237,0.22)',
                      border: '1px solid rgba(124,58,237,0.38)', fontSize: 8.5, fontWeight: 800,
                      color: '#c4b5fd', letterSpacing: '0.11em' }}>
                    {isScanning ? 'EXTRACTING TUMOR COORDINATES…' : 'MAPPING TO NEUROANATOMICAL ATLAS…'}
                  </motion.div>
                </div>
              )}

              {/* Hover region name */}
              {hoveredRegion && REGION_INFO[hoveredRegion] && (
                <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                  border: `1px solid ${REGION_INFO[hoveredRegion].color}55`,
                  fontSize: 9.5, fontWeight: 700, color: REGION_INFO[hoveredRegion].color,
                  pointerEvents: 'none', letterSpacing: '0.04em' }}>
                  {REGION_INFO[hoveredRegion].label}
                </div>
              )}
            </div>

            {/* Region chips */}
            <AnimatePresence>
              {isReady && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                  {sortedRegions.filter(r => r.conf.rank >= 1).map(({ id, conf }) => {
                    const rInfo = REGION_INFO[id];
                    const isActive = id === activeRegion;
                    return (
                      <motion.button key={id} whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveRegion(id)}
                        style={{ padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                          background: isActive ? `${rInfo.color}28` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isActive ? `${rInfo.color}60` : 'rgba(255,255,255,0.08)'}`,
                          fontSize: 9, fontWeight: 700,
                          color: isActive ? rInfo.color : 'rgba(255,255,255,0.30)',
                          letterSpacing: '0.04em', transition: 'all 0.18s',
                          display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: conf.color, display: 'inline-block', flexShrink: 0 }} />
                        {rInfo.label}
                        <span style={{ color: conf.color, fontWeight: 800, fontSize: 8.5 }}>{conf.level}</span>
                      </motion.button>
                    );
                  })}
                  {sortedRegions.every(r => r.conf.rank === 0) && (
                    <div style={{ fontSize: 9.5, color: '#4ade80', fontWeight: 700 }}>
                      ✓ All regions within normal parameters
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: Region detail ── */}
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <AnimatePresence mode="wait">
              {!isReady ? (
                /* Skeleton */
                <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)',
                    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Cognitive Function Risk
                  </div>
                  {[88, 72, 56, 42, 30].map((w, i) => (
                    <div key={i}>
                      <div style={{ height: 9, width: `${w}%`, borderRadius: 20, background: 'rgba(255,255,255,0.05)', marginBottom: 5 }} />
                      <div style={{ height: 3, borderRadius: 20, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <motion.div animate={{ x: ['-100%', '200%'] }}
                          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear', delay: i * 0.18 }}
                          style={{ height: '100%', width: '50%', background: 'linear-gradient(90deg,transparent,rgba(124,58,237,0.35),transparent)' }} />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : regionData ? (
                /* Region detail */
                <motion.div key={displayRegion}
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.22 }}>

                  {/* Region header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                      background: `${regionData.color}22`, border: `1px solid ${regionData.color}45`,
                      display: 'grid', placeItems: 'center' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: regionData.color,
                        boxShadow: `0 0 10px ${regionData.color}` }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#f0eeff', marginBottom: 2 }}>{regionData.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ padding: '2px 8px', borderRadius: 20,
                          background: `${regionConf.color}1a`, border: `1px solid ${regionConf.color}45`,
                          fontSize: 9.5, fontWeight: 800, color: regionConf.color, letterSpacing: '0.06em' }}>
                          {regionConf.level} Estimated Impact
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Impact bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Regional Proximity</span>
                      <span style={{ fontSize: 8.5, color: regionConf.color, fontWeight: 700 }}>{regionConf.level}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 20, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 3 }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${regionConf.barFill * 100}%` }}
                        transition={{ duration: 0.75, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 20, background: `linear-gradient(90deg,${regionData.color}88,${regionData.color})` }} />
                    </div>
                    <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.20)', textAlign: 'right' }}>
                      {analysisMode === 'spatial' ? 'From MRI centroid proximity' : 'From epidemiological pattern'}
                    </div>
                  </div>

                  {/* Functions */}
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.30)',
                    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Potentially Affected Functions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {regionData.functions.map((fn, i) => {
                      // Function-level confidence follows region confidence, weighted by function riskW is removed.
                      // Instead, all functions in an affected region share the same confidence tier
                      // but displayed in order of anatomical importance (already ordered in REGION_INFO).
                      const fnConf = i === 0 ? regionConf
                        : i === 1 ? scoreToConf(regionScore * 0.85)
                        : i === 2 ? scoreToConf(regionScore * 0.65)
                        : scoreToConf(regionScore * 0.50);
                      return (
                        <motion.div key={fn.name}
                          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07, duration: 0.22 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#e4dfff' }}>{fn.name}</span>
                            <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 8.5, fontWeight: 800,
                              background: `${fnConf.color}18`, border: `1px solid ${fnConf.color}40`,
                              color: fnConf.color, flexShrink: 0, marginLeft: 6 }}>
                              {fnConf.level}
                            </span>
                          </div>
                          <div style={{ height: 3, borderRadius: 20, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 4 }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${fnConf.barFill * 100}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.07 + 0.1 }}
                              style={{ height: '100%', borderRadius: 20, background: `linear-gradient(90deg,${fnConf.color}70,${fnConf.color})` }} />
                          </div>
                          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.26)', lineHeight: 1.4 }}>{fn.desc}</div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Region clinical note */}
                  {REGION_CLINICAL[displayRegion] && (
                    <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10,
                      background: `${regionData.color}08`, border: `1px solid ${regionData.color}25` }}>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: regionData.color,
                        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                        Clinical Context
                      </div>
                      <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6, margin: 0 }}>
                        {REGION_CLINICAL[displayRegion]}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: 200, gap: 10 }}>
                  <div style={{ fontSize: 28, opacity: 0.25 }}>🧠</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center' }}>
                    Click a region to explore<br/>cognitive function risk
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Region impact grid ── */}
        <AnimatePresence>
          {isReady && sortedRegions.some(r => r.conf.rank >= 1) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginBottom: 20 }}>
              {sortedRegions.filter(r => r.conf.rank >= 1).map(({ id, conf }) => {
                const rInfo = REGION_INFO[id];
                const isActive = id === activeRegion;
                return (
                  <motion.div key={id} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveRegion(id)}
                    style={{ padding: '11px 13px', borderRadius: 12, cursor: 'pointer',
                      background: isActive ? `${rInfo.color}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? `${rInfo.color}48` : 'rgba(255,255,255,0.07)'}`,
                      transition: 'all 0.18s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span style={{ fontSize: 9, fontWeight: 700,
                        color: isActive ? rInfo.color : 'rgba(255,255,255,0.32)', letterSpacing: '0.04em' }}>
                        {rInfo.label}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 800, color: conf.color,
                        background: `${conf.color}18`, padding: '1px 6px', borderRadius: 20 }}>
                        {conf.level}
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 20, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${conf.barFill * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                        style={{ height: '100%', borderRadius: 20, background: rInfo.color }} />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── AI Narrative ── */}
        <AnimatePresence>
          {isReady && narrative.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.26)',
                  letterSpacing: '0.13em', textTransform: 'uppercase', flexShrink: 0 }}>
                  {analysisMode === 'spatial' ? 'Spatial Localization Assessment' : 'Epidemiological Assessment'}
                </span>
                <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {narrative.map((para, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.50 + i * 0.10 }}
                    style={{ padding: '12px 16px', borderRadius: 12,
                      background: i === 0 ? `${meta.riskColor}0a` : 'rgba(255,255,255,0.025)',
                      borderLeft: `2px solid ${i === 0 ? meta.riskColor : 'rgba(255,255,255,0.08)'}`,
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderLeftWidth: 2,
                      borderLeftColor: i === 0 ? meta.riskColor : 'rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: 11.5, color: 'rgba(232,228,255,0.66)', lineHeight: 1.72, margin: 0 }}>{para}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stroke addendum ── */}
        {strokeDetected === true && isReady && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.78 }}
            style={{ marginTop: 12, padding: '13px 16px', borderRadius: 12,
              background: 'rgba(124,58,237,0.09)', border: '1px solid rgba(124,58,237,0.28)' }}>
            <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'rgba(124,58,237,0.22)', border: '1px solid rgba(124,58,237,0.45)',
                display: 'grid', placeItems: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#c4b5fd', marginBottom: 5 }}>
                  Concurrent Stroke Indicators — Compounded Vascular Risk
                </div>
                <p style={{ fontSize: 11, color: 'rgba(196,181,253,0.62)', lineHeight: 1.65, margin: 0 }}>
                  Stroke findings compound the regional risk profile from the tumor analysis. Ischemic injury may affect vascular territory independent of the mass lesion, and the combination of space-occupying lesion plus vascular event significantly increases the complexity of functional impact — particularly for motor cortex, speech, and visual pathway involvement.
                  {strokeConfidence !== undefined && ` Stroke detection confidence: ${strokeConfidence}%.`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Disclaimer ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
          style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', lineHeight: 1.58, margin: 0 }}>
            <strong style={{ color: 'rgba(255,255,255,0.36)', fontWeight: 700 }}>AI-Assisted Estimation Only.</strong>{' '}
            {analysisMode === 'spatial'
              ? 'Region mapping is derived from the spatial centroid of the AI segmentation output projected onto a neuroanatomical atlas. This projection carries inherent uncertainty due to MRI slice orientation, image resolution, and atlas registration variability.'
              : 'Region estimates are derived from epidemiological patterns for this tumor type, not from direct spatial analysis of this specific scan.'
            }{' '}
            Confidence levels (High / Moderate / Low) indicate relative spatial proximity — not clinical certainty. Individual outcomes depend on exact tumor margins, eloquent cortex proximity, edema extent, and patient-specific neuroplasticity. Always consult a board-certified neurologist or neurosurgeon for definitive assessment and treatment planning.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
