"""
Brain Tumor + Stroke Analysis API — port 5001
Tumor  : ResNet-50 classification (4 classes) + MONAI UNet segmentation
Stroke : MedVision ResNet-50 dual-output (binary class + bbox) + Grad-CAM
Run from project root: python BrainTumor/brain_api.py
"""
import os, io, base64, traceback

# ── Must be set BEFORE tensorflow is imported anywhere ────────────
os.environ.setdefault('CUDA_VISIBLE_DEVICES', '-1')   # force CPU — avoids GPU hang on Windows
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')    # suppress C++ TF noise

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image, ImageFilter

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
CLF_PATH    = os.path.join(BASE_DIR, 'ClassificationModel', 'best_model.pth')
SEG_PATH    = os.path.join(BASE_DIR, 'SegmentationModel',   'unet_segmentation_best.pth')
STROKE_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'BrainStroke', 'MedVision_Final_V2.keras'))
DEVICE      = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

app = Flask(__name__)
CORS(app)

# ── Tumor classes ─────────────────────────────────────────────────
CLASS_NAMES   = ['glioma', 'meningioma', 'notumor', 'pituitary']
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
        'desc':      'A tumor arising from the meninges surrounding the brain and spinal cord. Usually slow-growing and often benign, but monitoring is essential.',
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

# ── Stroke classes ────────────────────────────────────────────────
STROKE_INFO = {
    'stroke': {
        'label':     'Stroke Detected',
        'color':     '#7C3AED',
        'rgb':       (124, 58, 237),
        'urgency':   'Critical — seek immediate care',
        'desc':      'Signs of cerebrovascular accident detected. Immediate neurological evaluation is essential. Time is critical — early intervention dramatically improves outcomes.',
        'treatment': ['Call emergency services immediately (911)', 'CT / MRI angiography for extent assessment', 'IV tPA thrombolysis if ischemic and within time window', 'Neurosurgical consultation', 'ICU monitoring & neuroprotection'],
    },
    'normal': {
        'label':     'No Stroke Signs',
        'color':     '#06B6D4',
        'rgb':       (6, 182, 212),
        'urgency':   'No acute vascular finding',
        'desc':      'No signs of cerebrovascular accident detected. Vascular patterns appear within normal parameters for this imaging.',
        'treatment': ['Routine neurological follow-up', 'Vascular risk factor management (hypertension, diabetes)', 'Lifestyle modification counseling', 'Regular monitoring if symptomatic'],
    },
}

# ── Classification transform ──────────────────────────────────────
clf_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ── Model state ───────────────────────────────────────────────────
clf_model    = None
seg_model    = None
stroke_model = None
clf_error    = None
seg_error    = None
stroke_error = None


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
    print(f"   Tumor Clf      : ✅  ResNet-50 loaded  ({DEVICE})")


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
    print(f"   Tumor Seg      : ✅  MONAI UNet loaded  ({DEVICE})")


def _patch_keras_compat():
    """Drop Keras-2-only args that Keras 3 (TF 2.16+) no longer accepts.
    Safe to call multiple times — checks for sentinel before patching."""
    try:
        import keras
        # BatchNormalization: renorm args were removed in Keras 3
        if not getattr(keras.layers.BatchNormalization.__init__, '_k3_compat', False):
            _orig_bn = keras.layers.BatchNormalization.__init__
            def _bn(self, renorm=False, renorm_clipping=None, renorm_momentum=0.99, **kw):
                _orig_bn(self, **kw)
            _bn._k3_compat = True
            keras.layers.BatchNormalization.__init__ = _bn
        # Dense: quantization_config was added then removed across minor versions
        if not getattr(keras.layers.Dense.__init__, '_k3_compat', False):
            _orig_dense = keras.layers.Dense.__init__
            def _dense(self, quantization_config=None, **kw):
                _orig_dense(self, **kw)
            _dense._k3_compat = True
            keras.layers.Dense.__init__ = _dense
    except Exception:
        pass   # if keras isn't installed yet, nothing to patch


def load_stroke():
    global stroke_model, stroke_error
    stroke_model = None
    stroke_error = None

    if not os.path.exists(STROKE_PATH):
        stroke_error = f"File not found: {STROKE_PATH}"
        print(f"   Stroke         : ⚠️  {stroke_error}")
        return
    try:
        import tensorflow as tf
        tf.get_logger().setLevel('ERROR')
        _patch_keras_compat()
        stroke_model = tf.keras.models.load_model(STROKE_PATH)
        print(f"   Stroke         : ✅  MedVision loaded  (TF {tf.__version__})")
    except ImportError as ie:
        stroke_error = f"TF not importable: {ie}"
        print(f"   Stroke         : ⚠️  {stroke_error}")
    except Exception as e:
        stroke_error = f"{type(e).__name__}: {e}"
        print(f"   Stroke         : ❌  {stroke_error}")


