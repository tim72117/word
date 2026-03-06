---
name: Image Generation Development
description: Technical reference for authoring image generation scripts using Google GenAI SDK (Vertex AI & Gemini API).
---

# Image Generation Development Guide

This skill is for **developers** who need to write or maintain Python scripts for generating images.

## Supported Backends

### 1. Vertex AI (Enterprise)
Best for precise image-to-image (Img2Img) control and project-based authentication.
```python
from google import genai
from google.genai import types

PROJECT_ID = "game-485606"
LOCATION = "asia-east1"
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

# Image-to-Image (Img2Img) using RawReferenceImage
ref_images = [
    types.RawReferenceImage(
        reference_id=1,
        reference_image=types.Image(image_bytes=base_bytes, mime_type='image/png')
    )
]

response = client.models.edit_image(
    model="imagen-3.0-capability-001",
    prompt="Transform this sketch into a Chinese style ornate frame",
    reference_images=ref_images,
    config=types.EditImageConfig(edit_mode='EDIT_MODE_DEFAULT')
)
```

### 2. Gemini AI Studio (Rapid Prototyping)
Best for quick API-key based access.
```python
import os
from google import genai

API_KEY = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY)

response = client.models.generate_images(
    model="imagen-3.0-generate-001",
    prompt="Ornate Chinese style game card frame, gold and jade textures",
    config=types.GenerateImagesConfig(number_of_images=1)
)
```

## Best Practices
- **Cache Busting**: Always append version queries (e.g., `?v=1`) when referencing generated assets in web apps.
- **Reference IDs**: Use `reference_id=1` with `RawReferenceImage` to bypass SDK validation issues.
## Troubleshooting (故障排除紀錄)

### 1. 執行環境缺少 `python-dotenv` 模組
- **現象**：執行產圖腳本時報錯 `ModuleNotFoundError: No module named 'dotenv'`。
- **原因**：目前環境未安裝 `python-dotenv`，且開發者可能不具備安裝權限。
- **解決方案**：在腳本中實作手動解析 `.env` 的函式：
```python
def load_env_manually(file_path=".env"):
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")
```
