import os
import sys
import json
from google import genai
from google.genai import types

def load_prompts():
    prompts_file = os.path.join(os.path.dirname(__file__), "prompts.json")
    try:
        with open(prompts_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"警告: 無法讀取提示詞檔案 ({e})，使用空配置。")
        return {}

def morph_image(input_image_path, prompt_text, output_path, guidance_scale=None, project_id=None, location="asia-east1"):
    """
    通用影像演變函式，支援傳遞 [1] 標籤以強化對參考圖的貼合度。
    """
    client = genai.Client(
        vertexai=True,
        project=project_id or os.environ.get("GOOGLE_CLOUD_PROJECT"),
        location=location
    )

    # 讀取原始影像
    with open(input_image_path, "rb") as f:
        input_image_bytes = f.read()

    input_image = types.Image(image_bytes=input_image_bytes, mime_type="image/png")

    # 自動補強提示詞：如果提示詞中沒有 [1] 但有提供參考圖，嘗試從 prompts.json 獲取 adherence_suffix
    prompts_data = load_prompts()
    if "[1]" not in prompt_text:
        suffix = prompts_data.get("adherence_suffix", "")
        if suffix:
            prompt_text = f"{prompt_text} {suffix}"

    print(f"原始影像: {input_image_path}")
    print(f"提示詞: {prompt_text}")
    print(f"Guidance Scale: {guidance_scale if guidance_scale is not None else '預設 (Default)'}")
    print(f"輸出路徑: {output_path}")

    try:
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
                edit_mode="EDIT_MODE_DEFAULT",
                aspect_ratio="1:1",
                output_mime_type="image/png",
                guidance_scale=guidance_scale
            )
        )

        if response.generated_images:
            generated_image = response.generated_images[0]
            if os.path.dirname(output_path):
                os.makedirs(os.path.dirname(output_path), exist_ok=True)

            generated_image.image.save(output_path)
            print(f"成功儲存演變圖像至: {output_path}")
        else:
            print("未能生成內容。")

    except Exception as e:
        print(f"執行演變時發生錯誤: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("用法: python morph_images.py <原始影像路徑> <提示詞> <輸出路徑> [GUIDANCE_SCALE] [PROJECT_ID]")
        sys.exit(1)

    in_path = sys.argv[1]
    prompt = sys.argv[2]
    out_path = sys.argv[3]

    # 處理 GUIDANCE_SCALE 與 PROJECT_ID
    g_scale = None
    proj_id = None

    if len(sys.argv) > 4:
        try:
            g_scale = float(sys.argv[4])
        except ValueError:
            proj_id = sys.argv[4]

    if len(sys.argv) > 5 and proj_id is None:
        proj_id = sys.argv[5]

    proj_id = proj_id or os.environ.get("GOOGLE_CLOUD_PROJECT")

    if not proj_id:
        print("錯誤: 未提供 Project ID。")
        sys.exit(1)

    morph_image(in_path, prompt, out_path, g_scale, proj_id)
