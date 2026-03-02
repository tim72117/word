import os
import sys
from google import genai
from google.genai import types

# 注意：執行此腳本前請確保已設定環境變數 GOOGLE_APPLICATION_CREDENTIALS
# 並安裝最新版 SDK: pip install google-genai

def generate_character_image(character, output_path, project_id=None, location="us-central1"):
    # 使用新版 google-genai SDK，啟動 vertexai 模式
    # 如果 project_id 為 None，SDK 會嘗試從環境變數 GOOGLE_CLOUD_PROJECT 獲取
    client = genai.Client(
        vertexai=True, 
        project=project_id or os.environ.get("GOOGLE_CLOUD_PROJECT"),
        location=location
    )
    
    prompts = {
        "木": "Extremely minimalist pictogram of a single tree, simple clean black lines on a white background. The structure should closely resemble the Chinese character '木' (a vertical trunk with two symmetrical branches and roots). High contrast, iconic educational style. No text.",
        "山": "Extremely minimalist pictogram of three mountain peaks, simple clean black lines on a white background. The structure should closely resemble the Chinese character '山' (three vertical strokes with a horizontal base). High contrast, iconic educational style. No text.",
        "水": "Extremely minimalist pictogram of flowing water ripples, simple clean black lines on a white background. The structure should closely resemble the Chinese character '水' (a central vertical curve with symmetrical splashes). High contrast, iconic educational style. No text.",
        "火": "Extremely minimalist pictogram of a rising flame, simple clean black lines on a white background. The structure should closely resemble the Chinese character '火' (a central flame with two side sparks). High contrast, iconic educational style. No text.",
        "人": "Extremely minimalist pictogram of a person standing, simple clean black lines on a white background. The structure should closely resemble the Chinese character '人' (two simple strokes meeting at the top). High contrast, iconic educational style. No text.",
        "林": "Extremely minimalist pictogram of two trees side by side, simple clean black lines on a white background. The structure should represent the character '林'. Consistent with the '木' pictogram style. No text.",
        "森": "Extremely minimalist pictogram of three trees arranged in a triangle, simple clean black lines on a white background. The structure should represent the character '森'. Consistent with the '木' pictogram style. No text."
    }

    transformation_prompts = {
        "木": "A transitional diagram showing a tree morphing into the Chinese character '木'. The branches and roots are becoming straight, geometric strokes. It is half-way between a tree and the letter-like structure. Clean black lines, white background, minimalist educational style.",
        "山": "A transitional diagram showing three mountain peaks morphing into the Chinese character '山'. The peaks are aligning into three vertical bars connected by a flat base. Half-way between nature and calligraphy. Clean black lines, white background.",
        "水": "A transitional diagram showing flowing water morphing into the Chinese character '水'. The central wave is becoming a vertical stroke with hooks, and side splashes are becoming symmetrical dots/strokes. Clean black lines, white background.",
        "火": "A transitional diagram showing a flame morphing into the Chinese character '火'. The fire petals are straightening into the four strokes of the character. Half-way point of evolution. Clean black lines, white background.",
        "人": "A transitional diagram showing a human silhouette morphing into the Chinese character '人'. The legs and torso are becoming the two sweeping strokes of the character. Minimalist, abstract, clean black lines, white background."
    }
    
    # 決定使用哪種提示詞
    if "transform" in output_path.lower() or "morph" in output_path.lower():
        prompt_text = transformation_prompts.get(character, prompts.get(character))
    else:
        prompt_text = prompts.get(character, f"A minimalist Chinese ink-wash painting of {character}, white background, artistic.")
    
    print(f"正在透過新版 google-genai SDK (Vertex AI) 為「{character}」生成圖像...")
    
    try:
        response = client.models.generate_images(
            model="imagen-3.0-generate-001",
            prompt=prompt_text,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1",
                output_mime_type="image/png"
            )
        )
        
        # 儲存產生的影像
        if response.generated_images:
            generated_image = response.generated_images[0]
            # 根據 dir() 調查結果，資料位於 .image.image_bytes
            image_data = getattr(generated_image.image, 'image_bytes', None)
            
            if image_data:
                with open(output_path, "wb") as f:
                    f.write(image_data)
                print(f"成功儲存圖像至: {output_path}")
            else:
                print("未能從 GeneratedImage.image 獲取影像資料。")
        else:
            print("未能生成內容。")
            
    except Exception as e:
        print(f"生成圖像時發生錯誤: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: python generate_images_vertex.py <漢字> <輸出路徑> [PROJECT_ID] [LOCATION]")
        sys.exit(1)
        
    char = sys.argv[1]
    path = sys.argv[2]
    project = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("GOOGLE_CLOUD_PROJECT")
    loc = sys.argv[4] if len(sys.argv) > 4 else "us-central1"
    
    if not project:
        print("錯誤: 未提供 Project ID。請透過參數或環境變數 GOOGLE_CLOUD_PROJECT 提供。")
        sys.exit(1)
        
    generate_character_image(char, path, project, loc)
