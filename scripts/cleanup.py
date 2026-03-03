import os
import sys
from google.cloud import aiplatform

# --- 參數設定 ---
PROJECT_ID = "game-485606"
REGION = "asia-northeast1"

def cleanup_resources(display_name="mu-tree-sdxl-controlnet"):
    aiplatform.init(project=PROJECT_ID, location=REGION)

    print(f"項目: {PROJECT_ID}, 區域: {REGION}")

    # 獲取目標模型
    print(f"正在尋找模型: {display_name}...")
    models = aiplatform.Model.list(filter=f'display_name="{display_name}"')
    model_resource_names = [m.resource_name for m in models]
    print(f"找到 {len(models)} 個模型。")

    # 獲取所有端點
    print("正在列出區域內所有 Endpoints...")
    endpoints = aiplatform.Endpoint.list()

    target_names = [display_name, f"{display_name}_endpoint"]

    for ep in endpoints:
        print(f"正在檢查 Endpoint: {ep.display_name} ({ep.name})")

        is_target_endpoint = any(tn in ep.display_name for tn in target_names)

        # 取得端點上的部署模型
        deployed_models = ep.list_models()
        has_target_model = False
        for dm in deployed_models:
            if dm.model in model_resource_names or any(tn in dm.display_name for tn in target_names):
                print(f"  發現目標模型 {dm.id} ({dm.display_name})。正在取消部署...")
                try:
                    ep.undeploy(deployed_model_id=dm.id)
                    has_target_model = True
                except Exception as e:
                    print(f"  取消部署失敗: {e}")

        if is_target_endpoint or has_target_model:
            print(f"  正在刪除 Endpoint {ep.display_name}...")
            try:
                # force=True 會自動處理剩餘的取消部署
                ep.delete(force=True)
                print("  Endpoint 刪除指令已發送。")
            except Exception as e:
                print(f"  刪除 Endpoint 失敗: {e}")

    # 刪除模型
    for m in models:
        print(f"正在嘗試刪除模型 {m.display_name}...")
        try:
            m.delete()
            print(f"模型 {m.display_name} 刪除成功。")
        except Exception as e:
            print(f"刪除模型失敗 (可能正在取消部署中): {e}")

    print("清理作業發送完成。")

if __name__ == "__main__":
    cleanup_resources()
