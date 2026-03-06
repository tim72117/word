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
        if self.path == '/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                image_data = data.get('image')
                filename = data.get('filename')
                folder = data.get('folder')  # 新增 folder 參數

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

                with open(save_path, "wb") as f:
                    f.write(img_bytes)

                print(f"✅ Successfully saved {len(img_bytes)} bytes to: {save_path}")
                
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
