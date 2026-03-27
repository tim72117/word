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

## 🚀 整體開發流程大綱 (Overall Development Workflow)
為了確保從「創意開發」到「遊戲發布」的數據一致性與資源正確性，所有開發應遵循以下流程：

### 1. 立項與分析 (Preparation)
*   **字源研究**：在 `characters/` 下建立專屬目錄，並生成核心文件 `info.md`（包含字源說明與 AI 提示詞）。
*   **組件依存度分析**：**優先完成**所有子部件（如一人、一山、一木）的開發，確保基礎資產庫完整，再啟動合體字（如「陣」）的開發。

### 2. 模式選擇與自動化初始化 (Mode & Automation Init)
*   **模式 A（全字模式）**：適用於單一象形字。
*   **模式 B（部件分拆模式）**：**必須先執行**以下自動化初始化步驟：
    1.  **環境環境初始化 (`init_sketch_config.py`)**：執行此腳本，一次性生成 768x1344 的解析參考底圖 `_raw_base.png` 並建立基礎 `.sketch_config.json`。
    2.  **自動結構分析 (`analyze_structure.py`)**：執行此腳本自動辨識影像佈局，並將邊界、座標資訊初步寫入已建立的 `.sketch_config.json`。

### 3. 配置與結構微調 (Sketching)
*   **人工校準**：使用 **Sketch Tool** 開啟該字目錄，以 `_raw_base.png` 為底圖，微調各部件的座標與解析區域。
*   **數據定錨**：確保 `.sketch_config.json` 中的數據（座標、大小）為唯一基準（Source of Truth）。
*   **提示詞寫入 (Prompt Prep)**：**生成圖像前之必要動作**。將由 `info.md` 規劃之 `prompt_sketch` (結構圖提示詞) 與 `prompt_final` (渲染圖提示詞) 寫入 `.sketch_config.json` 部件對應欄位。**提示詞必須包含中英雙語版本**以提升 AI 生成之準確度。
*   **人工確認 (User Confirmation)**：在開始任何 `generate_image` 動作前，**必須將更新後的提示詞與 JSON 配置呈現給使用者，並獲得明確確認後方可執行**。

### 4. 兩階段視覺渲染 (Two-Stage Rendering)
*   根據 `.sketch_config.json` 生成以下圖片：
    *   **階段一**：結構工程圖 (`etymology_[part]_struct.png`)。
    *   **階段二**：藝術渲染圖 (`etymology_[part]_ink.png`)。
*   **透明化處理**：將渲染稿轉為透明背景 PNG 格式。

### 5. 生產整合與測試 (Production & Test)
*   **數據轉錄**：將開發規格的 `.sketch_config.json` 同步至遊戲運行的 `production_config.json`。
*   **整合驗證**：在遊戲 Demo 中載入，驗證動態對位與互動邏輯。

## 核心開發流程決策 (Development Path Selection)
當要進行一個新的中文字開發時，請先根據需求選擇以下其中一個路徑：

### A. 模式一：全字整體開發流程 (Whole Character Mode)
請參閱：[`whole_character_production`](./whole_character_production/SKILL.md)
適用於：較為簡單的字元，或主要展示全字演變的場景。
此模式強調利用 AI 直接生成完整的字源脈絡與藝術底稿，並遵循嚴格的兩階段生成與使用者確認機制。

### B. 模式二：部件分拆開發規範 (Deconstructed / Component Mode)
適用於：複雜字元，或需要在 UI 中進行局部拆解、高解析度獨立展示的場景。
為了讓零散的中文字部件能以高解析度獨立展示，本 Skill 在 `.agent/skills/game_production/scripts/` 資料夾下準備了標準自動化腳本，以及原本位於根目錄的對位腳本。請嚴格遵守以下流程調用：

1. **初期圖像解析與自動化初始化 (Mandatory for Mode B)**：
   - **背景底圖產生**：產生 `_raw_base.png` 作為對位基準。
   - **原始圖像自動裁切 (`analyze_structure.py`)**：啟動 OpenCV 切片分析，建立初步的 `.sketch_config.json`。
   - **DOM 對位預覽與爬蟲截圖 (`sketch_tool/sketch_cli.py`)**：執行自動框選截圖。
2. **高精度單一組件生成 (AI 渲染流程)**：
   - **後端基準尺寸圖提取 (`generate_reference_box.py`)**：執行腳本讀取 `.sketch_config.json` 中目標部件的絕對座標。產生一張完全相同長寬比例的「純白」參考畫布圖。**產出後必須保留，命名為 `reference_[part]_box.png`**，作為所有階段的長寬比基準。
    - **第一階段：結構素描 (Stage 1)**：投入基準圖。要求「極簡工程線稿」、「**純白背景**」、「極細黑線」，**「絕對禁止出現任何現代文字、漢字或標籤」**。此階段產出應**保留白色背景 (Skip Background Removal)**，以作為下一階段 AI 生成的精確參考底稿。產出命名為 `etymology_[part]_struct.png`。
    - **第二階段：國風藝術渲染 (Stage 2)**：**必須投入上一階段產出的 `etymology_[part]_struct.png` 作為參考影像**。將線稿轉化為具備「華麗寫意水墨」與「層次感手遊插畫」美學的藝術品。產出命名為 `etymology_[part]_ink.png`。
    - **亮度去背轉換 (`remove_background.py` 或 `process_etymology_component.py`)**：使用亮度去背腳本處理 AI 生成的影像。**僅針對第二階段產出的 Ink Render 執行去背**，將白底轉為全透明，墨跡呈現真實黑灰半透明層次。
