"""
analyze_structure.py
專門負責對已初始化的中文字源進行 OpenCV 視覺結構分析。
1. 讀取由 init_sketch_config.py 產出的 .sketch_config.json 與 _raw_base.png。
2. 根據解構計畫 (deconstructionPlan) 或自動偵測，分析部件的精確座標。
3. 更新配置檔，為後續的去背與部件裁切做好準備。
"""

import os
import sys
import json
import numpy as np
import cv2
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple

# 加入工具路徑
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path: sys.path.append(script_dir)
import sketch_config_utils as sku

def get_default_settings() -> Dict[str, Any]:
    """ 回傳分析器預設的視覺參數 """
    return {
        "gap": 6,                    # 容許的最小間隙 (px)
        "xSearchRange": [0.3, 0.65], # 左右結構切分點的搜尋區間 (比例)
        "rotationThreshold": 1.5,    # 當 寬/高 大於此值時，標記為旋轉 90 度 (rotateZ)
        "valleyWindow": 15,          # 尋找投影谷值時的窗口大小
        "valleySpacing": 40,         # 兩個切分點之間的最小距離
        "fontName": "TW-Kai-98_1.ttf",# 預設字體
        "labelMap": {}               # 文字替換表 (例如: "Part_1" -> "橫")
    }

def find_best_valleys(proj: np.ndarray, count: int, settings: Dict[str, Any], search_range: Optional[Tuple[int, int]] = None) -> List[int]:
    """
    在投影數據中尋找最適合的切分點 (Local Minima)
    """
    if count <= 0: return []

    offset = int(search_range[0]) if search_range else 0
    sub_proj = proj[int(search_range[0]):int(search_range[1])] if search_range else proj

    valleys = []
    win = settings["valleyWindow"]
    min_dist = settings["valleySpacing"]

    for i in range(win, len(sub_proj)-win):
        # 檢查是否為局部最小值
        if sub_proj[i] == min(sub_proj[i-win:i+win]):
            # 確保切分點之間有足夠距離
            if not valleys or abs(i + offset - valleys[-1]) > min_dist:
                valleys.append(i + offset)

    # 根據投影強度排序 (選擇最空的點)，並取前 count 個
    valleys.sort(key=lambda idx: proj[idx])
    return sorted(valleys[:count])

