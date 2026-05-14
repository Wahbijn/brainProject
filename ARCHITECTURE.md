# Neural Medical AI — Architecture Overview

---

## Tech Stack

### Frontend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | **Next.js** (App Router) | 14.2.5 |
| UI Library | **React** | 18.3.1 |
| Styling | **Tailwind CSS** | 3.4.7 |
| Animations | **Framer Motion** | 11.3.19 |
| PostCSS / Autoprefixer | Build tooling for CSS | 8.x |

### Backend
| Layer | Technology | Details |
|-------|-----------|---------|
| API Layer | **Next.js API Routes** | `/app/api/` — proxies requests to the Python server and external AI APIs |
| AI Server | **Flask** (Python) | Standalone server on port `5001`, handles all medical image AI inference |
| Cross-Origin | **Flask-CORS** | Allows the Next.js frontend to call the Python API |
| Health Tips AI | **Groq API** | `llama-3.3-70b-versatile` via `/api/ai-tips` — generates personalized patient health tips |

### AI / Machine Learning
| Model | Framework | Architecture | Task |
|-------|-----------|-------------|------|
| Brain Tumor classification | **PyTorch** | ResNet-50 | 4-class classification (glioma, meningioma, pituitary, no tumor) |
| Brain Tumor segmentation | **PyTorch + MONAI** | U-Net | Pixel-level tumor region segmentation |
| Brain Stroke detection | **TensorFlow / Keras** | MedVision ResNet-50 (dual-output) | Binary classification + bounding box + Grad-CAM heatmap |
| Health Tips generation | **Groq LLM** | llama-3.3-70b-versatile | Personalized stroke & tumor prevention tips (JSON structured output) |

### Database
> This project uses **no traditional database**. All persistent data lives in **browser localStorage** via `lib/auth.js`.

| Key | What is stored |
|-----|---------------|
| `neural_users` | All users (patients, doctors, admin) — roles, approval status, profiles |
| `neural_current_user` | Active session (current logged-in user) |
| `neural_appointments` | All appointment records |
| `neural_reviews` | Patient reviews and doctor responses |
| `neural_notifications` | Admin notifications for new doctor registrations |
| `neural_chat_permissions` | Patient ↔ doctor messaging permission requests |
| `neural_messages` | All chat messages between patients and doctors (includes `scan_report` type) |
| `neural_ai_scan_log` | Log of AI brain scans performed via the standalone Brain Scan tab (timestamp + doctorId) |

---

## User Roles

| Role | Access |
|------|--------|
| **Patient** | Book appointments, message doctors, write reviews, view scan reports, access AI Insights (Groq-powered daily tips) |
| **Doctor** | Full dashboard (gated behind admin approval): schedule, messaging + in-chat brain scanning, reviews, standalone Brain Scan tab, system stats on Overview |
| **Admin (Head of Dept.)** | Approve / reject doctors, manage patients and reviews, real-time system stats including live AI Scan count |

---

## Feature Breakdown

### Doctor Dashboard — System Stats (Overview tab)
Four live stat cards shown at the top of the Overview tab, polling every 5 seconds:

| Card | Data source |
|------|-------------|
| **Total Users** | `getTotalUsers()` → `getUsers().length` |
| **Approved Doctors** | `getStats().approvedDoctors` |
| **Active Patients** | `getStats().totalPatients` |
| **AI Scans Today** | `getAiScansToday()` — counts `scan_report` messages from today + `neural_ai_scan_log` entries from today |

### AI Scan Tracking
Two scan entry points, both tracked in real time:

1. **In-chat scanning** (Messages tab → open conversation → send image → "Run AI Scan") — on success, a `scan_report` message is saved. `getAiScansToday()` counts these.
2. **Standalone Brain Scan tab** — on successful analysis, `recordAiScan(doctorId)` appends an entry to `neural_ai_scan_log` in localStorage.

The count is visible to both the **Doctor** (Overview stats) and the **Admin** (System tab → Platform Overview), updating live.

### Admin — Platform Overview (System tab)
| Metric | Before | After |
|--------|--------|-------|
| Total Users | `stats.totalDoctors + stats.totalPatients + 1` | same |
| Approved Doctors | live from `getStats()` | same |
| Active Patients | live from `getStats()` | same |
| AI Scans Today | **hardcoded `'1,284'`** | **live `getAiScansToday()`**, polled every 3 s + storage event listener |

