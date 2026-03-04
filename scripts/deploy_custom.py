import os
from google.cloud import aiplatform

# 1. 專案參數
PROJECT_ID = "game-485606"
REGION = "us-central1"
STAGING_BUCKET = "gs://game-485606-vertex-staging"
HF_TOKEN = os.environ.get("HF_TOKEN")
if not HF_TOKEN:
    raise ValueError("請先設定 HF_TOKEN 環境變數 (export HF_TOKEN='your_token')")

aiplatform.init(project=PROJECT_ID, location=REGION, staging_bucket=STAGING_BUCKET)

# 2. 容器配置
# 使用官方 Hugging Face Inference DLC，它支援自動加載 artifact_uri 中的 handler.py
MODEL_NAME = "mu-tree-sdxl-controlnet-custom-v3"
SERVE_DOCKER_URI = "us-docker.pkg.dev/deeplearning-platform-release/gcr.io/huggingface-pytorch-inference-cu121.2-2.transformers.4-44.ubuntu2204.py311"

# 自定義 handler 存放於 GCS 的路徑 (此資料夾應包含 handler.py)
CUSTOM_HANDLER_GCS_PATH = f"{STAGING_BUCKET}/custom_handler/"

# 3. 註冊模型 (Vertex AI Model Registry)
print(f"正在註冊模型: {MODEL_NAME}...")
model = aiplatform.Model.upload(
    display_name=MODEL_NAME,
    serving_container_image_uri=SERVE_DOCKER_URI,
    serving_container_environment_variables={
        "MODEL_ID": "stabilityai/stable-diffusion-xl-base-1.0",
        "CONTROLNET_ID": "diffusers/controlnet-canny-sdxl-1.0",
        "HF_TOKEN": HF_TOKEN,
        # HF DLC 會自動偵測 handler.py，無需設定 TASK="custom"
    },
    artifact_uri=CUSTOM_HANDLER_GCS_PATH,
)

# 4. 部署至端點
print(f"正在部署模型至端點 (GPU: NVIDIA_L4)...")
endpoint = model.deploy(
    machine_type="g2-standard-8",
    accelerator_type="NVIDIA_L4",
    accelerator_count=1,
    traffic_split={"0": 100},
)

print(f"部署完成！端點 ID: {endpoint.resource_name}")
