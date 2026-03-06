---
name: Conda Environment Manager
description: 使用 Conda 建立並管理特定 Python 版本的獨立環境，解決套件相容性地雷。
---

# Conda Environment Manager Skill

此技能的主要情境是：**當專案需要特定的 Python 版本（例如 3.10 或 3.11）才能相容特定硬體或函式庫（如 Core ML）時，使用 Conda 來管理環境。**

## 核心情境 (Scenarios)

1. **版本不相容**: 系統預設 Python 過新（如 3.13），但機器學習框架（如 `coremltools`）尚未支援時。
2. **多專案切換**: 需要在不同專案間快速切換 Python 版本以避免汙染全域配置。
3. **二進位套件衝突**: 當 `pip` 安裝的科學計算套件（如 `numpy`）發生編譯錯誤時，使用 Conda 的預編譯二進位檔。

## 核心原則 (Core Principles)

- **顯式版本**: 建立環境時必須加上 `python=X.Y` 標記。
- **命名規範**: 環境名稱應反映專案用途與版本，例如 `word_sd3_311`。
- **隔離執行**: 始終在激活環境後再執行 `pip install` 或腳本。

## 使用流程 (Workflow)

### 1. 建立環境 (Creation)
```bash
# 範例：為 Core ML 配置 3.11 環境
conda create -n sd3_311 python=3.11 -y
```

### 2. 激活與切換 (Activation)
```bash
# 激活環境
conda activate sd3_311

# 若需離開
conda deactivate
```

### 3. 環境管理 (Maintenance)
```bash
# 查看所有可用環境與其 Python 版本
conda env list
```

## 應用實例：Core ML 方案
```bash
conda create -n coreml_env python=3.11 -y
conda activate coreml_env
pip install -r coreml_stable_diffusion/requirements.txt
```

## 最佳實踐 (Best Practices)
- 總是使用 `conda install` 優先處理科學計算套件（如 `numpy`, `scipy`）。
- 跨專案開發時，確保環境名稱具備唯一性。
