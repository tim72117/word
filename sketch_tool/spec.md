# Sketch Tool 技術規格書 (Specification)

## 1. 核心畫布與解析度規範
- **動態解析度**：預設為 768 x 1344 px (9:16)，但優先依循該字資料夾下 `.sketch_config.json` 定義的 `width` 與 `height`。
- **物理像素對準**：所有底圖載入、手繪筆跡儲存與最終合成影像均嚴格依循此解析度，以確保在 Demo 介面中達成 1:1 像素清晰度，避免縮放模糊或拉伸歪斜。

## 2. 圖層架構 (Layer Stack)
系統由下至上共分為四個核心顯示層級，維持嚴格的疊加順序：
1. **背景底圖層 (bgCanvas)**：Z-index 1。顯示載入的考古基準圖或自定義背景。**預覽模式下強制設為完全不透明 (Opacity: 1.0)**。
2. **手繪圖層 (sketchCanvas)**：Z-index 2。紀錄並顯示使用者的手部繪畫筆跡，作為字源原始構圖的參考。
3. **部件互動層 (textOverlayContainer)**：Z-index 10。基於 DOM 的互動式文字與影像物件。支持以下功能：
    - **顯示模式切換**：可選擇顯示「結構圖 (Structural Struct)」或「渲染圖 (Ink Render)」。
    - **對位操作**：支持橫向移動、3D 旋轉 (X/Y/Z 軸) 與縮放。
    - **內部構造**：每個 `.text-element` 包含一個 `<span>` (文字標籤) 與一個 `.region-box` (聚光效果佔位符)。
    - **Spotlight 效果**：無圖檔時 (`image: null`)，預覽模式下文字會自動隱藏，並觸發 `.region-box` 的漸進式聚光動畫。
4. **區域紅框層 (regionCanvas)**：Z-index 100。用於自動標示所有部件的範圍 (Bounding Box)。**預覽模式下會自動隱藏，改由組件內部的動態聚光取代**。

## 3. 工作區機制 (Workspace Concept)
為實現「專案化製作」與「資料銜接」，每個字都具備獨立的工作空間。
- **配置檔案**：`.sketch_config.json` (位於 `characters/[字]/` 下)。
- **進階設定格式**：
  ```json
  {
    "charName": "字名",
    "width": 768,
    "height": 1344,
    "bgFilename": "底圖檔名.png",
    "elements": [
      {
        "text": "內容",
        "image": "渲染圖路徑.png",     // 設為 null 則僅執行聚光預覽
        "image_struct": "結構圖路徑.png",
        "fontSize": 399,
        "left": 118,
        "top": 526,
        "width": 168,
        "height": 363,
        "rotateX": 0,                // 支持 X/Y/Z 旋轉軸數據
        "rotateY": 0,
        "rotateZ": 0,
        "isPhonetic": false
      }
    ]
  }
  ```

## 4. 國風動效系統 (Guofeng Effects System)
整合於 `effects.css` 與 `preview_mode.js`，提供高品質的解構預覽體驗：
- **部件登場 (guofengAppear)**：1.8秒。採用前快後慢 (cubic-bezier) 節奏，包含縮放、位移與水墨暈染濾鏡。
- **自然聚焦 (regionFade)**：2.5秒。
    - **形式**：由中心向外擴散的徑向漸層 (Radial-Gradient) 與 100px 的超大擴散陰影 (Box-Shadow)。
    - **特性**：無邊界感、前快後慢。從「清晰背景」逐漸變為「聚焦留白」，最後停駐在聚焦狀態。

## 5. 資產導出與命名規範 (Export Assets)
每次執行「儲存工作區」時，系統會同步產出以下資產：
- **`etymology_base.png`**：考古基準底層。
- **`etymology_[part]_struct.png`**：去背的部件結構素描。
- **`etymology_[part]_ink.png`**：最終的國風水墨渲染圖。
- **`.sketch_config.json`**：紀錄所有絕對座標與旋轉數據的配置。

## 6. 自動化與 UI 連動設計
- **解析度同步**：載入工作區時，畫布、容器與截圖畫布會自動與設定檔同步大小。
- **預覽演繹模式**：依據 `production_config.json` 的步進順序，自動隱藏/開啟對應部件。
- **UI 優化**：
    - **右側屬性面板**：整合 3D 旋轉控制與預覽步進器。
    - **右下角提示框 (Toast)**：系統通知固定於右下角，採 `column-reverse` 堆疊。
    - **自動隱藏機制**：預覽期間自動隱藏縮放把手、刪除按鈕與格線。
- **對位截圖 (CLI)**：支持透過遠端指令進行 1:1 解析度的自動化截圖與指令聯動。

## 7. 伺服器通訊介面 (APIs)
- `POST /list`：取得 characters 目錄下的所有可用字資料夾。
- `POST /load`：讀取特定目錄下的 `.sketch_config.json`。
- `POST /save`：儲存圖檔與配置。
- `GET /poll`：輪詢來自 AI Agent (CLI) 的遠端指令。

## 8. 視覺美學標準 (Visual Standards)
- **字體**：預設採用 **「TW-Kai (全字庫正楷體)」**。
- **風格**：**「Premium Guofeng」** 水墨渲染，重視局部留白與動態呼吸感。
- **光學感官**：模擬自然物理光學，捨棄人造硬邊框，改以光斑與環境淡亮作為視覺導引。
