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

## 工作流程 (Workflow)
- **更新程式碼後強制重整**：若 CSS/JS 更改未生效，請在 `index.html` 的引用路徑後加上版本號（如 `?v=4`）以擊碎瀏覽器快取。
