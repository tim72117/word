import os
import sys
from huggingface_hub import snapshot_download
from google.cloud import storage

# 1. 配置
PROJECT_ID = "game-485606"
BUCKET_NAME = "game-485606-mu-tree-staging"
STAGING_FOLDER = "custom_handler/weights"

SDXL_BASE = "stabilityai/stable-diffusion-xl-base-1.0"
CONTROLNET_CANNY = "diffusers/controlnet-canny-sdxl-1.0"
VAE_FIX = "madebyollin/sdxl-vae-fp16-fix"

HF_TOKEN = os.environ.get("HF_TOKEN")

def upload_directory(local_path, gcs_path):
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(BUCKET_NAME)

    for root, dirs, files in os.walk(local_path):
        for file in files:
            local_file = os.path.join(root, file)
            relative_path = os.path.relpath(local_file, local_path)
            blob_path = os.path.join(gcs_path, relative_path).replace("\\", "/")

            blob = bucket.blob(blob_path)
            print(f"Uploading {local_file} -> gs://{BUCKET_NAME}/{blob_path}")
            blob.upload_from_filename(local_file)

def prepare_and_upload():
    if not HF_TOKEN:
        print("Error: HF_TOKEN environment variable not set.")
        return

    # 建立臨時下載目錄 (建議在具有足夠空間的磁碟)
    base_tmp_dir = "models_tmp"
    os.makedirs(base_tmp_dir, exist_ok=True)

    models = [
        {"repo": SDXL_BASE, "folder": "sdxl_base"},
        {"repo": CONTROLNET_CANNY, "folder": "controlnet_canny"},
        {"repo": VAE_FIX, "folder": "vae_fix"},
    ]

    for m in models:
        repo = m["repo"]
        local_dir = os.path.join(base_tmp_dir, m["folder"])
        print(f"\n--- Downloading {repo} ---")

        # 下載權重 (只下載 fp16 且排除無效檔案以節省空間)
        snapshot_download(
            repo_id=repo,
            local_dir=local_dir,
            use_auth_token=HF_TOKEN,
            ignore_patterns=["*.msgpack", "*.bin", "*.ckpt"], # 優先使用 safetensors
            # allow_patterns=["*.json", "*.txt", "*.safetensors", "vae/*", "unet/*", "scheduler/*", "tokenizer*"]
        )

        print(f"--- Uploading {repo} to GCS ---")
        upload_directory(local_dir, f"{STAGING_FOLDER}/{m['folder']}")

if __name__ == "__main__":
    prepare_and_upload()
