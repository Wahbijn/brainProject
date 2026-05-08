# Neural Medical AI

A full-stack medical dashboard built with **Next.js 14**, featuring patient/doctor/admin roles, real-time messaging, appointment scheduling, and an AI-powered brain tumor detection system.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion |
| Data | localStorage (no backend required for core features) |
| AI Server | Python · Flask · PyTorch · MONAI |
| Models | ResNet-50 (classification) · UNet (segmentation) |

---

## Quick Start

### 1 — Clone & install JS dependencies

```bash
git clone https://github.com/YOUR_USERNAME/brainProject.git
cd brainProject
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env if you need to change any defaults
```

### 3 — Start the Next.js app

```bash
npm run dev
# → http://localhost:3000
```

### 4 — Start the AI server (optional — needed for Brain Scan tab)

```bash
# Install Python dependencies (once)
pip install -r BrainTumor/requirements.txt

# Start the Flask inference server
python BrainTumor/brain_api.py
# → http://localhost:5001
```

> **Note:** The brain tumor AI models must be downloaded separately (see below).  
> The rest of the app (dashboard, messaging, appointments) works without the AI server.

---

## Demo Accounts

Log in with any of these pre-seeded accounts:

| Role | Email | Password |
|---|---|---|
| Patient | `alex@example.com` | `patient123` |
| Patient | `jordan@example.com` | `patient123` |
| Doctor | `sarah@neural.ai` | `doctor123` |
| Admin | `admin@neural.ai` | `admin123` |

---

## Features

- **Patient Dashboard** — Book appointments, write reviews, real-time messaging, health metrics, AI insights, Brain Scan
- **Doctor Dashboard** — Schedule management, approve/counter-propose appointments, respond to reviews, messaging, Brain Scan
- **Admin Dashboard** — Approve/reject doctors, view all reviews, top-rated doctors analytics
- **Brain Scan AI** — Upload an MRI image → ResNet-50 classifies tumor type (glioma / meningioma / pituitary / none) → MONAI UNet segments exact tumor region → colored overlay visualization

---

## AI Models

The model weight files are tracked with **Git LFS**.  
After cloning, pull them with:

```bash
git lfs install
git lfs pull
```

| File | Size | Description |
|---|---|---|
| `BrainTumor/ClassificationModel/best_model.pth` | ~90 MB | ResNet-50, 4-class tumor classifier, 96% accuracy |
| `BrainTumor/SegmentationModel/unet_segmentation_best.pth` | ~6 MB | MONAI UNet, binary tumor segmentation |

> The training/testing datasets are **not** included in this repository (416 MB total).

---

## Project Structure

```
brainProject/
├── app/
│   ├── dashboard/
│   │   ├── patient/page.jsx   # Patient dashboard
│   │   ├── doctor/page.jsx    # Doctor dashboard
│   │   └── admin/page.jsx     # Admin dashboard
│   ├── api/brain-scan/        # Next.js proxy → Python AI server
│   ├── brain-scan/page.jsx    # Standalone brain scan page
│   ├── login/ · signup/
│   └── globals.css
├── components/
│   ├── BrainScanTab.jsx       # AI scan UI (shared by both dashboards)
│   ├── Brain.jsx · Particles.jsx · ...
├── lib/
│   └── auth.js                # All data operations (localStorage)
├── BrainTumor/
│   ├── brain_api.py           # Flask AI inference server
│   ├── requirements.txt       # Python dependencies
│   ├── ClassificationModel/
│   └── SegmentationModel/
├── .env.example               # Environment variable template
└── .gitattributes             # Git LFS config for .pth files
```

---

## Environment Variables

Copy `.env.example` to `.env`. Available variables:

| Variable | Default | Description |
|---|---|---|
| `BRAIN_API_URL` | `http://localhost:5001` | URL of the Python AI server |
| `BRAIN_API_PORT` | `5001` | Port for `brain_api.py` |
| `NEXT_PUBLIC_APP_NAME` | `Neural Medical AI` | App display name |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | App base URL |
