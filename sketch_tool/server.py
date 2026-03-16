import http.server
import socketserver
import json
import os
import base64
from urllib.parse import urlparse

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class SketchHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        print(f"📥 Received POST request: {self.path}")
        if self.path == '/list':
            try:
                project_root = os.path.dirname(DIRECTORY)
                chars_dir = os.path.join(project_root, "characters")
                dirs = []
                if os.path.exists(chars_dir):
                    dirs = [d for d in os.listdir(chars_dir) if os.path.isdir(os.path.join(chars_dir, d)) and not d.startswith('.')]
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "folders": sorted(dirs)}).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))

        elif self.path == '/load':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                folder = data.get('folder')
                project_root = os.path.dirname(DIRECTORY)
                target_dir = os.path.join(project_root, "characters", folder)
                config_path = os.path.join(target_dir, ".sketch_config.json")
                
                response_data = {"status": "success", "config": None}
                if os.path.exists(config_path):
                    with open(config_path, "r", encoding="utf-8") as f:
                        response_data["config"] = json.load(f)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))

        elif self.path == '/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                image_data = data.get('image')
                filename = data.get('filename')
                folder = data.get('folder')
                config = data.get('config') # 工作區隱藏設定
                ink_image = data.get('inkImage') # 獨立書法文字圖層
                brush_image = data.get('brushImage') # 手寫手繪圖層 (含 Layout 或 Ink 筆跡)
                is_workspace_sync = data.get('isWorkspaceSync', False)

                if not image_data or not filename:
                    print("⚠️ Missing image or filename in request body")
                    self.send_error(400, "Missing image or filename")
                    return

                # 清理與建構存檔路徑
                if folder:
                    # 確保 folder 在專案根目錄下的 characters 目錄中
                    # DIRECTORY 為 /Users/caitingyu/Documents/word/sketch_tool
                    # 專案根目錄為 /Users/caitingyu/Documents/word
                    project_root = os.path.dirname(DIRECTORY)
                    target_dir = os.path.join(project_root, "characters", folder)
                    
                    if not os.path.exists(target_dir):
                        print(f"📁 Creating directory: {target_dir}")
                        os.makedirs(target_dir, exist_ok=True)
                    
                    save_path = os.path.join(target_dir, filename)
                elif os.path.isabs(filename):
                    save_path = filename
                else:
                    # 預設搜尋邏輯保持不變
                    possible_paths = [
                        os.path.join(DIRECTORY, filename),
                        os.path.join(DIRECTORY, "../gemini_ai_studio/scripts", filename),
                        os.path.join("/Users/caitingyu/Documents/word/gemini_ai_studio/scripts", filename)
                    ]
                    
                    found = False
                    for p in possible_paths:
                        if os.path.exists(p):
                            save_path = p
                            found = True
                            break
                    
                    if not found:
                        save_path = possible_paths[0]

                print(f"📝 Attempting to save to: {save_path}")
                header, encoded = image_data.split(",", 1)
                img_bytes = base64.b64decode(encoded)

                if not is_workspace_sync:
                    with open(save_path, "wb") as f:
                        f.write(img_bytes)
                    print(f"✅ Successfully saved composite to: {save_path}")
                else:
                    print(f"🔄 Workspace sync for: {folder} (omitting composite)")
                if folder and ink_image:
                    ink_path = os.path.join(target_dir, "ink.png")
                    _, encoded_ink = ink_image.split(",", 1)
                    ink_bytes = base64.b64decode(encoded_ink)
                    with open(ink_path, "wb") as f:
                        f.write(ink_bytes)
                    print(f"✒️ Saved calligraphy to: {ink_path}")

                # 如果有提供手寫筆跡，則存為固定的 brush.png
                if folder and brush_image:
                    brush_path = os.path.join(target_dir, "brush.png")
                    _, encoded_brush = brush_image.split(",", 1)
                    brush_bytes = base64.b64decode(encoded_brush)
                    with open(brush_path, "wb") as f:
                        f.write(brush_bytes)
                    print(f"🖌️ Saved brush stroke to: {brush_path}")

                # 如果有提供工作區設定，則存為 .sketch_config.json
                if folder and config:
                    config_path = os.path.join(target_dir, ".sketch_config.json")
                    with open(config_path, "w", encoding="utf-8") as f:
                        json.dump(config, f, ensure_ascii=False, indent=2)
                    print(f"⚙️ Saved workspace config to: {config_path}")

                print(f"✅ Successfully saved composite to: {save_path}")
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {"status": "success", "path": save_path}
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"❌ Error handling /save: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), SketchHandler) as httpd:
        print(f"🚀 Sketch Tool Server running at http://localhost:{PORT}")
        print(f"📁 Serving files from: {DIRECTORY}")
        httpd.serve_forever()
