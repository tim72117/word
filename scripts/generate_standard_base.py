import PIL.Image as Image
import PIL.ImageDraw as ImageDraw
import PIL.ImageFont as ImageFont
import os
import argparse

def generate_base(char_str, output_path, font_path, font_size=900, width=768, height=1344):
    # 建立純白畫布
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    # 載入字型
    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception as e:
        print(f"Error loading font: {e}")
        return

    # 計算文字位置 (居中)
    # 使用 textbbox 取得邊界 (Pillow 8.0+)
    bbox = draw.textbbox((0, 0), char_str, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (width - text_width) / 2 - bbox[0]
    y = (height - text_height) / 2 - bbox[1]
    
    # 繪製文字 (黑色)
    draw.text((x, y), char_str, fill='black', font=font)
    
    # 儲存
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"Success: {output_path} generated ({width}x{height})")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--char", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--font", default="/Users/caitingyu/Documents/word/sketch_tool/fonts/TW-Kai-98_1.ttf")
    args = parser.parse_args()
    
    generate_base(args.char, args.out, args.font)
