import base64
import os
from google.cloud import aiplatform
from PIL import Image
import io

PROJECT_ID = "game-485606"
REGION = "us-central1"
ENDPOINT_ID = "1722697775969206272" # 從 v6 部署輸出獲取

def test_vertex_v3():
    aiplatform.init(project=PROJECT_ID, location=REGION)
    endpoint = aiplatform.Endpoint(ENDPOINT_ID)
    
    # 1. 準備測試數據 (使用指定的手繪稿)
    image_path = "/Users/caitingyu/Documents/word/sketch_1772589588298.png"
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read()).decode("utf-8")

    instances = [
        {
            "prompt": "a Chinese character '木' made of ancient tree roots, cinematic lighting, high quality, 8k, highly detailed",
            "negative_prompt": "low quality, blurry, distorted, text, signature",
            "image": img_base64,
            "num_inference_steps": 30,
            "controlnet_conditioning_scale": 1.0
        }
    ]

    # 2. 執行預測
    print(f"正在向雲端端點 {ENDPOINT_ID} 發送請求 (使用手繪稿)...")
    response = endpoint.predict(instances=instances)
    
    # 3. 處理結果並自動下載
    print("收到回傳結果，正在從 GCS 下載影像...")
    client = storage.Client(project=PROJECT_ID)
    for i, prediction in enumerate(response.predictions):
        gcs_uri = prediction.get("gcs_uri")
        message = prediction.get("message")
        print(f"預測 [{i}]: {message}")
        print(f"雲端路徑: {gcs_uri}")
        
        # 下載
        if gcs_uri:
            bucket_name = gcs_uri.split("/")[2]
            blob_path = "/".join(gcs_uri.split("/")[3:])
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            
            output_path = f"sketch_result_{i}.png"
            blob.download_to_filename(output_path)
            print(f"✅ 成果已下載至: {output_path}")

if __name__ == "__main__":
    test_vertex_v3()
