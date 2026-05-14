# Neural Region Impact Analysis
## Feature Documentation & Technical Breakdown

---

## What Was Built

After an AI brain scan detects a tumor, the platform now goes one step further:
instead of just showing **what** was found, it shows **where** it matters in the brain
and **what cognitive functions** could be affected.

The feature is a self-contained interactive panel that appears automatically after
every scan result — both in the doctor's scan tab and in the patient's report view.

---

## Files Involved

| Action   | File                                          | Role                                      |
|----------|-----------------------------------------------|-------------------------------------------|
| Created  | `components/BrainRegionAnalysis.jsx`          | The entire feature lives here (648 lines) |
| Modified | `components/BrainScanTab.jsx`                 | Added import + renders the panel after scan results |
| Modified | `app/dashboard/patient/page.jsx`              | Added import + renders the panel inside each expanded report card |

No new API routes, no backend changes, no database changes.
Everything is computed on the frontend from the tumor class string alone.

---

## What the Component Receives (Props)

```jsx
<BrainRegionAnalysis
  tumorClass="glioma"          // 'glioma' | 'meningioma' | 'pituitary' | 'notumor'
  tumorConfidence={87}         // number 0–100 (not used in display, reserved)
  hasTumor={true}              // boolean
  strokeDetected={false}       // boolean | undefined
  strokeConfidence={72}        // number 0–100 | undefined
/>
```

From these 5 props — with `tumorClass` being the most important — the component
derives everything else internally using its own data tables.

---

## How the Data Works (The Core Logic)

### Step 1 — Look up the tumor profile

Inside the component there is a constant called `TUMOR_PROFILES`.
It maps each tumor type to a fixed clinical profile:

```
glioma      →  High Risk (82/100)
                Affects: frontal 90%, temporal 80%, parietal 65%, occipital 30%
                3-paragraph clinical narrative

meningioma  →  Moderate Risk (61/100)
                Affects: frontal 75%, parietal 70%, temporal 50%, occipital 20%
                3-paragraph clinical narrative

pituitary   →  Moderate Risk (55/100)
                Affects: pituitary 100%, frontal 40%, temporal 25%
                3-paragraph clinical narrative

notumor     →  Minimal Risk (8/100)
                No affected regions
                3-paragraph "all clear" narrative
```

These percentages come from established neurology / neuro-oncology knowledge
about where each tumor type typically appears and which lobes it tends to compress
or infiltrate.

### Step 2 — Look up region functions

There is a second constant called `REGION_INFO`.
It maps each brain region to a list of cognitive functions with a `riskW` weight:

```
frontal:
  Executive Function    riskW: 1.00
  Personality           riskW: 0.85
  Speech (Broca's)      riskW: 0.75
  Motor Control         riskW: 0.70
  Working Memory        riskW: 0.60

temporal:
  Memory Consolidation  riskW: 1.00  ← Hippocampus
  Language Comprehension riskW: 0.90  ← Wernicke's area
  Auditory Processing   riskW: 0.75
  Emotional Memory      riskW: 0.80  ← Amygdala

parietal:
  Spatial Processing    riskW: 1.00
  Sensory Integration   riskW: 0.90
  Attention Control     riskW: 0.75
  Reading & Arithmetic  riskW: 0.65

occipital:
  Visual Processing     riskW: 1.00
  Color Recognition     riskW: 0.80
  Depth Perception      riskW: 0.70
  Motion Detection      riskW: 0.65

cerebellum:
  Motor Coordination    riskW: 1.00
  Gait & Posture        riskW: 0.90
  Procedural Learning   riskW: 0.65

pituitary:
  Hormonal Regulation   riskW: 1.00  ← HPA axis
  Visual Fields         riskW: 0.90  ← Optic chiasm compression
  Metabolic Control     riskW: 0.75
  Stress Response       riskW: 0.70
```

### Step 3 — Calculate per-function risk score

For each function inside the active region:

```
functionRisk = regionRisk × functionRiskWeight × 100
```

Example — glioma, frontal lobe selected:
```
regionRisk = 0.90  (from TUMOR_PROFILES)

Executive Function  = 0.90 × 1.00 × 100 = 90%  → RED
Personality         = 0.90 × 0.85 × 100 = 77%  → RED
Speech (Broca's)    = 0.90 × 0.75 × 100 = 68%  → AMBER
Motor Control       = 0.90 × 0.70 × 100 = 63%  → AMBER
Working Memory      = 0.90 × 0.60 × 100 = 54%  → AMBER
```

Color thresholds:
- `≥ 70%` → Red `#E24B4A`
- `≥ 45%` → Amber `#f59e0b`
- `≥ 20%` → Cyan `#06b6d4`
- `< 20%`  → Green `#22c55e`

---

## The SVG Brain Diagram

The brain visualization is a hand-crafted SVG with `viewBox="0 0 305 244"`.
It shows a **lateral (side) view** of the right hemisphere, anterior (front) on
the left, posterior (back) on the right — the standard anatomical orientation.

