# Demo 專案設計邏輯文件

## 1. 核心架構 (Core Architecture)
Demo 採用「數據驅動 (Data-Driven)」的渲染模式，將書法字拆解為多個靜態資產與一份設定檔，實現在 Web 端的動態組裝。

- **資產存放**：每個字擁有獨立目錄（如 `characters/園/`）。
- **配置驅動**：讀取 `.sketch_config.json` 來決定底圖、文字元件位置及其 3D 屬性。

## 2. 圖層堆疊邏輯 (Layering System)
畫布採用 `z-index` 進行精確堆疊，由後至前順序如下：
1. **背景層 (`bg-layer`)**：原始書法底圖或場景圖。
2. **書法墨跡層 (`ink.png`)**：使用者書寫的主體（已在 Sketch Tool 預先進行 3D 旋轉烘焙）。
3. **聲符層 (`ink_phono.png`)**：標記為聲符的墨跡，獨立於主墨跡層以便特殊處理（如變色或點擊）。
4. **文字元件層 (`char-element`)**：使用瀏覽器原生字體渲染的 3D 文字，保留可編輯性與高清晰度。
5. **毛筆刷痕層 (`brush.png`)**：疊加在最上方的筆觸細節。
6. **交互元件層 (`phono-action-btn`)**：動態生成的 UI 按鈕（如發音圖示）。

## 3. 聲符偵測與處理 (Phonetic Component Logic)
聲符功能是本系統的核心擴展，包含以下技術點：

### A. 範圍偵測 (Range Detection)
- **原理**：Sketch Tool 在儲存時會掃描 `ink_phono.png` 的 Alpha 通道（透明度）。
- **算法**：遍歷像素點，找出所有非透明像素的最小與最大 X/Y 座標，計算出「最小外接矩形」。
- **數據**：將此範圍以 `phonoRange` (x, y, width, height) 格式記錄於設定檔。

### B. 動態定位 (Dynamic Positioning)
- **百分比座標**：Demo 讀取 `phonoRange` 後，將其相對於物理畫布（768x1344）轉化為百分比座標（`left`, `top`），確保在各種縮放比例下按鈕位置都能正確指向聲符。
- **3D 景深**：按鈕使用了 `translateZ(5px)`，使其在 CSS 3D 空間中漂浮於卡片表面之上，避免與墨跡層重疊導致的視覺閃爍。

## 4. 互動設計 (Interaction Design)
### A. 發音功能
- **TTS 整合**：點擊喇叭圖示後，程式會從 `config` 中提取 `isPhonetic: true` 的文字，並呼叫瀏覽器的 `Web Speech API` 進行語音合成。

### B. 視覺美學
- **圖示設計**：採用極簡 SVG 線條（stroke-width: 1.8），搭配 `backdrop-filter: blur` (玻璃質感) 與微弱的 `text-shadow` (金色發光)，營造高端科技感與傳統書法的衝突美。
- **反饋動畫**：滑鼠懸停 (Hover) 時 icon 會放大並加深透明度，提供明確的操作暗示。

## 5. 尺寸與比例 (Scale & Ratio)
- **基礎比例**：固定以 768:1344 (9:15.75) 為設計基準。
- **物理渲染**：在 Sketch Tool 匯出時，文字的 3D 旋轉會「烘焙 (Bake)」進 `ink.png` 影像中，確保在 Demo 端不需要複雜的 3D 計算即可獲得完美的預覽效果。