### Patient — AI Insights tab (Groq-powered)
Every time the patient opens the AI Insights tab a fresh request is sent to `/api/ai-tips`, which calls Groq with a randomized seed to guarantee variety. The response is structured JSON:

```json
{
  "headline": "Your Brain Deserves This Today 🧠",
  "tips": [
    {
      "emoji": "🧠",
      "title": "Short catchy title",
      "tip": "2–3 sentences of actionable advice.",
      "category": "Brain Health",
      "color": "#7a4dff",
      "urgency": "Daily Habit"
    }
  ]
}
```

UI features:
- Animated loading state (pulsing brain with ripple rings + skeleton cards)
- Headline banner with "Live AI" pulse badge
- Featured tip (full-width, large emoji)
- 2-column grid for remaining 4 tips (color-coded top border per category)
- "✨ New Tips" button regenerates on demand
- Overview tab teaser card shows first tip snippet or CTA if not yet loaded

---

## Folder & File Structure

### `/app` — Next.js Pages & API (App Router)

| Path | Role |
|------|------|
| `app/page.jsx` | Landing / home page |
| `app/layout.jsx` | Root layout — fonts, global providers, Nav |
| `app/globals.css` | Global CSS resets and Tailwind base styles |
| `app/login/page.jsx` | Login page — authenticates all roles via localStorage |
| `app/signup/page.jsx` | Registration — creates patient or doctor accounts |
| `app/brain-scan/page.jsx` | Public brain scan page — upload MRI, get AI results |
| `app/dashboard/patient/page.jsx` | Patient dashboard — appointments, messaging, reviews, scan reports, AI Insights |
| `app/dashboard/doctor/page.jsx` | Doctor dashboard — schedule, messaging + in-chat AI scan, reviews, brain scan tab, system stats |
| `app/dashboard/admin/page.jsx` | Admin dashboard — doctor management, patient list, reviews, live system metrics |
| `app/api/brain-scan/route.js` | Proxies MRI scan requests to the Flask server on port 5001 |
| `app/api/ai-tips/route.js` | Calls Groq API (`llama-3.3-70b-versatile`) to generate structured patient health tips |

---

### `/components` — Reusable UI Components

| File | Role |
|------|------|
| `Nav.jsx` | Top navigation bar |
| `Hero.jsx` | Hero section on the landing page |
| `Brain.jsx` | Animated brain visual (decorative) |
| `Particles.jsx` | Animated particle background |
| `BrainScanTab.jsx` | Scan upload + results component — accepts optional `onScanDone` callback (called after a successful scan to trigger stat tracking) |
| `Buttons.jsx` | Shared styled button components |

---

### `/lib` — Data & Business Logic

| File | Role |
|------|------|
| `auth.js` | Central localStorage data layer — auth, users, appointments, reviews, messages, notifications, chat permissions, AI scan tracking |

#### Key exported functions

| Function | Description |
|----------|-------------|
| `initAuth()` | Seeds all default data on first load |
| `login(email, password)` | Authenticates and writes session |
| `getCurrentUser()` | Returns active session object |
| `getStats()` | `{ totalDoctors, approvedDoctors, pendingDoctors, rejectedDoctors, totalPatients }` |
| `getTotalUsers()` | Total count of all users across all roles |
| `getAiScansToday()` | Count of AI scans performed today (chat-based `scan_report` messages + standalone scan log) |
| `recordAiScan(doctorId)` | Appends a timestamped entry to `neural_ai_scan_log` for standalone Brain Scan tab usage |
| `sendMessage(data)` | Saves a message; supports types `text`, `image`, `scan_report` |
| `getPatientScanReports(patientId)` | Returns all `scan_report` messages addressed to a patient |
| `getPendingChatRequests(doctorId)` | Returns pending messaging permission requests for a doctor |

---

### `/BrainTumor` — Tumor AI Module (Python)

| Path | Role |
|------|------|
| `brain_api.py` | Main Flask server (port 5001) — `/analyze`, `/status`, `/reload-stroke` endpoints |
| `requirements.txt` | Python dependencies (Flask, PyTorch, TensorFlow, MONAI, Pillow, etc.) |
| `ClassificationModel/best_model.pth` | Trained ResNet-50 weights for tumor classification |
| `ClassificationModel/noot_res50.ipynb` | Training notebook for classification model |
| `ClassificationModel/appss.py` | Standalone classification test script |
| `ClassificationModel/Testing/` | Test images by class (glioma, meningioma, pituitary, no-tumor) |
| `SegmentationModel/unet_segmentation_best.pth` | Trained U-Net weights for tumor segmentation |
| `SegmentationModel/segmentation_v2.ipynb` | Training notebook for segmentation model |
| `SegmentationModel/seg_inference.py` | Standalone segmentation inference script |
| `SegmentationModel/data/` | Dataset manifests (CSV + JSON) |

