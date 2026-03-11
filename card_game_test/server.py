import http.server
import socketserver
import os
from http.server import ThreadingHTTPServer

PORT = 8001
DIRECTORY = os.getcwd()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    # 增加快取控制頭部以加速後續載入
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

# 使用 ThreadingHTTPServer 以支援並發請求，這對 Safari 特別重要
with ThreadingHTTPServer(("", PORT), Handler) as httpd:
    print(f"Threading Server at http://localhost:{PORT}")
    print(f"Serving files from {DIRECTORY}")
    httpd.serve_forever()
