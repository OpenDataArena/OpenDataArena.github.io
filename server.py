import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8066
DIRECTORY = Path(__file__).parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"服务器启动成功!")
        print(f"目录: {DIRECTORY}")
        print(f"访问地址: http://localhost:{PORT}")
        print(f"主页: http://localhost:{PORT}/index.html")
        print("-" * 50)
        
        # 自动打开浏览器
        try:
            webbrowser.open(f'http://localhost:{PORT}/index.html')
        except:
            print("请手动打开浏览器访问上述地址")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")

if __name__ == "__main__":
    main()
