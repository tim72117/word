---
name: test_server_management_windows
description: Windows 環境下的伺服器 Port 占用排除指南。
---

# Windows 伺服器管理與 Port 排除

在 Windows 環境下（例如 PowerShell 或 CMD），使用以下指令管理測試伺服器。

## 1. 查詢占用 Port 的處理程序 (PID)

使用 `netstat` 指令結合 `findstr`。

```powershell
# 替換 <PORT> 為實際埠號，例如 8000
netstat -ano | findstr :<PORT>
```

**輸出範例：**
```text
  TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING       12345
```
*最後一欄的 `12345` 即為 **PID**。*

## 2. 強制終止處理程序

使用 `taskkill` 指令。

```powershell
# 將 <PID> 替換為上一步查到的數字
taskkill /F /PID <PID>
```

> [!CAUTION]
> **Bash 用戶注意 (如 Git Bash)**：  
> 若在 Bash 環境下遇到 `錯誤的引數/選項 - 'F:/'`，是因為 `/F` 被誤判為路徑。請改用雙斜線轉義：  
> `taskkill //F //PID <PID>`

## 3. 範例：啟動 Python 測試伺服器

```powershell
# 在專案目錄啟動
python -m http.server 8000
```
