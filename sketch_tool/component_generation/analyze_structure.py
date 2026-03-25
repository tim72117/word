import os
import sys
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def analyze_character_structure(char_name, custom_parts=None):
    # 路徑設定 (向上追溯三層至專案根目錄)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    target_dir = os.path.abspath(os.path.join(project_root, "characters", char_name))
    os.makedirs(target_dir, exist_ok=True)
    
    # 核心設計配置 (設計階段使用)
    sketch_config_path = os.path.join(target_dir, ".sketch_config.json")
    
    # 預設全域參數
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
    
    # 讀取現有設計配置 (不包含正式顯示資料)
    if os.path.exists(sketch_config_path):
        try:
            with open(sketch_config_path, "r", encoding="utf-8") as f:
                old_config = json.load(f)
                settings.update(old_config.get("settings", {}))
                decon_plan = old_config.get("deconstructionPlan")
                if "labelMap" in old_config: settings["labelMap"].update(old_config["labelMap"])
                
                if not custom_parts:
                    old_elements = old_config.get("elements", [])
                    custom_parts = [e["text"] for e in old_elements if e.get("note") == "計畫解構" or e.get("note", "").startswith("計畫解構")]
        except Exception as e:
            print(f"⚠️ 讀取設計配置時發生錯誤: {e}")

    # 解析參數
    canvas_w, canvas_h = settings["canvasSize"]
    GAP = settings["gap"]
    
    # --- 階段一：影像生成 (PIL) ---
    pil_img = Image.new("L", (canvas_w, canvas_h), 255)
    draw = ImageDraw.Draw(pil_img)
    
    font_dir = os.path.join(project_root, "sketch_tool", "fonts")
    font_path = os.path.join(font_dir, settings["fontName"])
    if not os.path.exists(font_path):
        font_path = os.path.join(font_dir, "MasaFont-Regular.ttf")
        
    actual_size = 650
    if not os.path.exists(font_path): 
        font = ImageFont.load_default()
    else: 
        font = ImageFont.truetype(font_path, actual_size)

    bbox = draw.textbbox((0, 0), char_name, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (canvas_w - tw)//2 - bbox[0], (canvas_h - th)//2 - bbox[1]
    draw.text((tx, ty), char_name, font=font, fill=0)
    
    raw_img_path = os.path.join(target_dir, "_raw_base.png")
    pil_img.save(raw_img_path)
    print(f"🖼️ 已生成原始分析圖 (白底黑字): {raw_img_path}")

    # --- 階段二：輪廓分析 (OpenCV) ---
    open_cv_image = 255 - np.array(pil_img)
    
    # --- 階段三：結構命名與智慧切分 ---
    elements = []
    elements.append({
        "text": char_name, "fontFamily": "'MasaFont', cursive",
        "color": "rgba(255, 255, 255, 0.15)", "fontSize": f"{actual_size}px",
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

    if not decon_plan and custom_parts:
        if len(custom_parts) == 2 and tw > th:
            decon_plan = {"columns": [{"parts": [custom_parts[0]]}, {"parts": [custom_parts[1]]}]}
        else:
            decon_plan = {"columns": [{"parts": custom_parts}]}

    if decon_plan:
        print(f"📝 執行解構計畫: {json.dumps(decon_plan, ensure_ascii=False)}")
        cols = decon_plan.get("columns", [])
        num_cols = len(cols)
        proj_x = np.sum(open_cv_image > 0, axis=0)
        
        x_valleys = []
        if num_cols > 1:
            xr = settings["xSearchRange"]
            x_valleys = find_best_valleys(proj_x, num_cols-1, (canvas_w*xr[0], canvas_w*xr[1]))
        
        x_splits = [0] + x_valleys + [canvas_w]
        if len(x_splits) < num_cols + 1:
            x_splits = [int(i * canvas_w / num_cols) for i in range(num_cols + 1)]
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
            
            y_valleys = col_info.get("ySplits")
            if not y_valleys:
                y_valleys = find_best_valleys(p_y_crop, len(col_parts)-1)
            
            y_splits = [0] + y_valleys + [len(p_y_crop)]
            if len(y_splits) < len(col_parts) + 1:
                total_h = len(p_y_crop)
                y_splits = [int(k * total_h / len(col_parts)) for k in range(len(col_parts) + 1)]
            
            for j, p_txt in enumerate(col_parts):
                ys_rel, ye_rel = y_splits[j], y_splits[j+1]
                row_crop = col_crop[ys_rel:ye_rel, :]
                pv, ph = np.sum(row_crop > 0, axis=0), np.sum(row_crop > 0, axis=1)
                nx, ny = np.where(pv > 0)[0], np.where(ph > 0)[0]
                if len(nx) == 0: continue
                
                fx, fw = xs + nx[0], nx[-1] - nx[0]
                fy, fh = sy_top + ys_rel + ny[0], ny[-1] - ny[0]
                
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
                "width": f"{bw}px", "height": f"{bh}px", "rotateZ": 0, "isPhonetic": false, "note": "自動偵測"
            })

    # --- 階段四：預覽圖生成 ---
    preview_img = cv2.cvtColor(open_cv_image, cv2.COLOR_GRAY2BGR)
    palette = [(0,0,255), (0,255,0), (255,0,0), (0,255,255), (255,0,255), (255,255,0)]
    label_map = settings["labelMap"]
    
    for i, el in enumerate(elements):
        if el.get("note") == "全字參考底稿": continue
        
        ex = int(float(el["left"].replace("px","")))
        ey = int(float(el["top"].replace("px","")))
        ew = int(el["width"].replace("px",""))
        eh = int(el["height"].replace("px",""))
        color = palette[(i-1)%len(palette)]
        
        cv2.rectangle(preview_img, (ex, ey), (ex + ew, ey + eh), color, 4)
        
        raw_text = el.get("text", "?")
        en_label = label_map.get(raw_text, raw_text)
        label_str = f"{en_label} (Z:{el.get('rotateZ',0)})"
        
        cv2.putText(preview_img, label_str, (ex, ey-15), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,0,0), 6)
        cv2.putText(preview_img, label_str, (ex, ey-15), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

    preview_path = os.path.join(target_dir, "_preview_structure.png")
    try:
        preview_rgb = cv2.cvtColor(preview_img, cv2.COLOR_BGR2RGB)
        Image.fromarray(preview_rgb).save(preview_path)
        print(f"📊 已依據配置生成預覽圖: {preview_path}")
    except Exception as e:
        print(f"❌ 無法生成預覽圖: {e}")

    # --- 解析預覽圖座標 (輔助) ---
    def parse_px(val):
        if isinstance(val, (int, float)): return int(val)
        return int(float(val.replace("px","")))

    # --- 最終存檔 (簡化格式) ---
    final_elements = []
    reference_data = None
    
    for el in elements:
        if el.get("note") == "全字參考底稿":
            reference_data = {
                "fontSize": parse_px(el["fontSize"]),
                "left": parse_px(el["left"]),
                "top": parse_px(el["top"]),
                "color": el["color"]
            }
        else:
            simple_el = {
                "text": el["text"],
                "fontSize": parse_px(el["fontSize"]),
                "left": parse_px(el["left"]),
                "top": parse_px(el["top"]),
                "width": parse_px(el["width"]),
                "height": parse_px(el["height"])
            }
            if el.get("rotateZ"): simple_el["rotateZ"] = el["rotateZ"]
            if el.get("note"): simple_el["note"] = el["note"]
            
            # 嘗試加入 label
            if el["text"] in label_map:
                simple_el["label"] = label_map[el["text"]]
                
            final_elements.append(simple_el)

    final_output = {
        "charName": char_name,
        "bgFilename": "_raw_base.png",
        "reference": reference_data,
        "elements": final_elements
    }
    
    # 保留部分設計參數以便下次運行
    if settings != default_settings:
        final_output["settings"] = settings
    if decon_plan:
        final_output["deconstructionPlan"] = decon_plan

    with open(sketch_config_path, "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)
    print(f"✅ 完成 '{char_name}' 簡化配置存檔: {os.path.abspath(sketch_config_path)}")

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(1)
    char = sys.argv[1]
    custom_p = sys.argv[2:] if len(sys.argv) > 2 else None
    analyze_character_structure(char, custom_p)
