---
name: Sketch Tool Development
description: 關於 Sketch Tool 的開發維護、佈局修正與繪圖邏輯故障排除。
---

# Sketch Tool 開發指南

## 核心功能
- 提供 720x1280 解析度的畫布進行草圖繪製。
- 支援自動儲存、歷史紀錄與圖檔下載。

## Troubleshooting (故障排除紀錄)

### 1. 畫布佔滿螢幕導致工具列消失
- **現象**：畫布高度固定為 1280px，在較小螢幕上會將 Header 與 Toolbar 推至視窗外。
- **解決方案**：
  - 將畫布容器（`.canvas-wrapper`）設為 `height: 65vh` 並配合 `aspect-ratio: 726 / 1286`。
  - 將 `body` 的 `align-items` 從 `center` 改為 `flex-start` 並允許 `overflow: auto`。

### 2. 筆刷粗細失效 (lineWidth = NaN)
- **現象**：繪圖時完全沒有線條。
- **原因**：程式碼中使用 `canvas.style.width` 進行計算，但該屬性在 CSS 外部定義時為空字串，導致 `parseFloat("")` 為 `NaN`。
- **解決方案**：改用 `canvas.clientWidth` 獲取實際顯示寬度。

### 3. 事件監聽失效 (ReferenceError)
- **現象**：頁面載入後完全無法繪圖，主控台反應 `resizeCanvas is not defined`。
- **原因**：腳本中呼叫了已被移除或未定義的 `resizeCanvas` 函式，導致 JS 執行中斷，未完成 `addEventListener`。
- **解決方案**：移除所有對 `resizeCanvas` 的無效引用。

### 4. 後端 (server.py) 更改未生效
- **現象**：修改了 Python 的儲存邏輯或路徑，但執行結果仍與舊版相同。
- **原因**：`http.server` 與 `socketserver` 不具備自動重新載入（Hot-Reload）功能，已啟動的處理程序會保留舊的程式碼。
- **解決方案**：必須手動手動中斷（Ctrl+C）並重新啟動 `python3 server.py`。

## CLI 控制方案 (AI-Native Remote Control)
本工具支援透過指令行進行遠端控制，預設通訊埠號為 **8001**。

### 內建指令
使用方式：`python3 sketch_cli.py <command> [args]`
- **`ping`**: 測試連線與輪詢狀態。
- **`load <name>`**: 載入工作區。支援直接指定字名（如 `load 聽`）。
- **`save`**: 觸發前端儲存當前工作區狀態。
- **`toggle-regions`**: 切換結構分析範圍（紅框）的顯示。
- **`clear`**: 清除畫布。
- **`screenshot`**: 合併所有圖層並將截圖回傳存為 `snapshot.png`。

### 注意事項
- **埠號衝突**：若看到 `Address already in use`，請執行 `lsof -ti:8001 | xargs kill -9` 後再重新啟動 `server.py`。
- **字元編碼**：若載入中文字元失敗，請檢查 `server.py` 是否已正確使用 `unquote` 解碼 URL。

## 工作流程 (Workflow)
- **CLI 優先驗證**：AI 必須優先使用 `sketch_cli.py` 進行工作區載入與視覺回饋 (Screenshot) 驗證。
- **更新後端後手動重啟**：每次修改 `server.py` 後，必須使用 `lsof -ti:8001 | xargs kill -9` 後再重啟。
- **更新前端後強制重整**：若 CSS/JS 更改未生效，請在 `index.html` 的引用路徑後加上版本號。

## 字源意境合成規範 (Etymology Visualization)
當需要將「意境草圖 (Sketch)」與「部件底稿 (Calligraphy)」合成時，必須遵循以下技術規範以確保視覺連貫性。

### 1. 素材生成與清理
- **背景漂白**：生成的素描素材背景必須為 **純白色 (#FFFFFF)**。即便生成時看起來是白的，也必須在合成前執行像素過濾：`img[img > 230] = 255`。
- **緊湊裁切 (Tight Cropping)**：移除所有多餘的空白區域，將圖案範圍限縮在筆劃邊界，以利於精準對位。
- **特定提示詞**：使用 `PURE SOLID WHITE background`, `NO paper texture`, `NO shadows`, `NO borders` 等關鍵字。

### 2. 自然融合算法 (Blending)
- **禁止直接覆蓋**：嚴禁直接將素描方框覆蓋到底圖上（會造成突兀的白色色塊）。
- **色彩增值 (Multiply Blending)**：使用像素乘法合成：`result = (background * sketch) / 255`。
  - 這會讓白色背景自動消失，讓素描筆觸自然「滲透」到底圖筆劃中。

### 3. 架構預覽與驗證
- **全字淡化**：在進行對位驗證時，底稿全字應設為 **0.15 ~ 0.2** 的透明度（與純白混合）。
- **標註方框**：應同時標註所有部件的 `Bounding Box` 與 `Label`（英譯），確保每一像素的對位皆符合 `.sketch_config.json` 的定義。

### 4. 自動化處理工具 (Standard Pipeline)
專案內建了 `scripts/process_etymology_component.py` 腳本，可一鍵完成上述所有後製工作。

**執行指令範例：**
```bash
python3 scripts/process_etymology_component.py <字名> <部件名> <原始草圖路徑>
# 例如：
python3 scripts/process_etymology_component.py 聽 耳 tmp/raw_ear.png
```

**腳本自動化項目：**
1.  **解析 JSON**：自動尋找該部件的正確座標。
2.  **像素漂白**：移除原始草圖的雜訊背景。
3.  **緊湊裁切**：自動去除圖片四周空白，極大化渲染效率。
4.  **RGBA 轉換**：將亮度轉為透明度，生成真正的去背圖檔。
5.  **配置寫回**：自動更新 `.sketch_config.json`，將新圖片作為互動圖層加入。
