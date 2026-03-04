import os
import glob
import sys
import time
from generate_sdxl_vertex import generate_sdxl_morph

def run_batch_inference(endpoint_id="1722697775969206272", project_id="game-485606"):
    """
    掃描所有 *_inverted.png 並批次執行雲端推理。
    """
    directory = "/Users/caitingyu/Documents/word"
    # 尋找所有反轉後的輪廓圖
    inverted_sketches = glob.glob(os.path.join(directory, "*_inverted.png"))
    
    if not inverted_sketches:
        print("未找到反轉後的輪廓圖 (*_inverted.png)，請先執行 batch_process_images.py")
        return

    print(f"🚀 開始批次雲端推理任務，共計 {len(inverted_sketches)} 個檔案...")

    # 定義高品質結構化提示詞
    prompt = "A textured hand-drawn style tree, natural growth, the vertical line is the sturdy trunk, the horizontal line is a thick branch, with sparse twigs and few leaves growing from the thick branches, isolated on a pure white background, highly detailed, organic texture, 8k, masterpiece"
    negative_prompt = "background, landscape, environment, forest, soil, grass, dense leaves, complex background, blurry, low quality"

    for sketch_path in inverted_sketches:
        filename = os.path.basename(sketch_path)
        output_name = filename.replace("_inverted.png", "_result.png")
        output_path = os.path.join(directory, output_name)
        
        print(f"\n正在處理: {filename} -> {output_name}")
        
        # 調用我們先前優化過的推理函數
        try:
            generate_sdxl_morph(
                endpoint_id=endpoint_id,
                input_image_path=sketch_path,
                prompt=prompt,
                output_path=output_path,
                project_id=project_id,
                location="us-central1",
                control_image_path=sketch_path,
                strength=0.5,
                guidance_scale=7.5,
                control_scale=0.82, # 使用我們驗證後的最佳強度
                negative_prompt=negative_prompt,
                num_inference_steps=35
            )
            print(f"✅ 完成生成: {output_name}")
            # 稍微間隔避免過快
            time.sleep(2)
        except Exception as e:
            print(f"❌ 處理 {filename} 時失敗: {e}")

    print("\n🎉 所有批次推理任務已完成！")

if __name__ == "__main__":
    run_batch_inference()
