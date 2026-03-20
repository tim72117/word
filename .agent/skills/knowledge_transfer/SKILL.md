---
name: 知識傳承與 Skill 規範 (Knowledge Transfer & Skill Standards)
description: 規範所有專屬 Skill 的修改方式與時機，確保專案開發中的技術資產與標準一致性。
---

# 知識傳承與 Skill 變更規範 (Knowledge Transfer & Skill Standards)

本 Skill 之核心用途為**規範其他專屬 Skill 的修改方式與時機**，並記錄開發過程中的技術資產，確保專案標準的一致性。

## 1. Skill 修改準則 (Modification Standards)
- **修改時機**：
  - 當開發流程達成新的階段性共識時（如：確定「嚴禁簡體中文」作為全局標準）。
  - 當特定 Skill 的工具調用方式、SDK 規範或工作流（Workflow）發生變更時。
  - 當遇到重大錯誤（Troubleshooting）且已有明確解決方案時。
- **修改方式**：
  - **精確性**：精確的更改需要變更的部分，不要過度調整不相關的項目。
  - **一致性**：所有增補內容必須嚴格遵循**繁體中文**規範。
  - **優先權原則**：優先將變更寫入受影響的專屬 Skill（如 `image_generator`），本 Skill 則負責記錄通用的變更邏輯。

## 2. 核心紀錄指令
1. **主動偵測與同步**：每當流程規範發生變動，應立即同步更新對應的專屬 Skill 及本知識庫。
2. **記錄放置邏輯**：
   - **專屬 Skill 優先**：若變更屬於特定領域（如 `game_production`），應直接更新該 Skill 的 `SKILL.md`。
   - **通用技術紀錄**：若變更屬於通用環境或無對應專屬 Skill，則記錄在 `resources/` 下。
3. **結構化記錄內容**：
   - **問題背景**：錯誤發生的環境與上下文。
   - **錯誤訊息**：擷取關鍵的 Terminal 輸出或日誌。
   - **解決方案**：具體修正的程式碼片段或配置步驟。


## 目錄結構
- `scripts/`：自動化更新此 Skill 的輔助腳本（選填）。
- `resources/`：相關錯誤案例的詳細分析文件。

## 使用範例
若 Imagen 3.0 SDK 調用失敗，請更新 `resources/imagen_3_troubleshooting.md`。
