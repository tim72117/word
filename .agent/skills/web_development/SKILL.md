---
name: Web Development Standard
description: 關於本專案的網頁開發規範、UI/UX 美學、Canvas 互動邏輯與伺服器整合。
---

# 網頁開發技術規範

## 1. 視覺與 UI/UX 美學 (Modern Glassmorphism)
為了確保介面具有高級感（Premium Feel），請遵循以下設計原則：
- **毛玻璃效果 (Glassmorphism)**：使用 `backdrop-filter: blur(12px)` 配合半透明背景色 `rgba(255, 255, 255, 0.1)`。
- **色彩系統**：優先使用 HSL 或精選的深色系（如 `--bg-color: #1a1c20`），並搭配動態漸層（Indigo/Violet）。
- **微互動 (Micro-animations)**：按鍵與卡片應具備 `transition: all 0.2s ease` 與 `transform: translateY(-1px)` 的懸停回饋。

## 2. Canvas 互動與多層架構 (Layering)
在開發具備繪圖或標記功能的工具時，應採用多層畫布架構：
- **堆疊邏輯**：使用 CSS `z-index` 與 `position: absolute` 堆疊畫布。
- **穿透與攔截 (Event Routing)**：
  - 隱藏或不活動的圖層設為 `pointer-events: none`。
  - 當前操作圖層設為 `pointer-events: auto`。
- **效能優化**：在 Window Resize 時應謹慎處理 Canvas 重繪，建議使用固定解析度（如 720x1280）並配合 CSS `aspect-ratio` 縮放顯示。

## 3. 字型與素材管理
- **書法與藝術字型**：從 Google Fonts 引用 `Ma Shan Zheng`, `Zhi Mang Xing`, `Noto Serif TC`。
- **快取擊碎 (Cache Busting)**：開發過程中，若 CSS/JS 未更新，請在 `index.html` 引用路徑後加上 `?v=版本號`。

## 4. 伺服器整合 (Python Server Integration)
專案工具通常搭配 Python `SimpleHTTPRequestHandler` 進行本機操作：
- **存檔協議**：前端傳送 Base64 DataURL 至 `/save` 接口。
- **路徑處理**：後端解析 `folder` 與 `filename` 參數，自動在 `characters/` 目錄下建立結構。

## 5. 常見錯誤與排除
- **Canvas `lineWidth` 失效**：若改用 CSS 縮放 Canvas，計算座標與寬度時請務必乘以縮放比例（`canvas.width / canvas.clientWidth`）。
- **對比度問題**：在深色背景下顯示黑色墨跡時，建議使用 CSS `filter: invert(1)` 或 `opacity`進行視覺導航。

## 6. 除錯流程規範 (Debugging Workflow)
- **程式碼優先檢查 (Code-First Inspection)**：當發生功能異常或顯示錯誤時，**必須優先執行程式碼巡檢**，從邏輯層面找出潛在錯誤。
- **瀏覽器測試時機**：只有在無法透過閱讀程式碼找出問題原因時，才啟動瀏覽器進行動態測試或視覺驗證。
