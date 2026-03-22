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
## 3. DOM 解析與截圖爬蟲 (`sketch_cli.py`)
原本在外層的自動化截圖兵器，現已統一歸入 `component_generation`。功能為自動啟動瀏覽器、無頭造訪 Sketch Tool 網頁、透過執行 JS 計算各部件絕對的 DOM 邊界，並執行精確裁切與擷取。主要用於初期建立「帶有原底圖」的參考校對檔案。

**使用方法**：
```bash
python component_generation/sketch_cli.py
```
