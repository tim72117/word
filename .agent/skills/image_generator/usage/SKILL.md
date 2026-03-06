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
| **Vertex AI** | Complex Transmations | High-precision Img2Img control |
| **Gemini AI Studio** | Fast Iteration | Quick generation and simple prompts |

## Common Workflows

### 1. Generating from Sketch (以圖生圖)
1. 確認草圖路徑（如：`output/sketch_01-4.png`）。
2. 向用戶確認後台工具（Vertex AI 適合精確變形，Gemini AI Studio 適合快速嘗試）。
3. 撰寫 Prompt，明確標註哪些部分需替換（如：白色線條部分轉換為中式邊框）以及哪些部分需留白（如：中央黑色區塊）。
4. 執行產圖腳本並將結果存入 `output/`。

### 2. Style Consistency
Use existing assets as `style_reference` to ensure new images match the game's look (e.g., Chinese style, 2D art).
