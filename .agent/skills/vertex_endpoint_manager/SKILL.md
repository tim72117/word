---
name: Vertex Endpoint Manager
description: 統一管理 Vertex AI 端點基礎設施巡檢、部署與清理的 Skill。
---

# Vertex Endpoint Manager Skill

此 Skill 專注於 Vertex AI 端點的「基礎設施生命週期管理」（Infrastructure Lifecycle Management），包含資源核署、清理與狀態巡檢。

> [!IMPORTANT]
> **範疇界定 (Scope Definition)**：
> - 本 Skill **不包含** 影像生成的腳本執行邏輯與參數調整。
> - 推論作業 (Inference) 與腳本參數配置 (如 Prompting, ControlNet Scales) 應參考 `image_generator` Skill。

## 核心規範 (Guiding Principles)

1. **區域預設與限制**:
   - 預設區域：`us-central1`。
   - **強制限制**：嚴禁在未經使用者同意的情況下擅自加入新區域進行掃描或部署。若需擴展掃描範圍（如 `us-east1`, `asia-east1` 等），必須先詢問並獲得許可。

2. **專案資訊**:
   - 預設 Project ID: `game-485606`。

## 主要功能與操作

### 1. 資源巡檢 (Resource Inspection)
使用 Skill 目錄下的整合腳本獲取當前活躍資源。

```bash
# 執行預設掃描 (僅包含當前核准區域)
python .agent/skills/vertex_endpoint_manager/scripts/check_vertex_resources.py --regions us-central1
```

**回報標準格式**:
- 區域: [Region Name]
- 端點顯示名稱: [Display Name]
- 端點 ID: [Endpoint ID]
- 已部署模型: [Model Name/ID]
- 部署時間: [Timestamp]

### 2. 資源管理 (Infrastructure Management)
所有受控腳本均位於 `.agent/skills/vertex_endpoint_manager/scripts/`：
- `cleanup.py`: 資源清理（刪除端點與撤收模型）。支援多區域參數。

```bash
# 執行預設清理 (us-central1, asia-northeast1)
python .agent/skills/vertex_endpoint_manager/scripts/cleanup.py

# 指定區域清理
python .agent/skills/vertex_endpoint_manager/scripts/cleanup.py --regions us-east1
```

## 故障排除 (Troubleshooting)

- **404 Endpoint Not Found**:
  1. 優先確認 `LOCATION` 是否正確（例如從 `us-central1` 誤設為 `us-east1`）。
  2. 檢查 `PROJECT_ID` 是否正確（有時需使用 Project Number `511615077117`）。
  3. 執行 `check_vertex_resources.py` 確認端點是否已被刪除。
