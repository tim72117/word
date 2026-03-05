import os
import io
import PIL.Image
from google import genai
from google.genai import types
import argparse

def generate_gemini_image(prompt, input_image_path=None, output_path="gemini_output.png", aspect_ratio="1:1", candidates=1):
    """
    使用 Google AI Studio (Gemini) 進行影像生成與「以圖生圖」演變。
    """
    # 從 .env 或環境變數讀取 API Key
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("API_KEY")
    if not api_key:
        print("❌ 錯誤: 請設定 GOOGLE_API_KEY 環境變數或確保 .env 檔案中包含 API_KEY。")
        return

    client = genai.Client(api_key=api_key)

    # 預設使用最新的 gemini-2.5-flash-image
    model_id = os.environ.get("GEMINI_MODEL_ID", "gemini-2.5-flash-image")
    
    print(f"🚀 正在連接 Gemini 模型: {model_id}")

    # 配置參數
    config = types.GenerateContentConfig(
        candidate_count=candidates,
        response_modalities=["IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
        )
    )

    contents = [prompt]
    
    if input_image_path and os.path.exists(input_image_path):
        print(f"🖼️  載入參考影像: {input_image_path}")
        img = PIL.Image.open(input_image_path)
        contents.append(img)
        
        # 針對以圖生圖的引導提示 (Gemini 2.5 的影像編輯能力更強)
        system_suffix = "\n\n請根據提供的影像與提示詞，生成高品質的影像。若有參考圖，請維持其核心構圖特徵並進行藝術演變。"
        contents[0] += system_suffix

    print(f"🪄 正在生成影像...")
    
    try:
        response = client.models.generate_content(
            model=model_id,
            contents=contents,
            config=config
        )

        # 處理回傳內容
        image_found = False
        if not response.candidates:
            print("⚠️ 模型未回傳任何候選結果，可能是被安全過濾器攔截。")
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
                print(f"🔍 提示詞反饋: {response.prompt_feedback}")
        elif response.candidates[0].content.parts:
            print(f"DEBUG: Parts found: {len(response.candidates[0].content.parts)}")
            for part in response.candidates[0].content.parts:
                # 檢查是否有 inline_data 或 blob 包含影像
                if hasattr(part, 'inline_data') and part.inline_data:
                    with open(output_path, "wb") as f:
                        f.write(part.inline_data.data)
                    image_found = True
                    break
        
        if image_found:
            print(f"✅ 生成成功！影像已儲存至: {output_path}")
        elif response.candidates:
            print("⚠️ 模型候選結果中未發現影像數據。")
            if response.text:
                print(f"📝 模型回覆文本: {response.text}")

    except Exception as e:
        print(f"❌ 呼叫 API 失敗: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gemini 2.5 Image generation/edit Tool")
    parser.add_argument("--prompt", type=str, required=True, help="影像生成描述詞")
    parser.add_argument("--input", type=str, help="輸入影像路徑 (做為參考或編輯)")
    parser.add_argument("--output", type=str, default="gemini_output.png", help="輸出影像路徑")
    parser.add_argument("--aspect_ratio", type=str, default="1:1", help="寬高比 (如 1:1, 16:9, 9:16)")
    parser.add_argument("--candidates", type=int, default=1, help="生成數量 (1-10)")
    
    args = parser.parse_args()
    generate_gemini_image(args.prompt, args.input, args.output, args.aspect_ratio, args.candidates)
