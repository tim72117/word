import os
from google.cloud import storage

PROJECT_ID = "game-485606"
BUCKET_NAME = "game-485606-vertex-staging"
DEST_FOLDER = "custom_handler"

def upload_file(local_path, dest_name):
    storage_client = storage.Client(project=PROJECT_ID)
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(f"{DEST_FOLDER}/{dest_name}")
    print(f"正在上傳 {local_path} 到 gs://{BUCKET_NAME}/{DEST_FOLDER}/{dest_name}...")
    blob.upload_from_filename(local_path)
    print("上傳成功。")

if __name__ == "__main__":
    upload_file("scripts/handler.py", "handler.py")
    upload_file("scripts/requirements.txt", "requirements.txt")
