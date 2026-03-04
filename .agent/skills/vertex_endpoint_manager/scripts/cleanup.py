import argparse
import logging
from google.cloud import aiplatform

# 設定日誌級別
logging.getLogger("google.auth.compute_engine._metadata").setLevel(logging.ERROR)

DEFAULT_PROJECT_ID = "game-485606"
DEFAULT_REGIONS = ["us-central1", "asia-northeast1"]

def cleanup_resources(project_id, regions):
    """
    清理指定區域的所有 Vertex AI 端點與模型。
    """
    print(f"🧹 開始清理專案: {project_id}")
    print(f"目標區域: {', '.join(regions)}")

    for region in regions:
        print(f"\n" + "-"*50)
        print(f"📍 區域: {region}")
        print("-"*50)

        try:
            aiplatform.init(project=project_id, location=region)

            # 1. 刪除端點
            print("正在尋找端點...")
            endpoints = aiplatform.Endpoint.list()
            if not endpoints:
                print("  - 此區域無端點。")
            else:
                for ep in endpoints:
                    print(f"  - 正在刪除端點: {ep.display_name} ({ep.name.split('/')[-1]})...")
                    try:
                        ep.delete(force=True)
                        print("    ✅ 成功發送刪除指令。")
                    except Exception as e:
                        print(f"    ❌ 刪除端點失敗: {e}")

            # 2. 刪除模型
            print("正在尋找模型...")
            models = aiplatform.Model.list()
            if not models:
                print("  - 此區域無模型。")
            else:
                for m in models:
                    print(f"  - 正在刪除模型: {m.display_name} ({m.name.split('/')[-1]})...")
                    try:
                        m.delete()
                        print("    ✅ 成功發送刪除指令。")
                    except Exception as e:
                        print(f"    ❌ 刪除模型失敗 (可能尚有部署中的端點): {e}")

        except Exception as e:
            print(f"  ❌ 處理區域 {region} 時發生錯誤: {e}")

    print("\n" + "="*50)
    print("✅ 清理任務執行完畢！")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vertex AI 基礎設施統一清理工具")
    parser.add_argument("--project", default=DEFAULT_PROJECT_ID, help=f"Google Cloud Project ID (預設: {DEFAULT_PROJECT_ID})")
    parser.add_argument("--regions", nargs="+", default=DEFAULT_REGIONS, help=f"要清理的區域 (預設: {', '.join(DEFAULT_REGIONS)})")

    args = parser.parse_args()

    # 優化 regions 輸入，支援逗號分隔
    target_regions = []
    for r in args.regions:
        target_regions.extend([item.strip() for item in r.split(",")])

    cleanup_resources(args.project, target_regions)
