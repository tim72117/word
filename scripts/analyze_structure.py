import json
import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def analyze_character_structure(char_name):
    """
    1. 使用 PIL 產生與 Sketch Tool 一致的 768x1344 畫布。
    2. 繪製指定的漢字 (黑底白字)。
    3. 使用 OpenCV 分析輪廓並計算各部件的 Bounding Box。
    4. 將座標格式化為 .sketch_config.json 格式。
    """
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_dir = os.path.join(project_root, "characters", char_name)
    os.makedirs(target_dir, exist_ok=True)
    
    config_path = os.path.join(target_dir, ".sketch_config.json")
    
    # 畫布尺寸規範 (Sketch Tool)
    canvas_w, canvas_h = 768, 1344
    
    # --- 階段一：影像生成 (PIL) ---
    # 建立黑底影像
    pil_img = Image.new("L", (canvas_w, canvas_h), 0)
    draw = ImageDraw.Draw(pil_img)
    
    # 尋找字型路徑 (優先使用 MasaFont-Bold)
    font_dir = os.path.join(project_root, "sketch_tool", "fonts")
    font_path = os.path.join(font_dir, "MasaFont-Bold.ttf")
    if not os.path.exists(font_path):
        # 備用路徑或提示
        print(f"⚠️ 找不到字型檔案: {font_path}，嘗試使用預設字型")
        font = ImageFont.load_default()
    else:
        # 設定較大的字體大小以進行結構分析
        font = ImageFont.truetype(font_path, 900)
    
    # 計算文字位置使其居中 (大致上)
    # textbbox 支援新版 Pillow
    bbox = draw.textbbox((0, 0), char_name, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (canvas_w - tw) // 2 - bbox[0]
    ty = (canvas_h - th) // 2 - bbox[1]
    
    draw.text((tx, ty), char_name, font=font, fill=255)
    
    # 儲存產出的底圖
    raw_img_path = os.path.join(target_dir, "_raw_base.png")
    pil_img.save(raw_img_path)
    print(f"🖼️ 已生成原始分析圖: {raw_img_path}")

    # --- 階段二：結構分析 (OpenCV) ---
    # 轉換為 OpenCV 格式
    open_cv_image = np.array(pil_img)
    
    # 尋找輪廓
    contours, _ = cv2.findContours(open_cv_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bounding_boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 30 and h > 30: # 過濾極小雜訊
            bounding_boxes.append((x, y, w, h))
    
    # 由上而下排序
    bounding_boxes.sort(key=lambda b: b[1])
    
    elements = []
    
    if char_name == "聽":
        # 聽字的傳統拆解：十、目、一、心
        parts = ["十", "目", "一", "心"]
        colors = ["#ff4444", "#ffffff", "#ffffff", "#ffffff"]
        notes = ["疊加於目上的專注準星", "上方核心觀察部件", "中央連貫部件", "底部核心意念部件"]
        fontsizes = ["350px", "500px", "700px", "450px"]
        
        # 若 OpenCV 抓到的區域不符合預期數量 (4個)，則嘗試進行邏輯對應或警告
        # 這裡簡單採用排序對應
        for i, bbox in enumerate(bounding_boxes):
            if i >= len(parts): break
            x, y, w, h = bbox
            elements.append({
                "text": parts[i],
                "fontFamily": "'MasaFont', cursive",
                "color": colors[i],
                "fontSize": fontsizes[i],
                "left": f"{x}px",
                "top": f"{y}px",
                "width": f"{w}px",
                "height": f"{h}px",
                "rotateX": 0, "rotateY": 0, "rotateZ": 0,
                "isPhonetic": False,
                "note": notes[i]
            })
    else:
        # 非「聽」字則採用通用生成
        for i, (x, y, w, h) in enumerate(bounding_boxes):
            elements.append({
                "text": f"部件_{i+1}",
                "left": f"{x}px", "top": f"{y}px",
                "width": f"{w}px", "height": f"{h}px",
                "note": "自動偵測生成"
            })
            
    print(f"ℹ️ OpenCV 偵測到 {len(bounding_boxes)} 個主要部件。")

    config = {
        "charName": char_name,
        "bgFilename": "_raw_base.png",
        "elements": elements
    }
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 完成 '{char_name}' 分析並更新配置至: {config_path}")

if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "聽"
    analyze_character_structure(name)
