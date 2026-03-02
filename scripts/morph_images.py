import os
import sys
from google import genai
from google.genai import types

# 注意：執行此腳本前請確保已設定環境變數 GOOGLE_APPLICATION_CREDENTIALS
# 並安裝最新版 SDK: pip install google-genai

def morph_image(input_image_path, character, output_path, project_id=None, location="asia-east1"):
    """
    使用 Edit Image 技術 (Subject Reference)，將輸入影像演變為目標漢字。
    """
    client = genai.Client(
        vertexai=True, 
        project=project_id or os.environ.get("GOOGLE_CLOUD_PROJECT"),
        location=location
    )
    
    # 讀取原始影像
    with open(input_image_path, "rb") as f:
        input_image_bytes = f.read()
    
    # 建立輸入影像物件
    input_image = types.Image(image_bytes=input_image_bytes, mime_type="image/png")
    
    # 定義演變提示詞 (中間態)
    transformation_prompts = {
        "木": "Transform the current tree image into the Chinese character '木'. Make the strokes straight and geometric while keeping the original structure. Minimalist black lines on white background.",
        "山": "Morph these mountain peaks into the Three vertical strokes of the character '山'. Align them onto a horizontal base line. High contrast, clean lines.",
        "水": "Transform the water waves into the vertical stroke and side dots of the character '水'. Abstract calligraphic style.",
        "火": "Simplify the flame into the four strokes of the character '火'. Geometric and sharp edges.",
        "人": "Simplify the person figure into the two sweeping strokes of the character '人'. Maintain the forward-walking skeletal essence."
    }
    
    prompt_text = transformation_prompts.get(character, f"Simplify this image into the Chinese character structure of {character}.")
    
    try:
        # 參考 generate_broken_face.py 的成功模式
        # 使用 RawReferenceImage 避開內部欄位衝突
        response = client.models.edit_image(
            model="imagen-3.0-capability-001",
            prompt=prompt_text,
            reference_images=[
                types.RawReferenceImage(
                    reference_id=1,
                    reference_image=input_image
                )
            ],
            config=types.EditImageConfig(
                number_of_images=1,
                # 使用 INPAINT_INSERTION 作為一種通用的編輯模式 (如果不需遮罩則作用於全局)
                # 或嘗試 EDIT_MODE_DEFAULT
                edit_mode="EDIT_MODE_DEFAULT",
                aspect_ratio="1:1",
                output_mime_type="image/png"
            )
        )
        
        if response.generated_images:
            generated_image = response.generated_images[0]
            # SDK 的 Image 物件直接支援 save 方法
            generated_image.image.save(output_path)
            print(f"成功儲存演變圖像至: {output_path}")
        else:
            print("未能生成內容。")

            
    except Exception as e:
        print(f"執行演變時發生錯誤: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("用法: python morph_images.py <原始影像路徑> <目標漢字> <輸出路徑> [PROJECT_ID]")
        sys.exit(1)
        
    input_path = sys.argv[1]
    char = sys.argv[2]
    out_path = sys.argv[3]
    proj = sys.argv[4] if len(sys.argv) > 4 else os.environ.get("GOOGLE_CLOUD_PROJECT")
    
    if not proj:
        print("錯誤: 未提供 Project ID。")
        sys.exit(1)
        
    morph_image(input_path, char, out_path, proj)