### Brain outline

One closed SVG `<path>` approximating the outer contour of the cortex:

```
Frontal pole (front-left) → curves over parietal (top) → down occipital (back-right)
→ under temporal (bottom) → back to brainstem (bottom-center)
```

### Lobe regions

Each lobe is an `<ellipse>` positioned at its approximate anatomical center,
clipped to the brain outline using SVG `clipPath`:

```
frontal    cx=95  cy=95   rx=65 ry=78   color: #7a4dff (purple)
parietal   cx=192 cy=72   rx=58 ry=56   color: #06b6d4 (cyan)
temporal   cx=115 cy=192  rx=70 ry=36   color: #ff3d6e (pink)
occipital  cx=240 cy=130  rx=40 ry=56   color: #22c55e (green)
cerebellum cx=225 cy=225  rx=52 ry=22   color: #f59e0b (amber)
pituitary  cx=155 cy=202  rx=20 ry=16   color: #e879f9 (fuchsia)
```

The ellipse `fillOpacity` scales with the region's risk value:
- Active/selected region → opacity 0.48 + glow filter
- Affected but not selected → 0.10 to 0.30 depending on risk score
- Unaffected → 0.05 (nearly invisible)

### Sulcal dividing lines

Three SVG `<path>` lines drawn on top of the lobe fills to suggest anatomical boundaries:
- **Central sulcus** — divides frontal from parietal
- **Lateral (Sylvian) sulcus** — separates temporal lobe from above
- **Parieto-occipital sulcus** — marks the parietal/occipital boundary

### Pulse animations

Affected regions (risk > 0.25) get two concentric `<circle>` rings that expand
and fade using CSS `@keyframes`. Higher risk = faster pulse animation.
A solid dot at the center marks the region hotspot.

### Scan-sweep on mount

When the panel first appears, a `motion.g` element (Framer Motion group) slides
horizontally across the entire SVG width (0 → 305px) over 2.1 seconds, creating
the "AI scanning" visual effect. After it completes, the results fade in.

---

## Animation Sequence

```
0 ms     Component mounts → scanning=true, ready=false
         SVG sweep line starts sliding left → right (2.1 s)
         Progress bar fills from 0% to 100% (2.1 s)
         Skeleton shimmer bars pulse in the right panel

2200 ms  scanning=false → sweep line gone, progress bar complete

2500 ms  ready=true → activeRegion set to highest-risk region
         Right panel: region detail fades in + risk bars animate from 0
         Region chips row fades in below the SVG
         Region grid cards animate in (staggered)
         AI narrative paragraphs fade up (staggered 0.1 s each)

~3500 ms Stroke addendum appears (if strokeDetected === true)
         Disclaimer fades in
```

---

## Libraries Used

| Library        | Why                                                         |
|----------------|-------------------------------------------------------------|
| `framer-motion`| `motion.div`, `motion.g`, `AnimatePresence`, `whileHover`, `whileTap`, animated `width`/`x` for bars and sweep line |
| `react`        | `useState`, `useEffect`, `AnimatePresence`                  |
| SVG (native)   | Brain diagram, lobe ellipses, clip path, glow filters       |
| CSS `@keyframes` | Pulse ring animations on affected region hotspots         |

No external charting library, no canvas, no image assets.
Everything is rendered with SVG primitives and CSS.

---

## Where It Renders

### In the Doctor's Scan Tab (`BrainScanTab.jsx`)

Flow: Doctor uploads MRI → Python AI runs → results arrive → `ScanResults` component renders:
```
ImgViewer (Grad-CAM + mask)
Tumor hero card + confidence ring
Class probability bars
Clinical description + treatment steps
StrokePanel
BrainRegionAnalysis   ← injected here, after stroke panel
Disclaimer
```

### In the Patient's Reports Tab (`patient/page.jsx`)

Flow: Patient opens Reports tab → clicks "View Full Report" on any scan card → expanded panel renders:
```
Scan images (overlay, mask, Grad-CAM)
Tumor + Stroke quick-summary cards
Classification breakdown bars
Doctor note
Segmentation pixel count
BrainRegionAnalysis   ← injected here, at the bottom of the expanded panel
```

---

## What Does NOT Change

- The Python AI server (`BrainTumor/brain_api.py`) — untouched
- The scan API route (`/api/brain-scan`) — untouched
- The `lib/auth.js` data layer — untouched
- The doctor's messaging scan flow — untouched
- The admin dashboard — untouched
- The AI Tips and Chatbot features — untouched

The feature is purely additive. It reads `tumorClass` from existing scan data
and produces its own output entirely on the client side.

---

## Summary

```
Input:   tumorClass string  (already known from the scan)
Process: TUMOR_PROFILES lookup → region risk weights
         REGION_INFO lookup   → per-function risk weights
         risk = regionRisk × functionWeight × 100
Output:  Interactive SVG brain + animated risk bars + clinical narrative
```

The component makes no network requests, stores no state outside itself,
and adds zero cost to the existing scan pipeline.
