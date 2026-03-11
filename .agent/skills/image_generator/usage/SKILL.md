---
name: Image Generation Usage
description: User guide for generating game assets using existing tools and choosing between backends.
---

# Image Generation Usage Guide

This skill is for **using** existing tools to generate assets.

## Choosing Your Tool

> [!IMPORTANT]
> When the user asks to "generate an image" or "transform a sketch", **ALWAYS ASK** which backend to use:

| Backend | Best For... | Key Feature |
| :--- | :--- | :--- |
| **Antigravity** | **Fast Iteration & Testing** | **Internal `generate_image` tool**; no setup needed. |
| **Gemini AI Studio** | Scripted Evolution | Python script `generate_gemini.py` for control |
| **Vertex AI** | Complex Transmations | High-precision Img2Img control |

## Testing Phase Standard

> [!TIP]
> Use **Antigravity** for initial concept testing. Once the prompt is stable, you can switch to scripted backends for production consistency.

## How to Call: Antigravity (Internal Tool)

When using **Antigravity**, you utilize the built-in `generate_image` tool. 

### Call Signature
- `Prompt`: Comprehensive description (follow character-specific standards).
- `ImagePaths`: (Optional) Use for **Img2Img** (Sketch -> Final). ALWAYS provide the full path to the reference sketch.
- `ImageName`: Descriptive filename (e.g., `ge_final_render_v2`).

### Usage Example
```json
{
  "ImageName": "character_name_v1",
  "ImagePaths": ["/full/path/to/sketch.png"],
  "Prompt": "Detailed Gongbi style render... (Reference: 參考圖)"
}
```

## How to Call: Scripted Backends
Use the command line to invoke production scripts:
```bash
python3 scripts/generate_gemini.py --prompt "..." --input "path/to/img.png" --layout_only
```

## Common Workflows

### 1. Generating from Sketch (以圖生圖)
1. 確認草圖路徑（如：`output/sketch_01-4.png`）。
2. 向用戶確認後台工具（Vertex AI 適合精確變形，Gemini AI Studio 適合快速嘗試）。
3. 撰寫 Prompt，明確標註哪些部分需替換（如：白色線條部分轉換為中式邊框）以及哪些部分需留白（如：中央黑色區塊）。
4. 執行產圖腳本並將結果存入 `output/`。

### 2. Style Consistency
Use existing assets as `style_reference` to ensure new images match the game's look (e.g., Chinese style, 2D art).
