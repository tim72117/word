---
name: 遊戲製作 (Game Production)
description: 關於《中文字源》遊戲的製作規範與核心架構。
---

# 遊戲製作規範

## 遊戲核心概念
本遊戲旨在以圖像化的方式介紹中文字的「字源」。
視覺目標定位為「**高階中國風遊戲 (Premium Guofeng Game Art)**」，特徵為：
- **華麗寫意水墨**：保留水墨靈動的筆觸，但增加層次感與細節。
- **精緻材質感**：模擬古蹟絹本或高級宣紙的纖維紋理。
- **典雅金石細節**：局部加入「灑金」或「金屬嵌邊」效果，提升高級感。

## 結構與存妥
- **字源導向**：所有素材開發必須基於字源研究（見 `info.md`）。
- **底層組件優先 (Bottom-Up Logic)**：若目標字由其他常用中文字（部件）構成，應**優先製作該組件字**，建立基礎資產後再進行合體字開發。
- **兩階段生成流程**：
  - 每個字應包含其產生的相關**圖像**（如：甲骨文演變圖、示意圖）。
  - 每個字應包含詳細的**字源說明**。
  - 所有檔案應以該字為目錄或標籤進行存放，確保資料的獨立性與完整性。

## 核心開發流程決策 (Development Path Selection)
當要進行一個新的中文字開發時，請先根據需求選擇以下其中一個路徑：

### A. 模式一：全字整體開發流程 (Whole Character Mode)
適用於：較為簡單的字元，或主要展示全字演變的場景。
1. **建立獨立資料夾**：在專案目錄下為該中文字建立一個專屬資料夾（例如：`characters/宛/`）。
2. **直接生成字源紀錄與示意圖**：
   - **無需手動查詢**：直接利用 Gemini API 的領域知識生成該字的字源說明與視覺示意。
   - 在資料夾下建立 `info.md`，內容由 AI 直接根據其字源知識撰寫。
   - **紀錄提示詞**：在 `info.md` 中記錄所有用於生成該字影像資產的提示詞 (Prompts)。**撰寫規範：若提示詞中需提及參考影像（如 `ImagePaths` 傳入的影像），請統一使用「參考圖」（Reference Image）作為稱呼。**
3. **準備參考草圖** (選填)：
   - 若有特定構圖需求，可先使用 `Sketch Tool` 繪製草圖。
4. **兩階段生成流程與測試規範**：
  - **測試階段 (Testing Phase)**：在正式產圖前，應使用 **Antigravity (內建 `generate_image` 工具)** 進行快速迭代與構圖驗證。**重要規定：在此階段，必須先將擬定的提示詞（中英文版本）提供給使用者確認，且嚴格執行「單階確認制」：除非使用者明確指令，否則禁止在完成草圖後自動執行後續渲染。**
  - **第一階段：黑白結構素描 (Structural Sketch)**：使用 `image_generator` 並開啟 `layout_only` 參數，將彩色佈局草圖轉化為比例精確、線條洗練的黑白素描圖。產出命名為 `etymology_base.png` (或全字參考圖)。
  - **第二階段：最終藝術渲染 (Final Render)**：以上一步生成的黑像素描圖作為參考影像，進行完整的水墨或重彩渲染。

### B. 模式二：部件分拆開發規範 (Deconstructed / Component Mode)
適用於：複雜字元，或需要在 UI 中進行局部拆解、高解析度獨立展示的場景。
為了讓零散的中文字部件能以高解析度獨立展示，專案在 `sketch_tool/component_generation/` 資料夾下準備了標準自動化腳本，以及原本位於根目錄的對位腳本。請嚴格遵守以下流程調用：

1. **初期圖像解析與自動化測量**：
   - **原始圖像自動裁切 (`analyze_structure.py`)**：啟動 OpenCV 切片分析，建立 HTML/Canvas DOM 結構。
   - **DOM 對位預覽與爬蟲截圖 (`sketch_tool/sketch_cli.py`)**：執行自動框選截圖。
2. **高精度單一組件生成 (AI 渲染流程)**：
   - **後端基準尺寸圖提取 (`generate_reference_box.py`)**：執行腳本讀取 `.sketch_config.json` 中目標部件的絕對座標。產生一張完全相同長寬比例的「純白」參考畫布圖。**產出後必須保留，命名為 `reference_[part]_box.png`**，作為所有階段的長寬比基準。
    - **第一階段：結構素描 (Stage 1)**：投入基準圖。要求「極簡工程線稿」、「**純白背景**」、「極細黑線」，**「絕對禁止出現任何現代文字、漢字或標籤」**。此階段產出應**保留白色背景 (Skip Background Removal)**，以作為下一階段 AI 生成的精確參考底稿。產出命名為 `etymology_[part]_struct.png`。
    - **第二階段：國風藝術渲染 (Stage 2)**：**必須投入上一階段產出的 `etymology_[part]_struct.png` 作為參考影像**。將線稿轉化為具備「華麗寫意水墨」與「層次感手遊插畫」美學的藝術品。產出命名為 `etymology_[part]_ink.png`。
    - **亮度去背轉換 (`remove_background.py` 或 `process_etymology_component.py`)**：使用亮度去背腳本處理 AI 生成的影像。**僅針對第二階段產出的 Ink Render 執行去背**，將白底轉為全透明，墨跡呈現真實黑灰半透明層次。
