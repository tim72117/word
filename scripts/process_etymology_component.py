import cv2
import numpy as np
import json
import os
import sys
import argparse

def process_component(char_name, component_tag, input_path):
    """
    1. Load character config
    2. Load and clean input image (Bleach)
    3. Crop tightly to strokes
    4. Convert to Transparent RGBA
    5. Save and update JSON
    """
    project_root = "/Users/caitingyu/Documents/word"
    char_dir = os.path.join(project_root, "characters", char_name)
    config_path = os.path.join(char_dir, ".sketch_config.json")
    
    if not os.path.exists(config_path):
        print(f"❌ Error: Config not found at {config_path}")
        return

    # 1. Load Config
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    # 2. Find Component Box
    target_box = None
    for el in config.get("elements", []):
        if el.get("text") == component_tag:
            target_box = {
                "left": int(el["left"].replace("px","")),
                "top": int(el["top"].replace("px","")),
                "width": int(el["width"].replace("px","")),
                "height": int(el["height"].replace("px",""))
            }
            break
    
    if not target_box:
        print(f"⚠️ Warning: No element found for texture '{component_tag}' in JSON. Using defaults.")
        # Fallback logic or error
    
    # 3. Process Image
    img = cv2.imread(input_path)
    if img is None:
        print(f"❌ Error: Cannot read input image {input_path}")
        return

    # A. Bleach Background
    img[img > 230] = 255
    
    # B. Grayscale and Threshold for cropping
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    
    # C. Tight Crop
    coords = cv2.findNonZero(thresh)
    if coords is not None:
        x, y, w, h = cv2.boundingRect(coords)
        img = img[y:y+h, x:x+w]
        gray = gray[y:y+h, x:x+w]
        print(f"✂️ Tight crop: {w}x{h}")

    # D. Alpha Transparency (Grayscale to Alpha)
    alpha = 255 - gray
    alpha[alpha < 30] = 0 # Clean noise
    b, g, r = cv2.split(img)
    rgba = cv2.merge([b, g, r, alpha])

    # 4. Save
    out_filename = f"etymology_{component_tag}.png"
    out_path = os.path.join(char_dir, out_filename)
    cv2.imwrite(out_path, rgba)
    print(f"✅ Saved transparent component: {out_path}")

    # 5. Update JSON
    # Check if image element already exists
    found = False
    for el in config["elements"]:
        if el.get("image") == out_filename:
            # Update position (optional, usually kept)
            found = True
            break
    
    if not found:
        # [REVERTED] Use original target_box for standard alignment as confirmed by user
        new_el = {
            "text": "",
            "image": out_filename,
            "left": f"{target_box['left']}px" if target_box else "0px",
            "top": f"{target_box['top']}px" if target_box else "0px",
            "width": f"{target_box['width']}px" if target_box else "200px",
            "height": f"{target_box['height']}px" if target_box else "200px",
            "note": f"Auto-generated etymology for {component_tag}"
        }
        config["elements"].append(new_el)
        print(f"📝 Re-added to .sketch_config.json with original alignment")

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process Etymology Component Image")
    parser.add_argument("char", help="Character name (e.g. 聽)")
    parser.add_argument("tag", help="Component tag (e.g. 耳)")
    parser.add_argument("path", help="Path to raw generated sketch")
    args = parser.parse_args()
    
    process_component(args.char, args.tag, args.path)
