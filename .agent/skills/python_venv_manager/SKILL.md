---
name: Python Virtual Environment Manager
description: 強制在隔離的 venv 環境中執行所有 Python 腳本，絕對禁止使用全域環境。
---

# Python Virtual Environment Manager Skill

此技能**強制要求**所有 Python 相關操作（包括執行、安裝、管理）都必須在專案根目錄的隔離虛擬環境 (`.venv`) 中進行。

## 核心原則 (Core Principles) - **強制執行**

1.  **禁止全域執行**: 絕對禁止直接使用 `python` 或 `pip` 指令而不指定虛擬環境路徑。這能防止意外汙染系統環境或發生不可預期的套件衝突。
2.  **強制初始化**: 在執行任何 Python 腳本前，必須確保專案根路徑存在 `.venv`。如果不存在，必須立即建立。
3.  **路徑顯式化**: 在所有終端指令中，必須使用 `.venv` 內的解釋器路徑。
    *   **Windows (CMD/PowerShell)**: 使用 `.venv\Scripts\python.exe`
    *   **Windows (Git Bash/WSL/Linux/macOS)**: 使用 `.venv/bin/python`
4.  **自動同步**: 執行腳本前應確認依賴項是否已安裝，必要時執行 `pip install -r requirements.txt`。
5.  **錯誤修復與切換**: 如果使用預設環境執行發生錯誤（如 `ModuleNotFoundError`），必須**立即**切換至 `.venv` 指向的解釋器重新執行。


## 使用流程 (Workflow)

### 1. 環境準備 (Preparation)
在執行任何動作前，先確認或建立運作環境：
```bash
# Windows (PowerShell/CMD)
if (!(Test-Path ".venv")) { python -m venv .venv }

# Unix/Git Bash
[ ! -d ".venv" ] && python3 -m venv .venv
```

### 2. 執行腳本 (Execution) - **唯一合法方式**
執行腳本時，必須直接調用虛擬環境內的 Python 執行檔：
```bash
# Windows
.venv\Scripts\python.exe your_script.py

# Unix/Git Bash
.venv/bin/python your_script.py
```

### 3. 套件管理 (Package Management)
```bash
# 安裝新套件
.venv\Scripts\pip.exe install <package_name>

# 更新 requirements.txt
.venv\Scripts\pip.exe freeze > requirements.txt
```

## 最佳實踐 (Best Practices)
- **零容忍**: 即使是簡單的 `print('hello')` 測試，也必須使用 `.venv`。
- **環境清理**: 如果是開發臨時性的輔助腳本（例如資料清洗），完成後請確認依賴項是否需要持久化到 `requirements.txt`。
- **診斷與自動補救**: 若遇到 `ModuleNotFoundError` 或其他執行失敗，應優先檢查是否誤用系統路徑，並確保後續重試時**直接強制使用**虛擬環境路徑。
