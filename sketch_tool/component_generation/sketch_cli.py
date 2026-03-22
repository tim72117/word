#!/usr/bin/env python3
import sys
import json
import requests

SERVER_URL = "http://localhost:8001/command"
GET_SCREENSHOT_URL = "http://localhost:8001/get_screenshot"

def send_command(action, params=None):
    payload = {
        "action": action,
        "params": params or {}
    }
    try:
        response = requests.post(SERVER_URL, json=payload, timeout=2)
        if response.status_code == 200:
            print(f"✅ 指令 [{action}] 已成功送達伺服器隊列。")
        else:
            print(f"❌ 錯誤: 伺服器回應 {response.status_code}")
    except Exception as e:
        print(f"❌ 連線失敗: {e}")

def wait_for_screenshot(output_path="snapshot.png"):
    import time
    import base64
    print("⏳ 正在等待瀏覽器上傳截圖...")
    for i in range(10):  # 最多等待 10 秒
        time.sleep(1)
        try:
            resp = requests.get(GET_SCREENSHOT_URL, timeout=2)
            data = resp.json()
            if data.get("status") == "success" and data.get("image"):
                image_data = data["image"].split(",")[1]
                with open(output_path, "wb") as f:
                    f.write(base64.b64decode(image_data))
                print(f"📸 截圖已儲存至: {output_path}")
                return True
        except Exception as e:
            pass
    print("❌ 逾時: 瀏覽器未能在 10 秒內回傳截圖。")
    return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 sketch_cli.py <command> [args]")
        print("Commands:")
        print("  ping            - 測試連線")
        print("  load <name>     - 載入工作區 (例如: load 聽)")
        print("  save            - 儲存當前工作區狀態")
        print("  toggle-regions  - 切換結構範圍顯示")
        print("  clear           - 清除畫布 (前端會彈出確認視窗)")
        print("  select <text>   - 根據文字內容選取部件 (例如: select 耳)")
        print("  rotate <axis> <deg> - 旋轉選取物件 (例如: rotate x 45)")
        print("  opacity <val>   - 設定底圖透明度 (例如: opacity 0.2)")
        print("  screenshot      - 獲取目前畫布截圖並存為 snapshot.png")
        return

    cmd = sys.argv[1].lower()
    
    if cmd == "ping":
        send_command("ping")
    elif cmd == "load":
        if len(sys.argv) < 3:
            print("請指定字名: python3 sketch_cli.py load <name>")
            return
        send_command("load", {"name": sys.argv[2]})
    elif cmd == "save":
        send_command("save")
    elif cmd == "select":
        if len(sys.argv) < 3:
            print("請指定要選取的部件文字: python3 sketch_cli.py select 耳")
            return
        send_command("select", {"text": sys.argv[2]})
    elif cmd == "rotate":
        if len(sys.argv) < 4:
            print("Usage: python3 sketch_cli.py rotate <x|y|z> <deg>")
            return
        send_command("rotate", {"axis": sys.argv[2], "deg": sys.argv[3]})
    elif cmd == "opacity":
        if len(sys.argv) < 3:
            print("Usage: python3 sketch_cli.py opacity <val>")
            return
        send_command("opacity", {"value": sys.argv[2]})
    elif cmd == "toggle-regions" or cmd == "toggle_regions":
        send_command("toggle_regions")
    elif cmd == "clear":
        send_command("clear")
    elif cmd == "screenshot":
        send_command("screenshot")
        wait_for_screenshot()
    else:
        print(f"未知指令: {cmd}")

if __name__ == "__main__":
    main()