---

### `/BrainStroke` — Stroke AI Module (Python + Keras)

| Path | Role |
|------|------|
| `MedVision_Final_V2.keras` | Trained Keras/TensorFlow model for stroke detection |
| `MedVision_Stroke.ipynb` | Training and validation notebook |
| `data/Normal/` | Training images — healthy brain scans |
| `data/Stroke/` | Training images — stroke brain scans |

---

### `/uploads` — Temporary File Storage

Stores MRI images uploaded during a scan session. Managed by Flask. Not committed to git.

---

### Root Config Files

| File | Role |
|------|------|
| `next.config.js` | Next.js configuration |
| `tailwind.config.js` | Tailwind CSS theme and content paths |
| `postcss.config.js` | PostCSS pipeline |
| `jsconfig.json` | Path aliases (`@/components`, `@/lib`) |
| `package.json` | Node.js dependencies and scripts |
| `.env` | Local environment variables (e.g., `BRAIN_API_URL`) — not committed |
| `.env.example` | Template for required environment variables |
| `.gitignore` | Excludes node_modules, .next, .env, uploads, venv, etc. |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                            BROWSER                               │
│                                                                  │
│  Next.js 14 (App Router)                                         │
│  ┌───────────┐  ┌───────────┐  ┌──────────────────────────────┐  │
│  │  /login   │  │  /signup  │  │  /brain-scan                 │  │
│  └───────────┘  └───────────┘  └──────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  /dashboard/patient   /dashboard/doctor   /dashboard/admin│    │
│  └──────────────────────────────────────────────────────────┘    │
│                           │                                      │
│               Tailwind CSS + Framer Motion (UI)                  │
│                           │                                      │
│                localStorage  (lib/auth.js)                       │
│       Users · Sessions · Appointments · Reviews · Messages       │
│       Chat Permissions · AI Scan Log · Notifications             │
└──────────────┬────────────────────────────┬──────────────────────┘
               │  HTTP POST /api/brain-scan  │  HTTP POST /api/ai-tips
               ▼                            ▼
┌──────────────────────────┐   ┌────────────────────────────────────┐
│  Next.js API Route       │   │  Next.js API Route                 │
│  /api/brain-scan         │   │  /api/ai-tips                      │
│  (proxy + error handling)│   │  (Groq proxy, server-side key)     │
└──────────┬───────────────┘   └────────────────┬───────────────────┘
           │  HTTP (port 5001)                   │  HTTPS
           ▼                                     ▼
┌──────────────────────────┐   ┌────────────────────────────────────┐
│  Python Flask Server     │   │  Groq Cloud API                    │
│  (brain_api.py)          │   │  llama-3.3-70b-versatile           │
│                          │   │                                    │
│  ┌────────────────────┐  │   │  Structured JSON output:           │
│  │  Tumor Module      │  │   │  - headline                        │
│  │  ResNet-50 (PyTorch│  │   │  - 5 categorized health tips       │
│  │  4-class clf       │  │   │  - emoji · category · color        │
│  │  U-Net segmentation│  │   │  - urgency tag                     │
│  └────────────────────┘  │   └────────────────────────────────────┘
│  ┌────────────────────┐  │
│  │  Stroke Module     │  │
│  │  MedVision ResNet  │  │
│  │  (TF/Keras)        │  │
│  │  binary clf + bbox │  │
│  │  + Grad-CAM        │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

---

## Data Flow — AI Scan Count

```
Doctor performs scan
        │
        ├── Via Messages tab (in-chat image → "Run AI Scan" → "Send Report")
        │         └── sendMessage({ type: 'scan_report', ... })
        │                   └── stored in neural_messages (localStorage)
        │
        └── Via Brain Scan tab (standalone)
                  └── onScanDone() callback
                            └── recordAiScan(doctorId)
                                      └── stored in neural_ai_scan_log (localStorage)

getAiScansToday()
        ├── count neural_messages where type='scan_report' AND timestamp starts with today
        └── count neural_ai_scan_log entries where timestamp starts with today
                  └── sum → shown on Doctor Overview + Admin System tab (polled every 3–5 s)
```