3. **資訊與資源完整保留規範**：
   - **提示詞同步**：將兩階段產出的**中/英文提示詞**完整建檔於該目錄的 `info.md` 中，並**分別同步寫入 `.sketch_config.json` 的對應欄位**（`prompt_sketch`, `prompt_sketch_zh`, `prompt_final`, `prompt_final_zh`）。
   - **嚴禁刪除任何過程圖像**（包括基準框與結構素描），這些資訊對於未來的風格統一與對位微調至關重要。

## 資源命名規範 (Resource Naming Standards)
為了確保資產能被自動化工具準確讀取，並保留具價值的開發軌跡，`characters/[char]/` 目錄下的資源必須遵循以下規則：
- **考古基準底層 (Base Layer)**：`_raw_base.png` (用於背景對焦與基準比例)。
- **結構素描 (Stage 1)**：`etymology_[part]_struct.png` (極簡幾何線稿)。
- **水墨渲染 (Stage 2)**：`etymology_[part]_ink.png` (去背國風渲染圖)。
     - `[part]` 必須使用英文小寫（如：`ear`, `mouth`, `hand`）。

## 數據配置規範 (Data Configuration Standards)
為了確保設計階段（Sketch Tool）與生產階段（Game Demo）的資料銜接順暢且職責清晰，特建立以下雙配置分離規範：

### 1. `.sketch_config.json` (開發/工具規格)
*   **用途**：專供 **Sketch Tool** 編輯器使用，儲存絕對座標、自動化參數與排版數據。
*   **畫布規格**：使用 `canvasSize: [width, height]` (數值陣列) 定義操作空間。
*   **數據精簡化 (Numerical Standard)**：所有長度、座標與字型大小（`left`, `top`, `width`, `height`, `fontSize`）必須使用 **純數值 (Number)**，禁止帶有 `px` 單位字串。
*   **核心欄位定義**：
    *   `reference`: 儲存全字底稿或佈局基準資訊（如 `fontSize`, `left`, `top`），嚴禁混入 `elements`。
    *   `settings`: 包含自動化分析參數（`gap`, `xSearchRange`, `rotationThreshold` 等）。
    *   `labelMap`: 定義部件文字與方位的對應關係（如 `{"阜": "left"}`）。
    *   `deconstructionPlan`: 定義部件的欄位/層次拆解邏輯。
    *   `elements`: 儲存各可見部件的屬性，包含 `text`, `image` (渲染圖檔名), `image_struct` (結構圖檔名), `note` 等。
*   **範例結構**：
    ```json
    {
      "charName": "陣",
      "canvasSize": [768, 1344],
      "bgFilename": "_raw_base.png",
      "reference": { "fontSize": 650, "left": 59, "top": 344 },
      "settings": {
        "labelMap": { "阜": "left", "車": "right" },
        "deconstructionPlan": { "columns": [{ "parts": ["阜"] }, { "parts": ["車"] }] }
      },
      "elements": [
        {
          "text": "車",
          "image": "etymology_chariot_ink.png",
          "image_struct": "etymology_chariot_struct.png",
          "prompt_sketch": "Extremely minimalist engineering line art of ancient chariot...",
          "prompt_sketch_zh": "極簡工程線稿，呈現古代戰車結構...",
          "prompt_final": "High quality final ink render, expressive brushwork...",
          "prompt_final_zh": "高品質最終渲染圖，寫意水墨筆法...",
          "fontSize": 652,
          "left": 287,
          "top": 374,
          "width": 367,
          "height": 593
        }
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
      "bgFilename": "_raw_base.png",
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

## 自動化工具元件 (Automation Utilities)
為了確保所有腳本對設定檔的讀取與寫入邏輯一致，本 Skill 提供了 **`sketch_config_utils.py`** 作為統一的處理元件。

### 核心功能
*   **讀取與儲存**：提供 `load_sketch_config` 與 `save_sketch_config`，自動處理絕對路徑並強制執行數據標準化（移除 px、純數值化）。
*   **座標解析**：提供 `find_component_box` 與 `parse_px_val`，能同時處理新舊格式的座標數據。
*   **生產同步**：提供 `update_production_info`，一鍵將開發階段的座標數據轉錄至生產用的 `production_config.json`。

### 調用建議 (Python)
```python
import sketch_config_utils as sku

# 讀取配置
config = sku.load_sketch_config("陣")
# 獲取部件座標 (left, top, width, height)
box = sku.find_component_box(config, "阜")
# 儲存配置 (自動執行數值標準化)
sku.save_sketch_config("陣", config)
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
