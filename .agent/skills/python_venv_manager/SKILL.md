---
name: Python Virtual Environment Manager
description: 強制在隔離的 venv 環境中執行 Python 並自動管理套件安裝。
---

# Python Virtual Environment Manager Skill

此技能確保所有 Python 相關操作都在隔離的虛擬環境 (`.venv`) 中進行，以避免汙染全域環境或發生套件衝突。

## 核心原則 (Core Principles)

1. **優先檢查 venv**: 在執行任何需要安裝套件的 Python 腳本前，必須檢查專案根目錄是否存在 `.venv` 資料夾。
2. **自動建立環境**: 如果 `.venv` 不存在，必須使用 `python3 -m venv .venv` 建立它。
3. **隔離安裝**: 所有套件安裝 (`pip install`) 必須在激活 venv 的狀態下執行，或直接使用 `.venv/bin/pip`。
4. **環境一致性**: 優先從 `requirements.txt` 安裝依賴項。

## 使用流程 (Workflow)

### 1. 初始化與安裝 (Initialization)
當需要安裝新套件（例如 `requests`）時：
```bash
# 檢查並建立 venv
[ ! -d ".venv" ] && python3 -m venv .venv

# 安裝套件
.venv/bin/pip install requests
```

### 2. 執行腳本 (Execution)
執行任何 Python 腳本時，請明確指定 venv 中的解譯器：
```bash
.venv/bin/python your_script.py
```

### 3. 管理依賴 (Dependency Management)
完成開發後，更新 `requirements.txt`：
```bash
.venv/bin/pip freeze > requirements.txt
```

## 最佳實踐 (Best Practices)
- **路徑指定**: 總是使用絕對路徑或相對於專案根目錄的路徑來引用 `.venv/bin/python`。
- **避免全域指令**: 除非明確知道該指令是系統層級工具，否則避免直接使用 `python` 或 `pip` 而不帶路徑。
- **清理工作**: 如果任務完成且不需要保留環境（例如臨時測試），應在完成後提醒用戶或協助清理。
