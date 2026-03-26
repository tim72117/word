import os
import sys
import numpy as np
from PIL import Image

# 加入工具路徑
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path: sys.path.append(script_dir)
import sketch_config_utils as sku

def generate_reference(char_name, component_tag):
    # 1. 讀取配置
    config = sku.load_sketch_config(char_name)
    if not config:
        print(f"❌ 找不到 '{char_name}' 的配置檔案。")
        return

    # 2. 獲取部件座標
    box = sku.find_component_box(config, component_tag, char_name)
    if not box:
        print(f"⚠️ 在配置中找不到部件 '{component_tag}'。")
        return

    # 3. 產生純白參考圖 (符合目標長寬)
    w, h = box["width"], box["height"]
    ref_img = Image.new("RGB", (w, h), (255, 255, 255))
    
    # 4. 儲存
    out_filename = f"reference_{component_tag}_box.png"
    out_path = sku.get_image_path(char_name, out_filename)
    ref_img.save(out_path)
    
    print(f"✅ 已產生參考基準圖: {out_path} ({w}x{h})")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_reference_box.py [char] [tag]")
        sys.exit(1)
    generate_reference(sys.argv[1], sys.argv[2])
