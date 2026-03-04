import os
from google.cloud import storage

PROJECT_ID = "game-485606"
BUCKET_NAME = "game-485606-mu-tree-staging"
DEST_FOLDER = "custom_handler"

def upload_file(local_path, dest_folder, dest_name):
    storage_client = storage.Client(project=PROJECT_ID)
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(f"{dest_folder}/{dest_name}")
    print(f"正在上傳 {local_path} 到 gs://{BUCKET_NAME}/{dest_folder}/{dest_name}...")
    blob.upload_from_filename(local_path)
    print("上傳成功。")

if __name__ == "__main__":
    # 上傳 SDXL ControlNet 處理器
    print("--- 上傳 SDXL ControlNet 程式碼 ---")
    upload_file("scripts/handler.py", "custom_handler", "handler.py")
    upload_file("scripts/output_utils.py", "custom_handler", "output_utils.py")
    upload_file("scripts/requirements.txt", "custom_handler", "requirements.txt")
