import os
import sys
import json
from PIL import Image, ImageDraw, ImageFont

# 加入工具路徑
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path: sys.path.append(script_dir)
import sketch_config_utils as sku

def init_sketch_config(char_name, parts=None, cols=None, font_size=650):
    """
    產生初始的 .sketch_config.json 檔並生預設背景圖 _raw_base.png。
    """
    target_dir = sku.get_char_dir(char_name)
    os.makedirs(target_dir, exist_ok=True)

    # 預設參數
    width, height = 768, 1344
    font_name = "TW-Kai-98_1.ttf"

    font_path = os.path.join(sku.get_project_root(), "sketch_tool", "fonts", font_name)
    if not os.path.exists(font_path):
        font_path = os.path.join(sku.get_project_root(), "sketch_tool", "fonts", "MasaFont-Regular.ttf")

    # --- 階段一：生成背景圖 ---
    pil_img = Image.new("L", (width, height), 255)
    draw = ImageDraw.Draw(pil_img)

    if not os.path.exists(font_path):
        font = ImageFont.load_default()
    else:
        font = ImageFont.truetype(font_path, font_size)

    bbox = draw.textbbox((0, 0), char_name, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (width - tw)//2 - bbox[0], (height - th)//2 - bbox[1]

    draw.text((tx, ty), char_name, font=font, fill=0)

    raw_img_path = os.path.join(target_dir, "_raw_base.png")
    pil_img.save(raw_img_path)
    print(f"🖼️ 已根據字元 '{char_name}' 生成原始背景圖: {raw_img_path}")

    # --- 階段二：生成配置檔 ---
    deconstruction_plan = {"columns": []}
    label_map = {}

    if cols:
        # 範例: --cols "耳,壬" "十目一,心"
        # 產出: columns: [{parts: ["耳","壬"]}, {parts: ["十目一","心"]}]
        for i, col_str in enumerate(cols):
            # 支援以逗點分隔部件，若無逗點則視為單一字串
            col_parts = col_str.split(",") if "," in col_str else [p for p in col_str]
            deconstruction_plan["columns"].append({"parts": col_parts})
            
            # 定義方位標籤 (left, middle, right 等)
            side = "left" if i == 0 else "right" if i == len(cols)-1 else f"col_{i+1}"
            for p_idx, p in enumerate(col_parts):
                pos = "top" if p_idx == 0 else "bottom" if p_idx == len(col_parts)-1 else f"row_{p_idx+1}"
                label_map[p] = f"{side}_{pos}" if len(col_parts) > 1 else side
    else:
        # 回退舊有的 parts 邏輯 (單欄/單列)
        if not parts: parts = []
        if len(parts) == 2:
            deconstruction_plan = {"columns": [{"parts": [parts[0]]}, {"parts": [parts[1]]}]}
            label_map = {parts[0]: "left", parts[1]: "right"}
        elif len(parts) == 3:
            deconstruction_plan = {"columns": [{"parts": [parts[0]]}, {"parts": [parts[1]]}, {"parts": [parts[2]]}]}
            label_map = {parts[0]: "left", parts[1]: "middle", parts[2]: "right"}
        else:
            deconstruction_plan = {"columns": [{"parts": parts}]}
            pos_names = ["top", "middle", "bottom"] if len(parts) <= 3 else [f"part_{i+1}" for i in range(len(parts))]
            for i, p in enumerate(parts):
                label_map[p] = pos_names[i] if i < len(pos_names) else f"part_{i+1}"

    settings = {
        "gap": 6,
        "xSearchRange": [0.3, 0.65],
        "rotationThreshold": 1.5,
        "valleyWindow": 15,
        "valleySpacing": 40,
        "fontName": font_name,
        "labelMap": label_map,
        "deconstructionPlan": deconstruction_plan
    }

    config = {
        "charName": char_name,
        "canvasSize": [width, height],
        "bgFilename": "_raw_base.png",
        "reference": {
            "fontSize": font_size,
            "left": int(tx),
            "top": int(ty),
            "width": int(tw),
            "height": int(th),
            "color": "rgba(255, 255, 255, 0.15)"
        },
        "settings": settings,
        "elements": []
    }

    success = sku.save_sketch_config(char_name, config)
    if success:
        print(f"✅ 已成功初始化 {char_name} 的 .sketch_config.json")
    else:
        print(f"❌ 儲存 {char_name} 的配置失敗")

import argparse

def main():
    parser = argparse.ArgumentParser(description="初始化中文字源 OpenSketch 配置")
    parser.add_argument("char_name", help="中文字元 (例如: 宛)")
    parser.add_argument("parts", nargs="*", help="字元部件 (例如: 宀 夗)")
    parser.add_argument("--cols", nargs="+", help="多欄部件分組 (例如: --cols 耳,壬 十目一,心)")
    parser.add_argument("--font-size", type=int, default=650, help="字元字體大小 (預設: 650)")

    args = parser.parse_args()

    init_sketch_config(args.char_name, parts=args.parts, cols=args.cols, font_size=args.font_size)

if __name__ == "__main__":
    main()
