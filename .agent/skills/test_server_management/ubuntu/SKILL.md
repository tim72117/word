---
name: test_server_management_ubuntu
description: Ubuntu (Linux) 環境下的伺服器 Port 占用排除指南。
---

# Ubuntu / Linux 伺服器管理與 Port 排除

在 Ubuntu 或 Docker 容器環境下，使用以下指令管理測試伺服器。

## 1. 查詢占用 Port 的處理程序 (PID)

### 使用 lsof (推薦)
```bash
# 替換 <PORT> 為實際埠號
sudo lsof -i :<PORT>
```

**輸出範例：**
```text
COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
python  12345 user   7u  IPv4  54321      0t0  TCP *:8000 (LISTEN)
```

### 使用 netstat
```bash
sudo netstat -nlp | grep :<PORT>
```

## 2. 強制終止處理程序

使用 `kill` 指令。

```bash
# 將 <PID> 替換為上一步查到的數字
sudo kill -9 <PID>
```

## 3. 背景執行與日誌

```bash
# 啟動並記錄日誌
python sketch_tool/server.py > server.log 2>&1 &
```
