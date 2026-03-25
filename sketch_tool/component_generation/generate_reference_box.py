import argparse
import json
import cv2
import numpy as np
import os

def main():
    parser = argparse.ArgumentParser(description="Generate a blank reference box for character components.")
    parser.add_argument('--char', required=True, help="Character folder name (e.g., 聽)")
    parser.add_argument('--components', required=True, nargs='+', help="Component texts to find (e.g., 十 目 一)")
    parser.add_argument('--out', required=True, help="Output image filename (e.g., reference_box.png)")
    
    args = parser.parse_args()
    
    # [FIXED] 改為相對於專案根目錄的動態路徑
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    char_dir = os.path.abspath(os.path.join(project_root, 'characters', args.char))
    config_path = os.path.abspath(os.path.join(char_dir, '.sketch_config.json'))
    
    if not os.path.exists(config_path):
        print(f"Error: {config_path} not found.")
        return

    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    def parse_px(val):
        if isinstance(val, (int, float)): return int(val)
        return int(float(str(val).replace('px', '')))

    boxes = []
    for el in config.get('elements', []):
        if el.get('text') in args.components:
            left = parse_px(el['left'])
            top = parse_px(el['top'])
            width = parse_px(el['width'])
            height = parse_px(el['height'])
            boxes.append((left, top, width, height))

    if not boxes:
        print(f"Error: Components {args.components} not found in {config_path}")
        return

    min_x = min([b[0] for b in boxes])
    min_y = min([b[1] for b in boxes])
    max_x = max([b[0] + b[2] for b in boxes])
    max_y = max([b[1] + b[3] for b in boxes])

    overall_width = int(max_x - min_x)
    overall_height = int(max_y - min_y)

    # 建立純白畫布
    img = np.ones((overall_height, overall_width, 3), dtype=np.uint8) * 255
    
    # [FIXED] 使用 PIL 儲存影像以避免中文路徑下 cv2.imwrite 失敗的問題
    from PIL import Image
    out_path = os.path.join(char_dir, args.out)
    Image.fromarray(img).save(out_path)
    print(f"Success: Reference box created at {out_path} ({overall_width}x{overall_height})")

if __name__ == "__main__":
    main()
