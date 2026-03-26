import os
import json

def get_project_root():
    """取得專案根目錄 (搜尋 .agent 目錄)"""
    curr = os.path.dirname(os.path.abspath(__file__))
    while curr:
        if os.path.exists(os.path.join(curr, ".agent")): return curr
        parent = os.path.dirname(curr)
        if parent == curr: break
        curr = parent
    return os.getcwd()

def get_char_dir(char_name):
    """取得字元資料夾絕對路徑"""
    return os.path.join(get_project_root(), "characters", char_name)

def parse_px_val(val):
    """將 px 字串或數值統一轉為整數"""
    if val is None: return 0
    if isinstance(val, (int, float)): return int(val)
    if isinstance(val, str):
        if not val.strip(): return 0
        try: return int(float(val.replace("px", "").strip()))
        except: return 0
    return 0

def to_px(val):
    """確保數值帶有 px 單位 (生產階段用)"""
    return f"{parse_px_val(val)}px"

def get_canvas_size(config):
    """從配置中獲取畫布大小 (優先採用 root 目錄設定)"""
    if not config: return [768, 1344]
    cs = config.get("canvasSize") or config.get("settings", {}).get("canvasSize")
    if cs: return [parse_px_val(x) for x in cs]
    return [768, 1344]

def load_sketch_config(char_name):
    """讀取 .sketch_config.json"""
    path = os.path.join(get_char_dir(char_name), ".sketch_config.json")
    if not os.path.exists(path): return None
    try:
        with open(path, "r", encoding="utf-8") as f: return json.load(f)
    except: return None

def save_sketch_config(char_name, config):
    """儲存 .sketch_config.json 並執行數值標準化"""
    char_dir = get_char_dir(char_name)
    os.makedirs(char_dir, exist_ok=True)
    path = os.path.join(char_dir, ".sketch_config.json")
    
    # 數據精簡化 (Numerical Standard)
    if "canvasSize" in config:
        config["canvasSize"] = [parse_px_val(x) for x in config["canvasSize"]]
    if "reference" in config and config["reference"]:
        ref = config["reference"]
        for k in ["fontSize", "left", "top", "width", "height"]:
            if k in ref: ref[k] = parse_px_val(ref[k])
    if "elements" in config:
        for el in config["elements"]:
            for k in ["fontSize", "left", "top", "width", "height"]:
                if k in el: el[k] = parse_px_val(el[k])
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"❌ Save Failed: {e}")
        return False

def load_production_config(char_name):
    """讀取 production_config.json"""
    path = os.path.join(get_char_dir(char_name), "production_config.json")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f: return json.load(f)
        except: pass
    return {}

def save_production_config(char_name, config):
    """儲存 production_config.json"""
    path = os.path.join(get_char_dir(char_name), "production_config.json")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        return True
    except: return False

def find_component_box(sketch_config, component_tag, char_name=None):
    """在配置中尋找部件座標 (支援回退至全字參考)"""
    if not sketch_config: return None
    elements = sketch_config.get("elements", [])
    for el in elements:
        if el.get("text") == component_tag:
            return {
                "left": parse_px_val(el.get("left", 0)),
                "top": parse_px_val(el.get("top", 0)),
                "width": parse_px_val(el.get("width", 200)),
                "height": parse_px_val(el.get("height", 200))
            }
    if char_name and component_tag == char_name:
        ref = sketch_config.get("reference")
        if ref:
            return {
                "left": parse_px_val(ref.get("left", 0)),
                "top": parse_px_val(ref.get("top", 0)),
                "width": parse_px_val(ref.get("width", 600)),
                "height": parse_px_val(ref.get("height", 600))
            }
    return None

def update_element_image(sketch_config, component_tag, image_filename, is_struct=False):
    """更新 element 的影像連結 (設計階段)"""
    found = False
    for el in sketch_config.get("elements", []):
        if el.get("text") == component_tag:
            if is_struct: el["image_struct"] = image_filename
            else: el["image"] = image_filename
            found = True
            break
    if not found:
        new_el = {"text": component_tag, "image": image_filename, "note": "Sync from script"}
        if is_struct: new_el["image_struct"] = image_filename
        if "elements" not in sketch_config: sketch_config["elements"] = []
        sketch_config["elements"].append(new_el)
    return sketch_config

def get_label(sketch_config, char):
    """獲獲取部件的英文標籤"""
    if not sketch_config: return char
    for el in sketch_config.get("elements", []):
        if el.get("text") == char and "label" in el: return el["label"]
    return sketch_config.get("labelMap", {}).get(char, char)

def update_production_info(char_name, component_tag, image_filename, box, label=None):
    """更新 production_config.json 的資訊"""
    config = load_production_config(char_name)
    if "charName" not in config: config["charName"] = char_name
    if "componentExplanations" not in config: config["componentExplanations"] = []
    found = False
    for exp in config["componentExplanations"]:
        if component_tag in exp.get("components", []):
            exp["image"] = image_filename
            if box:
                exp["left"] = to_px(box["left"])
                exp["top"] = to_px(box["top"])
                exp["width"] = to_px(box["width"])
                exp["height"] = to_px(box["height"])
            found = True
            break
    if not found:
        new_exp = {
            "components": [component_tag],
            "label": label or component_tag,
            "explanation": "請填寫字源說明...",
            "image": image_filename,
            "left": to_px(box["left"]) if box else "0px",
            "top": to_px(box["top"]) if box else "0px",
            "width": to_px(box["width"]) if box else "200px",
            "height": to_px(box["height"]) if box else "200px"
        }
        config["componentExplanations"].append(new_exp)
    save_production_config(char_name, config)

def get_image_path(char_name, filename):
    """取得影像絕對路徑"""
    return os.path.join(get_char_dir(char_name), filename)
