"""
Brain Tumor Analysis API — port 5001
Combines ResNet-50 classification + MONAI UNet segmentation.
Run from project root: python brainTumor/brain_api.py
"""
import sys, os, io, base64, traceback
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

# Add SegmentationModel to path so monai import works cleanly
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
CLF_PATH   = os.path.join(BASE_DIR, 'ClassificationModel', 'best_model.pth')
SEG_PATH   = os.path.join(BASE_DIR, 'SegmentationModel',   'unet_segmentation_best.pth')
DEVICE     = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

app = Flask(__name__)
CORS(app)

# ── Tumor classes (alphabetical, matches training) ────────────────
CLASS_NAMES  = ['glioma', 'meningioma', 'notumor', 'pituitary']
GLIOMA_THRESH = 0.25

CLASS_INFO = {
    'glioma': {
        'label':     'Glioma',
        'color':     '#E24B4A',
        'rgb':       (226, 75, 74),
        'urgency':   'High urgency',
        'desc':      'A malignant tumor originating from the glial cells of the brain or spine. Requires immediate oncological evaluation and multidisciplinary care.',
        'treatment': ['Surgical resection (craniotomy)', 'Radiation therapy (IMRT/SRS)', 'Chemotherapy — Temozolomide', 'Tumor-treating fields (TTFields)', 'Clinical trial options'],
    },
    'meningioma': {
        'label':     'Meningioma',
        'color':     '#EF9F27',
        'rgb':       (239, 159, 39),
        'urgency':   'Medium urgency',
        'desc':      'A tumor arising from the meninges — the membranes surrounding the brain and spinal cord. Usually slow-growing and often benign, but monitoring is essential.',
        'treatment': ['Active surveillance (small/asymptomatic)', 'Surgical removal', 'Stereotactic radiosurgery (Gamma Knife)', 'Fractionated radiation therapy'],
    },
    'notumor': {
        'label':     'No Tumor',
        'color':     '#1D9E75',
        'rgb':       (29, 158, 117),
        'urgency':   'No concern',
        'desc':      'No tumor detected in this MRI scan. Brain tissue appears within normal parameters. If symptoms persist, further evaluation may be warranted.',
        'treatment': ['Routine neurological follow-up', 'Continue monitoring if symptomatic', 'Consult neurologist if headaches persist', 'Maintain regular MRI schedule if indicated'],
    },
    'pituitary': {
        'label':     'Pituitary Tumor',
        'color':     '#378ADD',
        'rgb':       (55, 138, 221),
        'urgency':   'Medium urgency',
        'desc':      'A tumor located in the pituitary gland at the base of the brain, often affecting hormone regulation. Many are benign adenomas with favorable treatment outcomes.',
        'treatment': ['Dopamine agonists (prolactinomas)', 'Transsphenoidal surgery (endoscopic)', 'Stereotactic radiosurgery', 'Hormonal replacement therapy', 'Somatostatin analogues (GH-secreting)'],
    },
}

# ── Classification transform (matches noot_res50.ipynb) ───────────
clf_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ── Model state ───────────────────────────────────────────────────
clf_model  = None
seg_model  = None
clf_error  = None
seg_error  = None


def load_classification():
    global clf_model, clf_error
    if not os.path.exists(CLF_PATH):
        clf_error = f"File not found: {CLF_PATH}"
        return
    m = models.resnet50(weights=None)
    for p in m.parameters():
        p.requires_grad = False
    m.fc = nn.Linear(m.fc.in_features, len(CLASS_NAMES))
    ckpt = torch.load(CLF_PATH, map_location='cpu')
    m.load_state_dict(ckpt, strict=True)
    m.to(DEVICE).eval()
    clf_model = m
    print(f"   Classification : ✅  ResNet-50 loaded  ({DEVICE})")


def load_segmentation():
    global seg_model, seg_error
    if not os.path.exists(SEG_PATH):
        seg_error = f"File not found: {SEG_PATH}"
        return
    try:
        from monai.networks.nets import UNet
    except ImportError:
        seg_error = "monai not installed — pip install monai"
        return
    m = UNet(
        spatial_dims=2, in_channels=3, out_channels=1,
        channels=(32, 64, 128, 256), strides=(2, 2, 2),
        num_res_units=2, norm='INSTANCE', dropout=0.1,
    )
    state = torch.load(SEG_PATH, map_location='cpu')
    m.load_state_dict(state)
    m.to(DEVICE).eval()
    seg_model = m
    print(f"   Segmentation   : ✅  MONAI UNet loaded  ({DEVICE})")


try:
    load_classification()
except Exception as e:
    clf_error = str(e)
    print(f"   Classification : ❌  {e}")

try:
    load_segmentation()
except Exception as e:
    seg_error = str(e)
    print(f"   Segmentation   : ❌  {e}")