try:
    load_classification()
except Exception as e:
    clf_error = str(e)
    print(f"   Tumor Clf      : ❌  {e}")

try:
    load_segmentation()
except Exception as e:
    seg_error = str(e)
    print(f"   Tumor Seg      : ❌  {e}")

try:
    load_stroke()
except Exception as e:
    stroke_error = str(e)
    print(f"   Stroke         : ❌  {e}")


# ── Helpers ───────────────────────────────────────────────────────
def to_b64(img: Image.Image, fmt: str = 'PNG') -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode()


def make_overlay(orig_arr: np.ndarray, mask_arr: np.ndarray, rgb: tuple, alpha: float = 0.52) -> Image.Image:
    """Blend tumor-color over original wherever mask is active."""
    color  = np.array(rgb, dtype=np.float32)
    mask3  = mask_arr[..., np.newaxis]
    blended = orig_arr.astype(np.float32) * (1 - mask3 * alpha) + color * (mask3 * alpha)
    return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))


def run_segmentation(orig: Image.Image):
    """Returns (mask_256 float32 array, any_tumor bool)."""
    if seg_model is None:
        return np.zeros((256, 256), dtype=np.float32), False
    img256 = orig.convert('RGB').resize((256, 256), Image.BILINEAR)
    arr = np.array(img256, dtype=np.float32) / 255.0
    t   = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        probs = torch.sigmoid(seg_model(t))
        mask  = (probs > 0.5).float()
    mask_np = mask.cpu().numpy()[0, 0]
    return mask_np, bool(mask_np.sum() > 0)


def heatmap_to_rgb(heatmap: np.ndarray) -> np.ndarray:
    """Convert normalized [0,1] heatmap to RGB using magma colormap approximation."""
    hm = np.clip(heatmap, 0, 1)
    # 5-stop magma gradient: black → deep purple → magenta → orange → yellow-white
    r = np.interp(hm, [0.0, 0.25, 0.50, 0.75, 1.0], [  0,  81, 183, 249, 252]).astype(np.float32)
    g = np.interp(hm, [0.0, 0.25, 0.50, 0.75, 1.0], [  0,  18,  55, 142, 255]).astype(np.float32)
    b = np.interp(hm, [0.0, 0.25, 0.50, 0.75, 1.0], [  4, 124, 121,   9, 164]).astype(np.float32)
    return np.stack([r, g, b], axis=-1).astype(np.uint8)


def get_gradcam_stroke(img_array: np.ndarray) -> np.ndarray:
    """Grad-CAM via conv5_block3_out with input-gradient fallback. Returns (7,7) float32 [0,1]."""
    if stroke_model is None:
        return np.zeros((7, 7), dtype=np.float32)

    import tensorflow as tf

    # Find single-probability classification output (None,1)
    class_out = next(
        (o for o in stroke_model.outputs if len(o.shape) == 2 and o.shape[-1] == 1),
        stroke_model.outputs[0],
    )

    # ── Attempt 1: true Grad-CAM ──────────────────────────────────
    # tape.watch MUST be called on img_t BEFORE grad_model runs so the tape
    # records the full chain img_t → conv_out → class_pred. Watching conv_out
    # after the model call is too late — the backward path is never registered.
    try:
        grad_model = tf.keras.models.Model(
            inputs  = stroke_model.inputs,
            outputs = [stroke_model.get_layer('conv5_block3_out').output, class_out],
        )
        img_t = tf.cast(img_array, tf.float32)

        with tf.GradientTape() as tape:
            tape.watch(img_t)                           # ← watch BEFORE model call
            conv_out, class_pred = grad_model(img_t)
            loss = class_pred[:, 0]

        grads = tape.gradient(loss, conv_out)           # (1,H,W,C) or None

        if grads is None:
            raise ValueError("tape returned None gradients for conv_out")

        pooled  = tf.reduce_mean(grads, axis=(0, 1, 2)).numpy()  # (C,)
        conv_np = conv_out[0].numpy()                             # (H,W,C)
        heatmap = np.maximum(np.einsum('hwc,c->hw', conv_np, pooled), 0)

        if heatmap.max() == 0:
            raise ValueError("Grad-CAM heatmap is blank")

        # Percentile normalization: clip at 99th percentile so a single bright
        # border pixel cannot collapse the whole scale and hide the real lesion.
        p99 = np.percentile(heatmap, 99)
        if p99 > 1e-8:
            heatmap = np.clip(heatmap / p99, 0, 1)
        else:
            heatmap = heatmap / heatmap.max()
        return heatmap.astype(np.float32)

    except Exception as e:
        print(f"   Grad-CAM attempt 1 failed ({type(e).__name__}: {e}) — trying input-gradient fallback")

    # ── Fallback: input-gradient saliency (tf.Variable always watched) ──
    # Keep full 224×224 resolution — shrinking to 7×7 destroys spatial info.
    try:
        img_var = tf.Variable(img_array, dtype=tf.float32)
        with tf.GradientTape() as tape2:
            preds = stroke_model(img_var)
            raw   = preds[0] if isinstance(preds, (list, tuple)) else preds
            loss2 = raw[:, 0]

        ig = tape2.gradient(loss2, img_var)             # (1,224,224,3)

        if ig is None:
            raise ValueError("input gradient also None")

        grad_map = tf.reduce_max(tf.abs(ig[0]), axis=-1).numpy()   # (224,224)
        grad_map = grad_map / (grad_map.max() + 1e-8)
        return grad_map.astype(np.float32)              # full 224×224

    except Exception as e2:
        print(f"   Grad-CAM fallback also failed: {e2}")
        return np.zeros((7, 7), dtype=np.float32)


