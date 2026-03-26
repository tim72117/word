import cv2
import numpy as np
import os
import sys
import argparse
from PIL import Image

# 加入工具路徑 (從 scripts/ 向上跳一層再進入 .agent/...)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
utils_path = os.path.join(project_root, ".agent", "skills", "game_production", "scripts")
if utils_path not in sys.path: sys.path.append(utils_path)

try:
    import sketch_config_utils as sku
except ImportError:
    print("❌ Error: Cannot find sketch_config_utils.py in .agent/skills/game_production/scripts/")
    sys.exit(1)

def process_component(char_name, component_tag, input_path, filename_tag=None, no_alpha=False):
    """
    影像後製與數據同步：
    1. 讀取配置獲取長寬比
    2. 自動裁剪墨跡並執行 Aspect Ratio Padding
    3. 執行亮度去背並產出透明圖 (Stage 2) 或保留白底 (Stage 1)
    4. 同步更新 .sketch_config.json 與 production_config.json
    """
    char_dir = sku.get_char_dir(char_name)
    sketch_config = sku.load_sketch_config(char_name)
    if not sketch_config:
        print(f"❌ Error: Sketch Config not found for {char_name}")
        return

    # 1. 獲取目標 Box 數據
    target_box = sku.find_component_box(sketch_config, component_tag, char_name)

    # 2. 處理影像
    try:
        pil_img = Image.open(input_path).convert("RGB")
        img = np.array(pil_img)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"❌ Error: Cannot read input image {input_path}: {e}")
        return

    # A. 背景漂白
    img[img > 230] = 255
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    
    # B. 緊密裁切 (Tight Crop)
    coords = cv2.findNonZero(thresh)
    if coords is not None:
        x, y, w, h = cv2.boundingRect(coords)
        img = img[y:y+h, x:x+w]
        gray = gray[y:y+h, x:x+w]
    else:
        print("⚠️ No content found to crop.")
        return

    # C. 依據設計稿比例進行 Padding (Aspect Ratio Padding)
    if target_box:
        target_ratio = target_box['width'] / target_box['height']
        ch, cw = img.shape[:2]
        current_ratio = cw / ch
        
        if current_ratio > target_ratio:
            nh = int(cw / target_ratio)
            py = (nh - ch) // 2
            n_img = np.ones((nh, cw, 3), dtype=np.uint8) * 255
            n_gray = np.ones((nh, cw), dtype=np.uint8) * 255
            n_img[py:py+ch, :] = img
            n_gray[py:py+ch, :] = gray
            img, gray = n_img, n_gray
        elif current_ratio < target_ratio:
            nw = int(ch * target_ratio)
            px = (nw - cw) // 2
            n_img = np.ones((ch, nw, 3), dtype=np.uint8) * 255
            n_gray = np.ones((ch, nw), dtype=np.uint8) * 255
            n_img[:, px:px+cw] = img
            n_gray[:, px:px+cw] = gray
            img, gray = n_img, n_gray

    # D. 產出圖像
    if filename_tag is None: filename_tag = component_tag
    out_filename = f"etymology_{filename_tag}_struct.png" if no_alpha else f"etymology_{filename_tag}_ink.png"
    out_path = sku.get_image_path(char_name, out_filename)
    
    if no_alpha:
        # Stage 1: 送回 PIL 或保留白底
        Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).save(out_path)
    else:
        # Stage 2: 去背處理 (Ink Render)
        alpha = 255 - gray
        alpha[alpha < 30] = 0
        b, g, r = cv2.split(img)
        final_img = cv2.merge([b, g, r, alpha])
        Image.fromarray(cv2.cvtColor(final_img, cv2.COLOR_BGRA2RGBA)).save(out_path)
    
    print(f"✅ Saved component: {out_path}")

    # 3. 同步配置檔案
    if no_alpha:
        # 更新設計配置 (Stage 1)
        sku.update_element_image(sketch_config, component_tag, out_filename, is_struct=True)
        sku.save_sketch_config(char_name, sketch_config)
        print(f"📝 Updated design file (.sketch_config.json)")
    else:
        # 更新生產配置 (Stage 2)
        label = sku.get_label(sketch_config, component_tag)
        sku.update_production_info(char_name, component_tag, out_filename, target_box, label)
        print(f"📝 Updated production file (production_config.json)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process Etymology Component Image")
    parser.add_argument("char", help="Character name")
    parser.add_argument("tag", help="Component tag (Chinese)")
    parser.add_argument("path", help="Input image path")
    parser.add_argument("--filename", help="English filename tag")
    parser.add_argument("--no-alpha", action="store_true", help="Keep white background (Stage 1)")
    args = parser.parse_args()
    
    process_component(args.char, args.tag, args.path, args.filename, args.no_alpha)