# ── Helpers ───────────────────────────────────────────────────────
def to_b64(img: Image.Image, fmt: str = 'PNG') -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode()


def make_overlay(orig_arr: np.ndarray, mask_arr: np.ndarray, rgb: tuple, alpha: float = 0.52) -> Image.Image:
    """Blend tumor-color over original wherever mask is active."""
    color = np.array(rgb, dtype=np.float32)
    mask3 = mask_arr[..., np.newaxis]                     # (H,W,1)
    blended = orig_arr.astype(np.float32) * (1 - mask3 * alpha) + color * (mask3 * alpha)
    return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))


def run_segmentation(orig: Image.Image):
    """Returns (mask_256 np array float32, any_tumor bool)."""
    if seg_model is None:
        return np.zeros((256, 256), dtype=np.float32), False

    img256 = orig.convert('RGB').resize((256, 256), Image.BILINEAR)
    arr = np.array(img256, dtype=np.float32) / 255.0     # [0,1] — matches training
    t   = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        probs = torch.sigmoid(seg_model(t))
        mask  = (probs > 0.5).float()

    mask_np = mask.cpu().numpy()[0, 0]                    # (256,256)
    return mask_np, bool(mask_np.sum() > 0)


# ── Routes ────────────────────────────────────────────────────────
@app.route('/status')
def status():
    return jsonify({
        'classification': clf_model is not None,
        'segmentation':   seg_model is not None,
        'clf_error':      clf_error,
        'seg_error':      seg_error,
        'device':         str(DEVICE),
    })


@app.route('/analyze', methods=['POST'])
def analyze():
    if clf_model is None:
        return jsonify({'error': clf_error or 'Classification model not loaded'}), 503

    if 'image' not in request.files or request.files['image'].filename == '':
        return jsonify({'error': 'No image provided'}), 400

    try:
        raw  = request.files['image'].read()
        orig = Image.open(io.BytesIO(raw)).convert('RGB')

        # ── Classification ──────────────────────────────────────
        t     = clf_transform(orig).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            probs = torch.softmax(clf_model(t), dim=1)[0]

        pred_idx = int(torch.argmax(probs).item())
        if probs[0].item() > GLIOMA_THRESH:           # glioma safety threshold
            pred_idx = 0

        pred_class  = CLASS_NAMES[pred_idx]
        confidence  = round(float(probs[pred_idx]) * 100, 1)
        all_conf    = {CLASS_NAMES[i]: round(float(probs[i]) * 100, 1) for i in range(4)}
        info        = CLASS_INFO[pred_class]

        # ── Segmentation ────────────────────────────────────────
        mask256, any_tumor = run_segmentation(orig)

        # ── Build display images at 512×512 ─────────────────────
        display  = orig.resize((512, 512), Image.BILINEAR)
        disp_arr = np.array(display, dtype=np.float32)

        mask512  = np.array(
            Image.fromarray((mask256 * 255).astype(np.uint8), mode='L')
                 .resize((512, 512), Image.NEAREST),
            dtype=np.float32
        ) / 255.0

        if pred_class == 'notumor':
            overlay  = display
            mask_vis = Image.fromarray(np.zeros((512, 512), dtype=np.uint8)).convert('RGB')
            tumor_px = 0
        else:
            overlay  = make_overlay(disp_arr, mask512, info['rgb'])
            mask_vis = Image.fromarray((mask512 * 255).astype(np.uint8)).convert('RGB')
            tumor_px = int(mask512.sum())

        return jsonify({
            'prediction':      pred_class,
            'label':           info['label'],
            'confidence':      confidence,
            'all_confidences': all_conf,
            'color':           info['color'],
            'urgency':         info['urgency'],
            'description':     info['desc'],
            'treatment':       info['treatment'],
            'low_confidence':  confidence < 60.0,
            'has_tumor':       pred_class != 'notumor',
            'tumor_pixels':    tumor_px,
            'original_b64':    to_b64(display),
            'overlay_b64':     to_b64(overlay),
            'mask_b64':        to_b64(mask_vis),
        })

    except Exception as e:
        return jsonify({'error': f'Analysis failed: {e}', 'trace': traceback.format_exc()}), 500


if __name__ == '__main__':
    PORT = int(os.environ.get('BRAIN_API_PORT', 5001))
    print("\n🧠 Neural Brain Tumor Analysis API")
    print("====================================")
    print(f"   Device         : {DEVICE}")
    load_classification() if clf_model is None and clf_error is None else None
    load_segmentation()   if seg_model is None and seg_error is None else None
    print(f"   Classification : {'✅ Ready' if clf_model else f'⚠️  {clf_error}'}")
    print(f"   Segmentation   : {'✅ Ready' if seg_model else f'⚠️  {seg_error}'}")
    print(f"   Endpoint       : http://localhost:{PORT}/analyze\n")
    app.run(debug=False, port=PORT)
