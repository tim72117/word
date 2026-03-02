---
name: knowledge_transfer
description: 記錄與傳承開發過程中的技術錯誤與解決方案 (Troubleshooting & Best Practices)
---

# 開發經驗傳承 Skill (Knowledge Transfer)

當開發過程中遇到腳本執行錯誤、SDK 改版或是複雜的技術挑戰時，應將錯誤現象、根本原因及最終解決方案記錄於此 Skill 下的相關文件中。

## 核心指令
1. **主動偵測錯誤**：每當執行腳本失敗或環境配置出錯，完成修正後應立即更新知識庫。
2. **記錄放置邏輯 (重要)**：
   - **優先權 1：放置於相關專屬 Skill**。若錯誤與特定領域功能（如 `image_generator`）直接相關，應標記在該 Skill 的 `SKILL.md` 的 `Troubleshooting` 章節中。
   - **優先權 2：通用技術紀錄**。若錯誤屬於通用環境、通用基礎設施或無對應專屬 Skill，則記錄在 `knowledge_transfer/resources/` 下的專題文件中。
3. **結構化記錄內容**：
   - **問題背景**：錯誤發生的環境與上下文。
   - **錯誤訊息**：擷取關鍵的 Terminal 輸出或日誌。
   - **解決方案**：具體修正的程式碼片段或配置步驟。


## 目錄結構
- `scripts/`：自動化更新此 Skill 的輔助腳本（選填）。
- `resources/`：相關錯誤案例的詳細分析文件。

## 使用範例
若 Imagen 3.0 SDK 調用失敗，請更新 `resources/imagen_3_troubleshooting.md`。