def run_stroke(orig: Image.Image):
    """Returns (pred_class, confidence_pct, raw_probability_pct, heatmap_img|None, overlay_img|None)."""
    if stroke_model is None:
        return 'normal', 0.0, 0.0, None, None

    img224  = orig.convert('RGB').resize((224, 224), Image.BILINEAR)
    arr     = np.array(img224, dtype=np.float32) / 255.0   # /255 only — no ImageNet norm
    img_arr = arr[np.newaxis]                               # (1,224,224,3)

    try:
        preds = stroke_model.predict(img_arr, verbose=0)
        # Multi-output model returns list; take first (class) output
        raw        = preds[0] if isinstance(preds, (list, tuple)) else preds
        class_prob = float(np.asarray(raw).flat[0])
    except Exception as e:
        print(f"   Stroke predict error: {e}")
        return 'normal', 0.0, 0.0, None, None

    has_stroke   = class_prob > 0.5
    pred_class   = 'stroke' if has_stroke else 'normal'
    confidence   = round((class_prob if has_stroke else 1.0 - class_prob) * 100, 1)
    raw_prob_pct = round(class_prob * 100, 1)   # always 0-100%, regardless of direction

    # ── Step 1: upscale raw heatmap to 512×512 ───────────────────────
    heatmap_raw = get_gradcam_stroke(img_arr)               # (H,W) any size
    heatmap512  = np.array(
        Image.fromarray((heatmap_raw * 255).astype(np.uint8), mode='L')
             .resize((512, 512), Image.BICUBIC),            # bicubic → smoother
        dtype=np.float32,
    ) / 255.0

    # ── Step 2: Gaussian smooth — remove grid artifacts from upscaling ──
    # PIL GaussianBlur radius=10 gives a soft, medically clean heatmap.
    heatmap512 = np.array(
        Image.fromarray((heatmap512 * 255).astype(np.uint8), mode='L')
             .filter(ImageFilter.GaussianBlur(radius=10)),
        dtype=np.float32,
    ) / 255.0

    # ── Step 3: Brain mask — zero out background / skull activations ────
    # Brain MRI: tissue is bright; background pixels are < ~5 % of peak.
    # Dilate the mask by 25 px with PIL MaxFilter to keep cortical edges.
    orig512      = orig.resize((512, 512), Image.BILINEAR)
    gray512      = np.array(orig512.convert('L'), dtype=np.float32)
    brain_thresh = gray512.max() * 0.05
    brain_bin    = (gray512 > brain_thresh).astype(np.uint8) * 255
    brain_mask   = np.array(
        Image.fromarray(brain_bin, mode='L').filter(ImageFilter.MaxFilter(size=25)),
        dtype=np.float32,
    ) / 255.0
    heatmap512  *= brain_mask                               # suppress non-brain regions

    # ── Step 4: re-normalise after masking ───────────────────────────
    if heatmap512.max() > 1e-8:
        heatmap512 = heatmap512 / heatmap512.max()

    # ── Step 5: colorise and blend ───────────────────────────────────
    hm_rgb      = heatmap_to_rgb(heatmap512)
    heatmap_img = Image.fromarray(hm_rgb)

    orig_arr    = np.array(orig512, dtype=np.float32)
    # Use intensity-weighted alpha — hot spots fully visible, cool areas transparent
    alpha_map   = heatmap512[..., np.newaxis] * 0.70
    blended     = orig_arr * (1 - alpha_map) + hm_rgb.astype(np.float32) * alpha_map
    overlay_img = Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))

    return pred_class, confidence, raw_prob_pct, heatmap_img, overlay_img


# ── Routes ────────────────────────────────────────────────────────
@app.route('/status')
def status():
    return jsonify({
        'classification': clf_model    is not None,
        'segmentation':   seg_model    is not None,
        'stroke':         stroke_model is not None,
        'clf_error':      clf_error,
        'seg_error':      seg_error,
        'stroke_error':   stroke_error,
        'stroke_path':    STROKE_PATH,
        'device':         str(DEVICE),
    })


