# Component Generation Scripts (部件生成腳本)

本資料夾包含產出《中文字源》局部解構草圖所必須的自動化影像處理腳本。所有工具均須於專案的 python 虛擬環境 (`.venv`) 下執行。

## 1. 產生實體範圍參考圖 (`generate_reference_box.py`)
提取指定部件在 `sketch_config.json` 中的物理長寬，產出一張同比例的純白參考圖，做為提交給 AI 產圖工具的精準視角與骨架參考框。避免直接網頁截圖引發的視覺幻覺干擾。

**使用方法**：
```bash
python component_generation/generate_reference_box.py --char 聽 --components 十 目 一 --out reference_focus_box.png
```

## 2. 亮度去背轉換 (`remove_background.py`)
將「完全由 AI 產出的水墨渲染草圖」（含有白底）透過反轉亮度 (Luminance Alpha Masking) 的物理運算，轉化為完美具備重疊透視效果的去背圖像。該機制可確保微弱的淡墨與邊緣枯筆都能如實化作漸層透明度。

**使用方法**：
```bash
python component_generation/remove_background.py --src /路徑/到/白底原圖.png --dst ../characters/聽/etymology_全新部件.png
```

## 3. 原始圖像解析與分拆 (`analyze_structure.py`)
原本位於 `analysis/` 資料夾中，現已統一整合至 `component_generation`。功能為分析原始輸入的包含中文字源演化的圖片網格，自動識別內部組件輪廓的邊界，並進行切片與分拆。主要用於專案初期，將複雜的考古圖像分割成可獨立利用的字源部件。

**使用方法**：
```bash
python component_generation/analyze_structure.py
```
