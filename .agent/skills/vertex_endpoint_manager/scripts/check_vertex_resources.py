import os
import argparse
import logging
from google.cloud import aiplatform

# 設定日誌級別，減少無關資訊
logging.getLogger("google.auth.compute_engine._metadata").setLevel(logging.ERROR)

DEFAULT_PROJECT_ID = "game-485606"
DEFAULT_REGIONS = [
    "us-central1", "us-east1", "asia-east1", "asia-northeast1"
]

def check_resources(project_id, regions):
    """
    掃描指定區域的 Vertex AI 資源。
    """
    print(f"🚀 開始全面掃描專案: {project_id}")
    print(f"掃描區域: {', '.join(regions)}")

    for region in regions:
        print(f"\n" + "="*50)
        print(f"📍 區域: {region}")
        print("="*50)

        try:
            aiplatform.init(project=project_id, location=region)

            # 1. 端點掃描
            print("\n[端點狀態]")
            endpoints = aiplatform.Endpoint.list()
            if not endpoints:
                print("  - 目前無端點。")
            else:
                for ep in endpoints:
                    deployed_models = ep.list_models()
                    print(f"  - 名稱: {ep.display_name}")
                    print(f"    ID: {ep.name.split('/')[-1]}")
                    print(f"    資源路徑: {ep.resource_name}")

                    if deployed_models:
                        print(f"    已部署模型 ({len(deployed_models)}):")
                        for dm in deployed_models:
                            print(f"      * {dm.display_name} (ID: {dm.id})")
                    else:
                        print("    ⚠️ 注意: 此端點目前沒有部署任何模型。")
                    print(f"    建立時間: {ep.create_time}")

            # 2. 模型掃描
            print("\n[模型列表]")
            models = aiplatform.Model.list()
            if not models:
                print("  - 目前無模型。")
            else:
                for m in models:
                    print(f"  - {m.display_name} ({m.resource_name})")

        except Exception as e:
            print(f"  ❌ 檢查區域 {region} 時發生錯誤: {e}")

    print("\n" + "="*50)
    print("✅ 掃描任務完成！")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vertex AI 資源統一掃描工具")
    parser.add_argument("--project", default=DEFAULT_PROJECT_ID, help=f"Google Cloud Project ID (預設: {DEFAULT_PROJECT_ID})")
    parser.add_argument("--regions", nargs="+", default=DEFAULT_REGIONS, help=f"要掃描的區域 (預設: {', '.join(DEFAULT_REGIONS)})")

    args = parser.parse_args()

    # 優化 regions 輸入，支援逗號分隔
    target_regions = []
    for r in args.regions:
        target_regions.extend([item.strip() for item in r.split(",")])

    check_resources(args.project, target_regions)
