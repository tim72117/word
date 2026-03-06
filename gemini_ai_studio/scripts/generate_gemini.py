import os
import io
import PIL.Image
from google import genai
from google.genai import types
import argparse

def load_env_manually(file_path=".env"):
    """手動解析 .env 檔案"""
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")

# 優先在當前目錄或上層目錄尋找 .env
load_env_manually()
if not os.environ.get("GOOGLE_API_KEY") and not os.environ.get("API_KEY"):
    load_env_manually("../.env")

def generate_gemini_image(prompt, input_image_path=None, output_path="gemini_output.png", aspect_ratio="9:16", candidates=1, layout_only=False):
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
        
        # 針對以圖生圖的引導提示
        if layout_only:
            system_suffix = "\n\n【核心指令：純佈局解析模式】\n1. 請將提供的影像「僅」視為空間座標（Coordinate Map）與物件尺寸（Bounding Boxes）的熱圖。影像本身不包含任何視覺實體內容。\n2. **絕對禁止**：嚴禁複製、描摹或保留原圖中任何原始筆跡、手繪線條、雜訊、底色、或半透明色塊邊緣。最終成像必須是 100% 全新繪製的專業插畫。\n3. **替換邏輯**：請將草圖中的色塊區域「完全替換」為提示詞中描述的高品質 2D 遊戲物件。背景需根據主題全新生成，不可受到原圖黑色背景的干擾。"
        else:
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
    parser.add_argument("--aspect_ratio", type=str, default="9:16", help="寬高比 (如 1:1, 16:9, 9:16)")
    parser.add_argument("--candidates", type=int, default=1, help="生成數量 (1-10)")
    parser.add_argument("--layout_only", action="store_true", help="佈局模式：將輸入圖僅作為位置參考，不保留原始筆觸")
    
    args = parser.parse_args()
    generate_gemini_image(args.prompt, args.input, args.output, args.aspect_ratio, args.candidates, args.layout_only)