3. **資訊與資源完整保留規範**：
   - 將兩階段生成的**中/英文提示詞**完整建檔於該目錄的 `info.md` 中。
   - **嚴禁刪除任何過程圖像**（包括基準框與結構素描），這些資訊對於未來的風格統一與對位微調至關重要。

## 資源命名規範 (Resource Naming Standards)
為了確保資產能被自動化工具準確讀取，並保留具價值的開發軌跡，`characters/[char]/` 目錄下的資源必須遵循以下規則：
- **考古基準底層 (Base Layer)**：`etymology_base.png` (用於背景對焦與基準比例)。
- **結構素描 (Stage 1)**：`etymology_[part]_struct.png` (極簡幾何線稿)。
- **水墨渲染 (Stage 2)**：`etymology_[part]_ink.png` (去背國風渲染圖)。
     - `[part]` 必須使用英文小寫（如：`ear`, `mouth`, `hand`）。

## 數據配置規範 (Data Configuration Standards)
為了確保設計階段（Sketch Tool）與生產階段（Game Demo）的資料銜接順暢且職責清晰，特建立以下雙配置分離規範：

### 1. `.sketch_config.json` (開發/工具規格)
*   **用途**：專供 **Sketch Tool** 編輯器使用，儲存絕對座標與排版數據。
*   **數據精簡化 (Numerical Standard)**：所有長度、座標與字型大小（`left`, `top`, `width`, `height`, `fontSize`）必須使用 **純數值 (Number)**，禁止帶有 `px` 單位字串。
*   **去 Redundancy**：
    *   若屬性為預設值（如 `rotate` 為 `0`, `isPhonetic` 為 `false`, `color` 為 `#ffffff`），應省略不寫。
    *   **全字參考分離**：全字底稿或佈局基準資訊必須獨立存放在 `reference` 欄位中，嚴禁將其混入 `elements` 數組。
*   **範例結構**：
    ```json
    {
      "charName": "陣",
      "bgFilename": "etymology_base.png",
      "reference": { "fontSize": 650, "left": 59, "top": 344 },
      "elements": [
        { "text": "阜", "label": "Hill", "fontSize": 386, "left": 118, "top": 532 }
      ]
    }
    ```

### 2. `production_config.json` (生產/解說規格)
*   **用途**：專供 **Game Demo** 展示與互動解說使用。
*   **核心欄位**：
    *   `evolution`：字源總體演變描述。
    *   `componentExplanations`：陣列結構之分步解說，每一步包含 `label`, `explanation`, `image` (PNG 路徑) 及該步驟對位用的區域座標。
*   **範例結構**：
    ```json
    {
      "charName": "陣",
      "bgFilename": "etymology_base.png",
      "evolution": "將戰車依據地形有序地排開...",
      "componentExplanations": [
        {
          "components": ["阜"],
          "label": "Hill",
          "explanation": "「阜」代表土山...",
          "image": "etymology_hill_ink.png",
          "left": "118px", "top": "532px", "width": "168px", "height": "351px"
        }
      ]
    }
    ```

## 規範維護原則 (Skill Maintenance Principles)
- **詳盡性優先 (Exhaustive Descriptions)**：除非使用者明確要求簡化規則，否則在修改或重構 `SKILL.md` 時，**絕對禁止簡化或刪除原始的過程描述、技術細節與背景資訊**。這項原則優於任何簡潔性需求，旨在確保後續開發能完整繼承現有的技術資產。

## 5. 常見錯誤與預防 (Common Pitfalls & Prevention)
- **忽視目標字優先資訊 (Neglecting Target Info First)**：
  - **現象**：直接跳過目標合體字（如「聞」）的資訊生成，直接開始製作部件（如「耳」）。
  - **原則**：**先立項，再拆解**。開發合體字時，必須**先完成目標字的 `info.md`**，明確其字源脈絡與視覺構想，隨後再依據「底層組件優先」原則檢查並補齊部件。
- **忽視底層組件優先 (Violating Bottom-Up Logic)**：
  - **現象**：目標字資訊已就緒，但直接開始製作合體字圖像，卻未檢查其基礎組件（如「門」、「耳」）是否具備獨立資產。
  - **後果**：導致字源結構不完整，且無法在遊戲中達成層次分明的拆解效果。
  - **預防機制 (Checkpoint)**：在完成目標字的 `info.md` 後，**必須執行目錄掃描 (`list_dir characters/`)**，確認所有部件資產（`info.md` 與圖像）均已完整。若缺少部件，應補齊基礎部件之資產後，再進行目標合體字的圖像測試與生成。

---
> [!IMPORTANT]
> **語言規範標準**：本專案所有資產（含提示詞、註解、設定檔）**嚴禁使用簡體中文**，必須統一使用**繁體中文**進行撰寫。
