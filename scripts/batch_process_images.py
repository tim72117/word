import os
import glob
from PIL import Image, ImageOps

def batch_invert_sketches(directory="/Users/caitingyu/Documents/word", pattern="sketch_*.png"):
    """
    掃描目錄中符合 pattern 的所有手繪稿並進行黑白反轉。
    避開已經反轉過的檔案 (*_inverted.png)。
    """
    # 獲取所有符合條件的檔案，排除掉已經反轉過的檔案
    all_files = glob.glob(os.path.join(directory, pattern))
    target_files = [f for f in all_files if "_inverted.png" not in f]
    
    if not target_files:
        print("未發現需要處理的新手繪稿檔案。")
        return

    print(f"發現 {len(target_files)} 個新手繪稿，正在進行批次反轉...")

    for file_path in target_files:
        try:
            filename = os.path.basename(file_path)
            name_part, ext_part = os.path.splitext(filename)
            output_name = f"{name_part}_inverted{ext_part}"
            output_path = os.path.join(directory, output_name)
            
            # 處理影像
            image = Image.open(file_path).convert("RGB")
            inverted_image = ImageOps.invert(image)
            inverted_image.save(output_path)
            
            print(f"  - 已完成: {filename} -> {output_name}")
        except Exception as e:
            print(f"  - 錯誤: 處理 {file_path} 時發生問題: {e}")

    print("\n✅ 批次處理任務完成。")

if __name__ == "__main__":
    batch_invert_sketches()
