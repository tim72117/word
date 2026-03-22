import argparse
from PIL import Image
import numpy as np
import os

def main():
    parser = argparse.ArgumentParser(description="Convert white background to transparent using luminance alpha masking.")
    parser.add_argument('--src', required=True, help="Source image path")
    parser.add_argument('--dst', required=True, help="Destination image path")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.src):
        print(f"Error: {args.src} not found.")
        return

    # 轉灰階
    img = Image.open(args.src).convert("L")
    img_np = np.array(img)
    
    # 亮度反轉：白(255)變全透明(0)，黑(0)變無透明度半透明層級
    alpha = 255 - img_np
    rgb = np.zeros((*img_np.shape, 3), dtype=np.uint8)
    rgba = np.dstack((rgb, alpha))
    
    out = Image.fromarray(rgba, "RGBA")
    out.save(args.dst)
    print(f"Success: Transparent image saved to {args.dst}")

if __name__ == "__main__":
    main()
