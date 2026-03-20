---
name: test_server_management
description: 測試伺服器管理與 Port 衝突排除指南。包含 Windows 與 Ubuntu 雙環境的操作指令。
---

# 測試伺服器管理 (Test Server Management)

本 Skill 旨在協助開發者啟動、監控及管理測試伺服器（如 Python `http.server`, Laravel `artisan serve` 等），並排除常見的 Port 占用衝突。

## 平台選擇

本 Skill 分為兩個子 Skill 以應對不同的作業系統環境：

1. **[Windows 環境範例](file:///c:/www/word/.agent/skills/test_server_management/windows/SKILL.md)**：適用於 Windows 宿主機環境。
2. **[Ubuntu / Linux 環境範例](file:///c:/www/word/.agent/skills/test_server_management/ubuntu/SKILL.md)**：適用於 Docker 容器或 WSL 環境。

## 核心功能
- 查詢占用特定 Port 的處理程序 (PID)。
- 強制終止占用資源的進程。
- 管理背景執行的測試伺服器。

> [!TIP]
> 在執行終止指令前，請務必確認 PID 屬於您要重啟的測試伺服器。
