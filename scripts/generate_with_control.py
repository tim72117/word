import os
import sys
import json
from google import genai
from google.genai import types

def generate_with_control(image_path, prompt, output_path, control_type="scribble", project_id=None, location="asia-east1"):
    """
    使用 Imagen 3 的 Control Reference Image 功能。
    由於 generate_images 不支援 reference_images，切換至 edit_image 介面 (Imagen 3 Control)。
    支援類型: scribble, canny, face_mesh
    """
    client = genai.Client(
        vertexai=True,
        project=project_id or os.environ.get("GOOGLE_CLOUD_PROJECT"),
        location=location
    )

    # 讀取參考影像
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    input_image = types.Image(image_bytes=image_bytes, mime_type="image/png")

    # 對應 Enum 值
    control_map = {
        "scribble": "CONTROL_TYPE_SCRIBBLE",
        "canny": "CONTROL_TYPE_CANNY",
        "face_mesh": "CONTROL_TYPE_FACE_MESH",
        "default": "CONTROL_TYPE_DEFAULT"
    }

    target_control = control_map.get(control_type.lower(), "CONTROL_TYPE_SCRIBBLE")

    print(f"參考影像 (Control Base): {image_path}")
    print(f"原始控制類型: {control_type} -> {target_control}")
    print(f"提示詞: {prompt}")

    try:
        # 使用 edit_image 介面，這通常是 Imagen 3 接收參考圖的地方
        response = client.models.edit_image(
            model="imagen-3.0-capability-001",
            prompt=prompt,
            reference_images=[
                types.ControlReferenceImage(
                    reference_id=1,
                    reference_image=input_image,
                    control_image_config=types.ControlReferenceConfig(
                        control_type=target_control
                    )
                )
            ],
            config=types.EditImageConfig(
                number_of_images=1,
                aspect_ratio="1:1",
                output_mime_type="image/png",
                edit_mode="EDIT_MODE_DEFAULT" # 預設模式，配合 ControlReferenceImage 運作
            )
        )

        if response.generated_images:
            generated_image = response.generated_images[0]
            if os.path.dirname(output_path):
                os.makedirs(os.path.dirname(output_path), exist_ok=True)

            generated_image.image.save(output_path)
            print(f"成功儲存 Controlled 影像至: {output_path}")
        else:
            print("未能生成內容。")

    except Exception as e:
        print(f"執行 Control 生成時發生錯誤: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("用法: python generate_with_control.py <影像路徑> <提示詞> <輸出路徑> <控制類型: scribble|canny> [PROJECT_ID]")
        sys.exit(1)

    img_in = sys.argv[1]
    prompt_text = sys.argv[2]
    out_path = sys.argv[3]
    c_type = sys.argv[4]

    pid = sys.argv[5] if len(sys.argv) > 5 else os.environ.get("GOOGLE_CLOUD_PROJECT")

    if not pid:
        print("錯誤: 未提供 Project ID。")
        sys.exit(1)

    generate_with_control(img_in, prompt_text, out_path, c_type, pid)
