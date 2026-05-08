"""
Brain Tumor Detection - Flask Backend
Run: python app.py
Then open http://localhost:5000 in your browser
"""

from flask import Flask, request, jsonify, send_from_directory
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import os

app = Flask(__name__, static_folder='.')

# ── Config ──────────────────────────────────────────────
CLASS_NAMES   = ['glioma', 'meningioma', 'notumor', 'pituitary']
MODEL_PATH    = 'best_model.pth'
GLIOMA_THRESH = 0.25          # same threshold used in training notebook
IMG_SIZE      = 224
DEVICE        = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Descriptions shown in the UI
CLASS_INFO = {
    'glioma': {
        'color': '#E24B4A',
        'desc': 'A tumor that starts in the glial cells of the brain or spine. Requires urgent medical attention.',
        'urgency': 'High urgency'
    },
    'meningioma': {
        'color': '#EF9F27',
        'desc': 'A tumor that forms on the membranes covering the brain. Often slow-growing.',
        'urgency': 'Medium urgency'
    },
    'notumor': {
        'color': '#1D9E75',
        'desc': 'No tumor detected in this MRI scan. The brain tissue appears normal.',
        'urgency': 'No concern'
    },
    'pituitary': {
        'color': '#378ADD',
        'desc': 'A tumor in the pituitary gland at the base of the brain. Often treatable.',
        'urgency': 'Medium urgency'
    },
}

# ── Image transform (same as val_transforms in notebook) ──
transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# ── Load model ───────────────────────────────────────────
# Architecture matches noot_res50.ipynb exactly:
#   - resnet50 base
#   - layer2 + layer3 + layer4 unfrozen
#   - fc = Linear(2048, 4)   ← plain linear, confirmed from saved weights
#   - CLASS ORDER (alphabetical): glioma=0, meningioma=1, notumor=2, pituitary=3
def load_model():
    model = models.resnet50(weights=None)

    # Freeze everything
    for param in model.parameters():
        param.requires_grad = False

    # Replace FC — plain Linear, matches saved best_model.pth keys (fc.weight, fc.bias)
    model.fc = nn.Linear(model.fc.in_features, len(CLASS_NAMES))

    # Load weights onto CPU first (safe for all machines)
    checkpoint = torch.load(MODEL_PATH, map_location='cpu')
    model.load_state_dict(checkpoint, strict=True)

    model.to(DEVICE)
    model.eval()

    print(f"   Class order : {CLASS_NAMES}")
    print(f"   FC head     : Linear(2048, 4)")
    return model

model = None
model_loaded = False
model_error = None

try:
    if os.path.exists(MODEL_PATH):
        model = load_model()
        model_loaded = True
        print(f"✅ Model loaded from {MODEL_PATH}")
    else:
        model_error = f"Model file '{MODEL_PATH}' not found. Please train the model first using noot_res50.ipynb."
        print(f"⚠️  {model_error}")
except Exception as e:
    model_error = str(e)
    print(f"❌ Error loading model: {e}")

# ── Routes ───────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/status')
def status():
    return jsonify({'loaded': model_loaded, 'error': model_error, 'device': str(DEVICE)})

@app.route('/predict', methods=['POST'])
def predict():
    if not model_loaded:
        return jsonify({'error': model_error}), 503

    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    try:
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        tensor = transform(img).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            outputs = model(tensor)
            probs   = torch.softmax(outputs, dim=1)[0]

            # 🔥 same threshold as notebook — if P(glioma) > 0.25 → predict glioma
            # this is what produces the 96% accuracy / 0.86 glioma recall result
            pred_idx = torch.argmax(probs).item()
            if probs[0].item() > GLIOMA_THRESH:
                pred_idx = 0

        pred_class  = CLASS_NAMES[pred_idx]
        confidence  = round(probs[pred_idx].item() * 100, 1)
        confidences = {CLASS_NAMES[i]: round(probs[i].item() * 100, 1) for i in range(len(CLASS_NAMES))}
        info        = CLASS_INFO[pred_class]

        # Warn user if model is not confident (below 60%)
        low_confidence = confidence < 60.0

        return jsonify({
            'prediction':      pred_class,
            'confidence':      confidence,
            'all_confidences': confidences,
            'color':           info['color'],
            'description':     info['desc'],
            'urgency':         info['urgency'],
            'low_confidence':  low_confidence,
        })

    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

if __name__ == '__main__':
    print("\n🧠 Brain Tumor Detection Server")
    print("================================")
    print(f"   Device  : {DEVICE}")
    print(f"   Model   : {'✅ Ready' if model_loaded else '⚠️  Not loaded'}")
    print("   Open    : http://localhost:5000\n")
    app.run(debug=True, port=5000)
