# Component Generation Scripts (部件生成腳本)

本資料夾包含產出《中文字源》影像資產的自動化處理規範。

## 1. 影像尺寸與畫布規範 (Canvas Standards)
所有字元的考古基準底圖 (`etymology_base.png`) 統一遵循以下規格：
- **畫布尺寸**: `768 x 1344` 像素
- **背景顏色**: **純白色 (Pure White)**
- **內容**: 使用全中字字型 (如 MasaFont) 放入目標文字。
- **字型尺寸 (Reference FontSize)**: 統一為 **`900px`**。

## 2. 常用腳本
- `generate_reference_box.py`: 提取部件基準框。
- `remove_background.py`: 亮度去背。
- `analyze_structure.py`: 考古圖像網格自動拆解。
