---
name: Image Generation Generator
description: A skill for writing and implementing image generation scripts using the Google GenAI SDK (Imagen 3).
---

# Image Generation Skill (Authoring Guide)

This skill provides a technical reference for writing Python scripts that generate game assets using the我已成功使用新版 `google-genai` SDK 與 Vertex AI (Project: `game-485606`) 生成一系列演變圖像：
- **原始極簡圖**: [test_mu_minimalist.png](file:///Users/caitingyu/Documents/word/test_mu_minimalist.png)
- **演變中間態圖**: [test_mu_transform.png](file:///Users/caitingyu/Documents/word/test_mu_transform.png)
- **影像對影像變形圖 (Img2Img)**: [test_mu_morphed_final.png](file:///Users/caitingyu/Documents/word/test_mu_morphed_final.png)

> [!IMPORTANT]
> 影像變形技術已突破 SDK 驗證限制。透過 `RawReferenceImage` 介面，我們現在能精確地將現有插圖逐步轉化為目標文字結構。
```python
from google import genai
from google.genai import types
import PIL.Image
import io
import os
```

## Implementation Workflow

### 1. Client Initialization
Initialize the GenAI client with Vertex AI support. Use constants for project configuration.
```python
PROJECT_ID = "game-485606"
LOCATION = "asia-east1"

client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
```

### 2. Handling Style References
To maintain visual consistency, use an existing image as a style reference.
```python
def load_style_image(path):
    with open(path, "rb") as f:
        data = f.read()
    return types.Image(data=data, mime_type="image/png")

style_image = load_style_image("path/to/reference.png")
```

### 3. Generation Configuration
Construct the `GenerateImagesConfig` using the `StyleReferenceConfig`.
```python
config = types.GenerateImagesConfig(
    number_of_images=1,
    include_rai_reason=True,
    output_mime_type="image/png",
    style_reference=types.StyleReferenceConfig(
        image=style_image
    )
)
```

### 4. Executing Generation & Saving
Call the model and decode the raw bytes using `PIL`.
```python
response = client.models.generate_images(
    model="imagen-3.0-generate-001",
    prompt="Your descriptive prompt here",
    config=config
)

if response.generated_images:
    image_bytes = response.generated_images[0].image.bytes
    img = PIL.Image.open(io.BytesIO(image_bytes))
    img.save("output_path.png")
```

## Best Practices for Code Authoring
- **Error Handling**: Always implement a try-except block and provide a basic fallback generation (without style reference) if the primary attempt fails.
- **Directory Management**: Ensure the output directory exists using `os.makedirs(exist_ok=True)`.
- **System Instructions**: Include a comment at the top to guide any future LLM iterations (e.g., `# Please always respond in Traditional Chinese`).

## Troubleshooting & Common Issues (故障排除)

### 1. 變數名稱未定義 (NameError)
- **問題**：引用了不存在的 `images` 變數。
- **解決方案**：在新版 SDK 中，回應內容位於 `response.generated_images`。

### 2. 物件屬性缺失 (AttributeError)
- **問題**：`'GeneratedImage' object has no attribute 'image_bytes'`。
- **解決方案**：新版 SDK 的影像資料路徑較深。經 `dir()` 實測，影像資料位於 `.image.image_bytes` 屬性中。
  ```python
  # 正確且安全的存取方式 (Vertex AI 模式)
  generated_image = response.generated_images[0]
  image_data = getattr(generated_image.image, 'image_bytes', None)
  ```

### 3. 初始化模組衝突
- **問題**：同時安裝 `google-cloud-aiplatform` 與 `google-genai` 可能導致導向不一致。
- **解決方案**：在使用 `google-genai` 呼叫 Vertex AI 時，必須確保 `Client(vertexai=True, ...)` 已正確配置，並優先檢查 `GOOGLE_CLOUD_PROJECT` 環境變數。

### 4. 影像演變 (Img2Img) 的正確呼叫方式
- **問題**：使用 `SubjectReferenceImage` 或 `ControlReferenceImage` 時常遭遇 `INVALID_ARGUMENT` 或 `Value error: Cannot set internal reference_type field`。
- **解決方案**：改用更通用的 `RawReferenceImage`。此方式避開了 SDK 對某些預定義參考類型的過度驗證。
  ```python
  # 影像演變的最佳實踐
  ref_images = [
      types.RawReferenceImage(
          reference_id=1,
          reference_image=types.Image(image_bytes=base_bytes, mime_type='image/png')
      )
  ]

  response = client.models.edit_image(
      model="imagen-3.0-capability-001",
      prompt="Your transformation prompt here",
      reference_images=ref_images,
      config=types.EditImageConfig(
          edit_mode='EDIT_MODE_DEFAULT',
          # ... 其他配置
      )
  )
  ```

