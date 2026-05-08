import torch
import numpy as np
from PIL import Image
from monai.networks.nets import UNet

class SegmentationModel:
    def __init__(self, model_path="unet_segmentation_best.pth", threshold=0.5, device=None):
        """
        Initializes the Segmentation model with pre-trained weights.
        """
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
            
        self.threshold = threshold
        
        # Initialize MONAI UNet identical to training
        self.model = UNet(
            spatial_dims=2,
            in_channels=3,
            out_channels=1,
            channels=(32, 64, 128, 256),
            strides=(2, 2, 2),
            num_res_units=2,
            norm="INSTANCE",
            dropout=0.1,
        )
        
        # Load weights
        try:
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            self.model.to(self.device)
            self.model.eval()
            print(f"Loaded segmentation model from {model_path} on {self.device}")
        except Exception as e:
            print(f"Failed to load model from {model_path}: {e}")
            print("Model will be randomly initialized (not recommended for inference).")
            self.model.to(self.device)
            self.model.eval()

    def predict(self, image: Image.Image, target_size=(256, 256)) -> Image.Image:
        """
        Runs segmentation inference on a PIL Image and returns a binary mask Image.
        """
        original_size = image.size
        
        # Preprocessing: match training dataset
        img = image.convert("RGB")
        img_resized = img.resize(target_size, Image.BILINEAR)
        
        # Convert to numpy array and normalize [0, 1]
        img_np = np.array(img_resized, dtype=np.float32) / 255.0
        
        # To tensor (C, H, W) -> add batch dimension (1, C, H, W)
        img_t = torch.from_numpy(img_np).permute(2, 0, 1).unsqueeze(0).to(self.device)
        
        # Inference
        with torch.no_grad():
            logits = self.model(img_t)
            probs = torch.sigmoid(logits)
            preds = (probs > self.threshold).float()
            
        # Postprocessing: Tensor to Numpy
        pred_np = preds.cpu().numpy()[0, 0] # Extract the 2D mask
        
        # Convert to PIL Image and scale to 0-255
        pred_mask = Image.fromarray((pred_np * 255).astype(np.uint8), mode="L")
        
        # Resize back to original image size
        pred_mask = pred_mask.resize(original_size, Image.NEAREST)
        
        return pred_mask


if __name__ == "__main__":
    # Example usage
    import sys
    import os
    
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        if os.path.exists(image_path):
            print(f"Running inference on {image_path}...")
            seg_model = SegmentationModel(model_path=model_path)
            img = Image.open(image_path)
            mask = seg_model.predict(img)
            
            out_path = "output_mask.png"
            mask.save(out_path)
            print(f"Saved predicted mask to {out_path}")
        else:
            print(f"Image not found: {image_path}")
    else:
        print("Provide an image path to test the model: python seg_inference.py <image_path>")
