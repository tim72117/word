import os
import sys
from google import genai
from google.genai import types

def generate_image(prompt_text, output_path, project_id=None, location="us-central1"):
    """
    通用生成圖像函式，直接接收提示詞並生成影像。
    """
    client = genai.Client(
        vertexai=True,
        project=project_id or os.environ.get("GOOGLE_CLOUD_PROJECT"),
        location=location
    )

    print(f"提示詞: {prompt_text}")
    print(f"輸出路徑: {output_path}")

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

        if response.generated_images:
            generated_image = response.generated_images[0]
            image_data = getattr(generated_image.image, 'image_bytes', None)

            if image_data:
                # 確保目錄存在
                if os.path.dirname(output_path):
                    os.makedirs(os.path.dirname(output_path), exist_ok=True)

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
        print("用法: python generate_images_vertex.py <提示詞> <輸出路徑> [PROJECT_ID] [LOCATION]")
        sys.exit(1)

    prompt = sys.argv[1]
    out_path = sys.argv[2]
    project = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("GOOGLE_CLOUD_PROJECT")
    loc = sys.argv[4] if len(sys.argv) > 4 else "us-central1"

    if not project:
        print("錯誤: 未提供 Project ID。")
        sys.exit(1)

    generate_image(prompt, out_path, project, loc)