@app.route('/reload-stroke', methods=['POST'])
def reload_stroke():
    """Re-attempt loading the stroke model without restarting the server."""
    try:
        load_stroke()
        return jsonify({
            'ok':      stroke_model is not None,
            'error':   stroke_error,
            'path':    STROKE_PATH,
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/analyze', methods=['POST'])
def analyze():
    if clf_model is None:
        return jsonify({'error': clf_error or 'Classification model not loaded'}), 503

    if 'image' not in request.files or request.files['image'].filename == '':
        return jsonify({'error': 'No image provided'}), 400

    try:
        raw  = request.files['image'].read()
        orig = Image.open(io.BytesIO(raw)).convert('RGB')

        # ── Tumor classification ─────────────────────────────────
        t = clf_transform(orig).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            probs = torch.softmax(clf_model(t), dim=1)[0]

        pred_idx = int(torch.argmax(probs).item())
        if probs[0].item() > GLIOMA_THRESH:
            pred_idx = 0

        pred_class = CLASS_NAMES[pred_idx]
        confidence = round(float(probs[pred_idx]) * 100, 1)
        all_conf   = {CLASS_NAMES[i]: round(float(probs[i]) * 100, 1) for i in range(4)}
        info       = CLASS_INFO[pred_class]

        # ── Tumor segmentation ───────────────────────────────────
        mask256, any_tumor = run_segmentation(orig)

        display  = orig.resize((512, 512), Image.BILINEAR)
        disp_arr = np.array(display, dtype=np.float32)

        mask512 = np.array(
            Image.fromarray((mask256 * 255).astype(np.uint8), mode='L')
                 .resize((512, 512), Image.NEAREST),
            dtype=np.float32,
        ) / 255.0

        if pred_class == 'notumor':
            overlay  = display
            mask_vis = Image.fromarray(np.zeros((512, 512), dtype=np.uint8)).convert('RGB')
            tumor_px = 0
        else:
            overlay  = make_overlay(disp_arr, mask512, info['rgb'])
            mask_vis = Image.fromarray((mask512 * 255).astype(np.uint8)).convert('RGB')
            tumor_px = int(mask512.sum())

        # ── Stroke analysis (isolated — failure must not block tumor result) ──
        # NOTE: The stroke model was trained on stroke-specific brain scans.
        # When a tumor is present, it may produce elevated false-positive stroke scores
        # because tumor MRI patterns look similar to stroke patterns to this model.
        tumor_present = pred_class != 'notumor'

        try:
            s_pred, s_conf, s_raw_prob, s_heatmap_img, s_overlay_img = run_stroke(orig)
            s_info = STROKE_INFO[s_pred]
            stroke_result = {
                'prediction':           s_pred,
                'label':                s_info['label'],
                'confidence':           s_conf,
                'raw_probability':      s_raw_prob,
                'color':                s_info['color'],
                'urgency':              s_info['urgency'],
                'description':          s_info['desc'],
                'treatment':            s_info['treatment'],
                'has_stroke':           s_pred == 'stroke',
                'model_available':      stroke_model is not None,
                'load_error':           stroke_error,
                'out_of_distribution':  tumor_present,
            }
            if s_heatmap_img is not None:
                stroke_result['heatmap_b64'] = to_b64(s_heatmap_img)
                stroke_result['overlay_b64'] = to_b64(s_overlay_img)
        except Exception as se:
            stroke_result = {
                'prediction':          'normal',
                'label':               'Stroke Analysis Failed',
                'confidence':          0,
                'raw_probability':     0,
                'color':               '#7C3AED',
                'urgency':             'Error',
                'description':         str(se),
                'treatment':           [],
                'has_stroke':          False,
                'model_available':     False,
                'load_error':          stroke_error,
                'out_of_distribution': tumor_present,
            }

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
            'stroke':          stroke_result,
        })

    except Exception as e:
        return jsonify({'error': f'Analysis failed: {e}', 'trace': traceback.format_exc()}), 500


if __name__ == '__main__':
    PORT = int(os.environ.get('BRAIN_API_PORT', 5001))
    print("\n🧠 Neural Brain Analysis API")
    print("=" * 36)
    print(f"   Device         : {DEVICE}")
    print(f"   Tumor Clf      : {'✅ Ready' if clf_model    else f'⚠️  {clf_error}'}")
    print(f"   Tumor Seg      : {'✅ Ready' if seg_model    else f'⚠️  {seg_error}'}")
    print(f"   Stroke         : {'✅ Ready' if stroke_model else f'⚠️  {stroke_error}'}")
    print(f"   Endpoint       : http://localhost:{PORT}/analyze\n")
    app.run(debug=False, port=PORT)
