from google.cloud import aiplatform
import os

PROJECT_ID = "game-485606"
REGION = "asia-northeast1"
DISPLAY_NAME = "mu-tree-sdxl-controlnet"

aiplatform.init(project=PROJECT_ID, location=REGION)

print(f"--- 資源狀態報告 ({DISPLAY_NAME}) ---")

# 檢查模型
print("\n[模型狀態]")
models = aiplatform.Model.list(filter=f'display_name="{DISPLAY_NAME}"')
if not models:
    print("找不到模型。")
for m in models:
    print(f"模型名稱: {m.display_name}")
    print(f"資源路徑: {m.resource_name}")
    print(f"建立時間: {m.create_time}")

# 檢查端點
print("\n[端點狀態]")
# 腳本中端點名稱通常與顯示名稱一致
endpoints = aiplatform.Endpoint.list(filter=f'display_name="{DISPLAY_NAME}"')
if not endpoints:
    # 嘗試找 _endpoint 後綴
    endpoints = aiplatform.Endpoint.list(filter=f'display_name="{DISPLAY_NAME}_endpoint"')

if not endpoints:
    print("找不到目前相關的端點。")
for ep in endpoints:
    print(f"端點名稱: {ep.display_name}")
    print(f"資源路徑: {ep.resource_name}")
    print(f"部署模型數量: {len(ep.list_models())}")
    for dm in ep.list_models():
        print(f"  - 部署的模型 ID: {dm.id}")
        print(f"  - 模型路徑: {dm.model}")

print("\n--- 檢查結束 ---")