def perform_planned_analysis(cv_img: np.ndarray, decon_plan: Dict[str, Any], settings: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    執行「計畫型」解構：依照 decon_plan 指示的欄位進行切分
    """
    elements = []
    h, w = cv_img.shape
    cols = decon_plan.get("columns", [])
    num_cols = len(cols)

    # 1. 計算水平投影進行左右切分 (X-Axis)
    proj_x = np.sum(cv_img > 0, axis=0) # 使用二值化後的投影，避免深淺影響
    xr = settings["xSearchRange"]
    x_valleys = find_best_valleys(proj_x, num_cols-1, settings, (w*xr[0], w*xr[1])) if num_cols > 1 else []
    x_splits = [0] + x_valleys + [w]

    # 2. 找出整體字的上下邊界
    y_nz = np.where(np.sum(cv_img, axis=1) > 0)[0]
    if len(y_nz) == 0: return []
    y_top_limit, y_bot_limit = y_nz[0], y_nz[-1]

    # 3. 逐欄進行垂直切分 (Y-Axis)
    for i, col_info in enumerate(cols):
        xs, xe = x_splits[i], x_splits[i+1]
        col_parts = col_info.get("parts", [])

        # 裁剪該欄區域
        col_crop = cv_img[y_top_limit:y_bot_limit, xs:xe]
        if np.sum(col_crop) == 0: continue

        # 排除該欄內部的空白邊界
        p_y = np.sum(col_crop > 0, axis=1)
        nz_y = np.where(p_y > 0)[0]
        if len(nz_y) == 0: continue

        crop_y_start = y_top_limit + nz_y[0]
        p_y_effective = p_y[nz_y[0]:nz_y[-1]]

        # 尋找垂直切分點
        y_valleys = col_info.get("ySplits") or find_best_valleys(p_y_effective, len(col_parts)-1, settings)
        y_splits = [0] + y_valleys + [len(p_y_effective)]

        for j, part_text in enumerate(col_parts):
            ys_rel, ye_rel = y_splits[j], y_splits[j+1]
            part_crop = col_crop[ys_rel:ye_rel, :]

            # 取得部件的精確 bounding box (排除透明像素)
            pv, ph = np.sum(part_crop > 0, axis=0), np.sum(part_crop > 0, axis=1)
            nx, ny = np.where(pv > 0)[0], np.where(ph > 0)[0]
            if len(nx) == 0: continue

            fx, fw = xs + nx[0], nx[-1] - nx[0]
            fy, fh = crop_y_start + ys_rel + ny[0], ny[-1] - ny[0]

            # 判斷是否需要旋轉 (例如「橫」型部件)
            rz = 90 if (fw > fh * settings["rotationThreshold"]) else 0

            elements.append({
                "text": part_text,
                "image": "",
                "image_struct": "",
                "prompt_sketch": "",
                "prompt_final": "",
                "fontSize": int(fw*1.1 if rz else fh*1.1),
                "left": int(fx),
                "top": int(fy),
                "width": int(fw),
                "height": int(fh),
                "rotateZ": rz,
                "note": f"產自解構計畫 (欄{i+1})"
            })

    return elements

def perform_automatic_analysis(cv_img: np.ndarray, settings: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    執行「自動型」解構：利用連通域偵測 (Contours) 尋找獨立部件
    """
    elements = []
    # 尋找外部輪廓
    contours, _ = cv2.findContours(cv_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # 排序：從左到右，從上到下
    raw_boxes = [cv2.boundingRect(c) for c in contours]
    # 過濾噪音 (太小的框)
    valid_boxes = [b for b in raw_boxes if b[2] > 20 and b[3] > 20]
    valid_boxes.sort(key=lambda b: (b[0] // 50, b[1]))  # 約略分欄後垂直排序

    for i, (bx, by, bw, bh) in enumerate(valid_boxes):
        elements.append({
            "text": f"Part_{i+1}",
            "image": "",
            "image_struct": "",
            "prompt_sketch": "",
            "prompt_final": "",
            "fontSize": int(bh*1.1),
            "left": int(bx),
            "top": int(by),
            "width": int(bw),
            "height": int(bh),
            "note": "自動偵測產出"
        })
    return elements

def analyze_character_structure(char_name: str, custom_parts: Optional[List[str]] = None):
    """ 主流程：分析字樣結構並更新配置檔 """
    target_dir = sku.get_char_dir(char_name)
    config_path = os.path.join(target_dir, ".sketch_config.json")
    raw_img_path = os.path.join(target_dir, "_raw_base.png")

    # 1. 讀取現有配置 (依賴 init_sketch_config.py)
    if not os.path.exists(config_path):
        print(f"❌ 錯誤: '{char_name}' 尚未初始化。請先執行 init_sketch_config.py")
        return

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    # 2. 參數整合
    canvas_size = sku.get_canvas_size(config)
    settings = get_default_settings()
    if "settings" in config:
        settings.update(config["settings"])

    # 處理 labelMap 繼承
    if "labelMap" in config:
        settings["labelMap"].update(config["labelMap"])

    # 3. 處理解構計畫 (deconstructionPlan)
    decon_plan = settings.get("deconstructionPlan")
    if custom_parts:
        # 如果手動傳入部件，則覆寫解構計畫
        if len(custom_parts) == 2:
            decon_plan = {"columns": [{"parts": [custom_parts[0]]}, {"parts": [custom_parts[1]]}]}
        else:
            decon_plan = {"columns": [{"parts": custom_parts}]}

    # 4. 讀取基準圖並轉換
    if not os.path.exists(raw_img_path):
        print(f"❌ 錯誤: 找不到基準圖 {raw_img_path}")
        return

    pil_img = Image.open(raw_img_path).convert("L")
    cv_img = 255 - np.array(pil_img) # 轉為黑底白字以利分析

    # 5. 核心執行分析
    print(f"🔍 正在分析 '{char_name}' 的物理結構...")
    if decon_plan:
        elements = perform_planned_analysis(cv_img, decon_plan, settings)
    else:
        elements = perform_automatic_analysis(cv_img, settings)

    # 6. 更新配置 (保持結構簡潔)
    config["canvasSize"] = canvas_size
    config["elements"] = elements
    settings["deconstructionPlan"] = decon_plan
    config["settings"] = settings

    # 確保 bgFilename 存在 (如果有 init_sketch_config 初始化)
    if not config.get("bgFilename"):
        config["bgFilename"] = "_raw_base.png"

    sku.save_sketch_config(char_name, config)
    print(f"✨ 分析完成！配置已儲存至 {config_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_structure.py <char_name> [part1] [part2] ...")
        sys.exit(1)

    char = sys.argv[1]
    args_p = sys.argv[2:] if len(sys.argv) > 2 else None
    analyze_character_structure(char, args_p)
