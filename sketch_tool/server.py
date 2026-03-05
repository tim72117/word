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

                if not image_data or not filename:
                    print("⚠️ Missing image or filename in request body")
                    self.send_error(400, "Missing image or filename")
                    return

                print(f"📝 Attempting to save: {filename}")
                # Remove the data:image/png;base64, part
                header, encoded = image_data.split(",", 1)
                img_bytes = base64.b64decode(encoded)

                # Determine the absolute path.
                if os.path.isabs(filename):
                    save_path = filename
                else:
                    # Default search in common places
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
                            print(f"🔍 File found at: {save_path}")
                            break
                    
                    if not found:
                        save_path = possible_paths[0]
                        print(f"⚠️ File not found in common paths, creating new at: {save_path}")

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
