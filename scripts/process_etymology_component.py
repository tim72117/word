import cv2
import numpy as np
import json
import os
import sys
import argparse
from PIL import Image

def parse_px_val(val):
    if isinstance(val, (int, float)): return int(val)
    if isinstance(val, str):
        return int(float(val.replace("px", "")))
    return 0

def process_component(char_name, component_tag, input_path, filename_tag=None, no_alpha=False):
    """
    1. Load character configs (sketch & production)
    2. Load and clean input image
    3. Crop and Pad to match target_box aspect ratio
    4. Save image
    5. Update either .sketch_config.json or production_config.json
    """
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    char_dir = os.path.join(project_root, "characters", char_name)
    sketch_config_path = os.path.join(char_dir, ".sketch_config.json")
    prod_config_path = os.path.join(char_dir, "production_config.json")
    
    if not os.path.exists(sketch_config_path):
        print(f"❌ Error: Sketch Config not found at {sketch_config_path}")
        return

    # 1. Load Sketch Config (Design stage)
    with open(sketch_config_path, "r", encoding="utf-8") as f:
        sketch_config = json.load(f)

    # 2. Find Component Design Box (Always from sketch_config)
    target_box = None
    # 支援新舊格式混合尋找
    elements = sketch_config.get("elements", [])
    
    # 優先尋找 text 匹配的 elements
    for el in elements:
        if el.get("text") == component_tag:
            target_box = {
                "left": parse_px_val(el.get("left", 0)),
                "top": parse_px_val(el.get("top", 0)),
                "width": parse_px_val(el.get("width", 200)),
                "height": parse_px_val(el.get("height", 200))
            }
            break
    
    # 如果沒找到且 tag 是字名，嘗試從 reference 獲取
    if not target_box and component_tag == char_name:
        ref = sketch_config.get("reference")
        if ref:
            target_box = {
                "left": parse_px_val(ref.get("left", 0)),
                "top": parse_px_val(ref.get("top", 0)),
                "width": parse_px_val(ref.get("width", 600)),
                "height": parse_px_val(ref.get("height", 600))
            }

    # 3. Process Image
    try:
        pil_img = Image.open(input_path).convert("RGB")
        img = np.array(pil_img)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"❌ Error: Cannot read input image {input_path}: {e}")
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
    else:
        print("⚠️ No content found to crop.")
        return

    # D. Aspect Ratio Padding
    if target_box:
        target_ratio = target_box['width'] / target_box['height']
        current_h, current_w = img.shape[:2]
        current_ratio = current_w / current_h
        
        if current_ratio > target_ratio:
            new_h = int(current_w / target_ratio)
            pad_y = (new_h - current_h) // 2
            new_img = np.ones((new_h, current_w, 3), dtype=np.uint8) * 255
            new_gray = np.ones((new_h, current_w), dtype=np.uint8) * 255
            new_img[pad_y:pad_y+current_h, :] = img
            new_gray[pad_y:pad_y+current_h, :] = gray
            img, gray = new_img, new_gray
        elif current_ratio < target_ratio:
            new_w = int(current_h * target_ratio)
            pad_x = (new_w - current_w) // 2
            new_img = np.ones((current_h, new_w, 3), dtype=np.uint8) * 255
            new_gray = np.ones((current_h, new_w), dtype=np.uint8) * 255
            new_img[:, pad_x:pad_x+current_w] = img
            new_gray[:, pad_x:pad_x+current_w] = gray
            img, gray = new_img, new_gray

    # E. Output Preparation
    if filename_tag is None: filename_tag = component_tag
    out_filename = f"etymology_{filename_tag}_struct.png" if no_alpha else f"etymology_{filename_tag}_ink.png"
    out_path = os.path.join(char_dir, out_filename)
    
    if no_alpha:
        save_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        Image.fromarray(save_img).save(out_path)
    else:
        alpha = 255 - gray
        alpha[alpha < 30] = 0
        b, g, r = cv2.split(img)
        final_img = cv2.merge([b, g, r, alpha])
        save_img = cv2.cvtColor(final_img, cv2.COLOR_BGRA2RGBA)
        Image.fromarray(save_img).save(out_path)
    
    print(f"✅ Saved component: {out_path}")

    # 4. Update the appropriate JSON
    if no_alpha:
        # Update .sketch_config.json (Design Stage)
        found = False
        for el in sketch_config["elements"]:
            if el.get("image") == out_filename:
                found = True
                break
        if not found:
            new_el = {
                "text": "",
                "image": out_filename,
                "left": target_box['left'] if target_box else 0,
                "top": target_box['top'] if target_box else 0,
                "width": target_box['width'] if target_box else 200,
                "height": target_box['height'] if target_box else 200,
                "note": f"Stage 1 Sketch for {component_tag}"
            }
            sketch_config["elements"].append(new_el)
        with open(sketch_config_path, "w", encoding="utf-8") as f:
            json.dump(sketch_config, f, ensure_ascii=False, indent=2)
        print(f"📝 Updated design file: .sketch_config.json")
    else:
        # Update production_config.json (Final Display Stage)
        prod_config = {}
        if os.path.exists(prod_config_path):
            with open(prod_config_path, "r", encoding="utf-8") as f:
                prod_config = json.load(f)
        
        if "charName" not in prod_config: prod_config["charName"] = char_name
        if "componentExplanations" not in prod_config: prod_config["componentExplanations"] = []
        
        # 尋找 label
        label = component_tag
        for el in sketch_config.get("elements", []):
            if el.get("text") == component_tag and "label" in el:
                label = el["label"]
                break
        if label == component_tag:
             label = sketch_config.get("labelMap", {}).get(component_tag, component_tag)

        found_exp = False
        for exp in prod_config["componentExplanations"]:
            if component_tag in exp.get("components", []):
                exp["image"] = out_filename
                exp["left"] = f"{target_box['left']}px" if target_box else "0px"
                exp["top"] = f"{target_box['top']}px" if target_box else "0px"
                exp["width"] = f"{target_box['width']}px" if target_box else "200px"
                exp["height"] = f"{target_box['height']}px" if target_box else "200px"
                found_exp = True
                break
        
        if not found_exp:
            new_exp = {
                "components": [component_tag],
                "label": label,
                "explanation": "請填寫字源說明...",
                "image": out_filename,
                "left": f"{target_box['left']}px" if target_box else "0px",
                "top": f"{target_box['top']}px" if target_box else "0px",
                "width": f"{target_box['width']}px" if target_box else "200px",
                "height": f"{target_box['height']}px" if target_box else "200px"
            }
            prod_config["componentExplanations"].append(new_exp)
            
        with open(prod_config_path, "w", encoding="utf-8") as f:
            json.dump(prod_config, f, ensure_ascii=False, indent=2)
        print(f"📝 Updated production file: production_config.json")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process Etymology Component Image")
    parser.add_argument("char", help="Character name")
    parser.add_argument("tag", help="Component tag (Chinese)")
    parser.add_argument("path", help="Input image path")
    parser.add_argument("--filename", help="English filename tag")
    parser.add_argument("--no-alpha", action="store_true", help="Keep white background (Stage 1)")
    args = parser.parse_args()
    
    process_component(args.char, args.tag, args.path, args.filename, args.no_alpha)
