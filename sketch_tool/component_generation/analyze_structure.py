import os
import sys
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def analyze_character_structure(char_name, custom_parts=None):
    # 路徑設定 (向上追溯三層至專案根目錄)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    target_dir = os.path.join(project_root, "characters", char_name)
    os.makedirs(target_dir, exist_ok=True)
    
    config_path = os.path.join(target_dir, ".sketch_config.json")
    
    # 預設全域參數 (Judgment/Mapping 全部集中於此)
    default_settings = {
        "canvasSize": [768, 1344],
        "gap": 6,
        "xSearchRange": [0.3, 0.65],
        "rotationThreshold": 1.5,
        "valleyWindow": 15,
        "valleySpacing": 40,
        "fontName": "TW-Kai-98_1.ttf",
        "labelMap": {}
    }
    
    settings = default_settings.copy()
    decon_plan = None
    
    # [NEW] 嘗試從現有配置讀取 (包含所有智慧對位參數)
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                old_config = json.load(f)
                settings.update(old_config.get("settings", {}))
                decon_plan = old_config.get("deconstructionPlan")
                # 兼容舊版 labelMap 位置
                if "labelMap" in old_config: settings["labelMap"].update(old_config["labelMap"])
                
                if not custom_parts:
                    old_elements = old_config.get("elements", [])
                    custom_parts = [e["text"] for e in old_elements if e.get("note") != "全字參考底稿"]
        except Exception as e:
            print(f"⚠️ 讀取配置時發生錯誤: {e}")

    # 解析參數
    canvas_w, canvas_h = settings["canvasSize"]
    GAP = settings["gap"]
    
    # --- 階段一：影像生成 (PIL) ---
    pil_img = Image.new("L", (canvas_w, canvas_h), 0)
    draw = ImageDraw.Draw(pil_img)
    
    font_dir = os.path.join(project_root, "sketch_tool", "fonts")
    font_path = os.path.join(font_dir, settings["fontName"])
    if not os.path.exists(font_path):
        font_path = os.path.join(font_dir, "MasaFont-Regular.ttf")
        
    if not os.path.exists(font_path): font = ImageFont.load_default()
    else: font = ImageFont.truetype(font_path, 900)

    bbox = draw.textbbox((0, 0), char_name, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (canvas_w - tw)//2, (canvas_h - th)//2 - bbox[1]
    draw.text((tx, ty), char_name, font=font, fill=255)
    
    raw_img_path = os.path.join(target_dir, "_raw_base.png")
    pil_img.save(raw_img_path)
    print(f"🖼️ 已生成原始分析圖: {raw_img_path}")

    # --- 階段二：輪廓分析 (OpenCV) ---
    open_cv_image = np.array(pil_img)
    
    # --- 階段三：結構命名與智慧切分 (核心引擎) ---
    elements = []
    elements.append({
        "text": char_name, "fontFamily": "'MasaFont', cursive",
        "color": "rgba(255, 255, 255, 0.15)", "fontSize": "900px",
        "left": f"{tx:.1f}px", "top": f"{ty:.1f}px",
        "rotateX": 0, "rotateY": 0, "rotateZ": 0,
        "isPhonetic": False, "note": "全字參考底稿"
    })

    def find_best_valleys(proj, count, search_range=None):
        if count <= 0: return []
        if search_range:
            sub_proj = proj[int(search_range[0]):int(search_range[1])]
            offset = int(search_range[0])
        else:
            sub_proj = proj
            offset = 0
            
        possible = []
        win = settings["valleyWindow"]
        for i in range(win, len(sub_proj)-win):
            if sub_proj[i] == min(sub_proj[i-win:i+win]):
                if not possible or abs(i - possible[-1]) > settings["valleySpacing"]:
                    possible.append(i + offset)
        possible.sort(key=lambda idx: proj[idx])
        return sorted(possible[:count])

    # 構建或獲取解構計畫
    if not decon_plan and custom_parts:
        # 預設為全字單一垂直欄位拆分 (若需複合結構，請於各字 config 中預先定義 decon_plan)
        decon_plan = {"columns": [{"parts": custom_parts}]}

    if decon_plan:
        print(f"📝 執行解構計畫: {json.dumps(decon_plan, ensure_ascii=False)}")
        cols = decon_plan.get("columns", [])
        num_cols = len(cols)
        proj_x = np.sum(open_cv_image > 0, axis=0)
        
        # 尋找 X 軸分欄點 (使用設定中的搜尋範圍)
        x_valleys = []
        if num_cols > 1:
            xr = settings["xSearchRange"]
            x_valleys = find_best_valleys(proj_x, num_cols-1, (canvas_w*xr[0], canvas_w*xr[1]))
        
        x_splits = [0] + x_valleys + [canvas_w]
        y_nz = np.where(np.sum(open_cv_image, axis=1) > 0)[0]
        y_overall_top, y_overall_bot = y_nz[0], y_nz[-1]

        for i, col_info in enumerate(cols):
            xs, xe = x_splits[i], x_splits[i+1]
            col_parts = col_info.get("parts", [])
            col_crop = open_cv_image[y_overall_top:y_overall_bot, xs:xe]
            if np.sum(col_crop) == 0: continue
            
            p_y = np.sum(col_crop > 0, axis=1)
            nz_y = np.where(p_y > 0)[0]
            sy_top, sy_bot = y_overall_top + nz_y[0], y_overall_top + nz_y[-1]
            p_y_crop = p_y[nz_y[0]:nz_y[-1]]
            
            # [NEW] 優先使用手動指定的切分點 (ySplits)
            y_valleys = col_info.get("ySplits")
            if not y_valleys:
                y_valleys = find_best_valleys(p_y_crop, len(col_parts)-1)
            
            y_splits = [0] + y_valleys + [len(p_y_crop)]
            
            for j, p_txt in enumerate(col_parts):
                ys_rel, ye_rel = y_splits[j], y_splits[j+1]
                row_crop = col_crop[ys_rel:ye_rel, :]
                pv, ph = np.sum(row_crop > 0, axis=0), np.sum(row_crop > 0, axis=1)
                nx, ny = np.where(pv > 0)[0], np.where(ph > 0)[0]
                if len(nx) == 0: continue
                
                fx, fw = xs + nx[0], nx[-1] - nx[0]
                fy, fh = sy_top + ys_rel + ny[0] + GAP, ny[-1] - ny[0] - GAP*2
                
                # 基於閾值的旋轉判定 (完全參數化，不再硬編碼特定部首)
                rz = 90 if (fw > fh * settings["rotationThreshold"]) else 0
                
                elements.append({
                    "text": p_txt, "fontFamily": "'MasaFont', cursive", "color": "#ffffff",
                    "fontSize": f"{int(fw*1.1 if rz else fh*1.1)}px",
                    "left": f"{fx}px", "top": f"{fy}px", "width": f"{fw}px", "height": f"{fh}px",
                    "rotateZ": rz, "isPhonetic": False, 
                    "deconstructionMethod": f"plan_col_{i+1}_row_{j+1}",
                    "note": f"計畫解構 (欄{i+1})"
                })
    else:
        # 無計畫回退邏輯 (僅保留基本的輪廓偵測)
        contours, _ = cv2.findContours(open_cv_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes = sorted([cv2.boundingRect(c) for c in contours if cv2.boundingRect(c)[2]>20 and cv2.boundingRect(c)[3]>20], key=lambda b: b[0])
        for i, (bx, by, bw, bh) in enumerate(boxes):
            elements.append({
                "text": f"Part_{i+1}", "fontFamily": "'MasaFont', cursive", "color": "#ffffff",
                "fontSize": f"{int(bh*1.1)}px", "left": f"{bx}px", "top": f"{by}px",
                "width": f"{bw}px", "height": f"{bh}px", "rotateZ": 0, "isPhonetic": False, "note": "自動偵測"
            })

    # --- 階段四：預覽圖生成 (依據配置中的要素進行繪製) ---
    preview_img = cv2.cvtColor(open_cv_image, cv2.COLOR_GRAY2BGR)
    palette = [(0,0,255), (0,255,0), (255,0,0), (0,255,255), (255,0,255), (255,255,0)]
    label_map = settings["labelMap"]
    
    # 繪製所有在計畫中生成的元件方框
    for i, el in enumerate(elements):
        if el.get("note") == "全字參考底稿": continue
        
        # 解析坐標 (統一格式化)
        ex = int(float(el["left"].replace("px","")))
        ey = int(float(el["top"].replace("px","")))
        ew = int(el["width"].replace("px",""))
        eh = int(el["height"].replace("px",""))
        
        # 循環顏色
        color = palette[(i-1)%len(palette)]
        
        # 繪製邊框
        cv2.rectangle(preview_img, (ex, ey), (ex + ew, ey + eh), color, 4)
        
        # 繪製背景發光標籤 (英文)
        raw_text = el.get("text", "?")
        en_label = label_map.get(raw_text, raw_text)
        label_str = f"{en_label} (Z:{el.get('rotateZ',0)})"
        
        cv2.putText(preview_img, label_str, (ex, ey-15), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,0,0), 6)
        cv2.putText(preview_img, label_str, (ex, ey-15), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

    preview_path = os.path.join(target_dir, "_preview_structure.png")
    cv2.imwrite(preview_path, preview_img)
    print(f"📊 已依據配置生成預覽圖: {preview_path}")

    # --- 最終存檔 ---
    final_output = {
        "charName": char_name,
        "bgFilename": "_raw_base.png",
        "deconstructionPlan": decon_plan,
        "labelMap": label_map,
        "elements": elements
    }
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)
    print(f"✅ 完成 '{char_name}' 配置存檔與預覽產出。")

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(1)
    char = sys.argv[1]
    custom_p = sys.argv[2:] if len(sys.argv) > 2 else None
    analyze_character_structure(char, custom_p)
