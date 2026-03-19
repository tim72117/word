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
                config = data.get('config')
                ink_image = data.get('inkImage')
                ink_phono_image = data.get('inkPhonoImage')
                brush_image = data.get('brushImage')
                is_workspace_sync = data.get('isWorkspaceSync', False)

                if not image_data or not filename:
                    self.send_error(400, "Missing image or filename")
                    return

                # Construct target directory
                project_root = os.path.dirname(DIRECTORY)
                if folder:
                    target_dir = os.path.join(project_root, "characters", folder)
                    if not os.path.exists(target_dir):
                        os.makedirs(target_dir, exist_ok=True)
                    save_path = os.path.join(target_dir, filename)
                else:
                    save_path = os.path.join(DIRECTORY, filename)

                # Save main image (unless it's just a sync)
                if not is_workspace_sync:
                    header, encoded = image_data.split(",", 1)
                    with open(save_path, "wb") as f:
                        f.write(base64.b64decode(encoded))

                # Save specific layers if folder is provided
                if folder:
                    if ink_image:
                        with open(os.path.join(target_dir, "ink.png"), "wb") as f:
                            f.write(base64.b64decode(ink_image.split(",", 1)[1]))
                    
                    if ink_phono_image:
                        with open(os.path.join(target_dir, "ink_phono.png"), "wb") as f:
                            f.write(base64.b64decode(ink_phono_image.split(",", 1)[1]))
                    
                    if brush_image:
                        with open(os.path.join(target_dir, "brush.png"), "wb") as f:
                            f.write(base64.b64decode(brush_image.split(",", 1)[1]))
                    
                    if config:
                        with open(os.path.join(target_dir, ".sketch_config.json"), "w", encoding="utf-8") as f:
                            json.dump(config, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "path": save_path}).encode('utf-8'))

            except Exception as e:
                print(f"Server Error: {e}")
                self.send_error(500, str(e))
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
        httpd.serve_forever()
