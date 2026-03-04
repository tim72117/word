from google.cloud import aiplatform
import os

# --- 參數設定 ---
PROJECT_ID = "game-485606"
REGION = "asia-northeast1"
STAGING_BUCKET = "gs://game-485606-vertex-staging"

aiplatform.init(project=PROJECT_ID, location=REGION, staging_bucket=STAGING_BUCKET)

# --- 定義模型容器環境 ---
# 我們使用 Google 官方預建的 Diffusers 鏡像，這最省事
SERVE_DOCKER_URI = "us-docker.pkg.dev/vertex-ai/vertex-vision-model-garden-dockers/pytorch-diffusers-serve-opt:20240605_1400_RC00"

# 從環境變數讀取 Hugging Face Token (用於訪問 Gated Repo)
HF_TOKEN = os.environ.get("HF_TOKEN")

serving_env = {
    "MODEL_ID": "diffusers/controlnet-canny-sdxl-1.0", # 在 TASK=controlnet 下，此變數被視為 ControlNet 權重
    "TASK": "controlnet",
}

if HF_TOKEN:
    serving_env["HF_TOKEN"] = HF_TOKEN
    serving_env["HUGGING_FACE_HUB_TOKEN"] = HF_TOKEN

# --- 執行部署 ---
def deploy_sdxl_controlnet():
    print("正在將模型配置上傳至 Vertex Model Registry...")
    model = aiplatform.Model.upload(
        display_name="mu-tree-sdxl-controlnet",
        serving_container_image_uri=SERVE_DOCKER_URI,
        serving_container_environment_variables=serving_env,
    )

    print("正在部署至 Endpoint (G2 L4 GPU)...")
    endpoint = model.deploy(
        machine_type="g2-standard-8",
        accelerator_type="NVIDIA_L4",
        accelerator_count=1,
        traffic_split={"0": 100}, # 100% 流量給新模型
    )
    return endpoint

if __name__ == "__main__":
    endpoint = deploy_sdxl_controlnet()
    print(f"部署完成！Endpoint ID: {endpoint.name}")