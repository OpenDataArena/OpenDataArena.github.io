import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8008
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
        print(f"Server started!")
        print(f"Directory: {DIRECTORY}")
        print(f"Access address: http://localhost:{PORT}")
        print(f"Home page: http://localhost:{PORT}/index.html")
        print("-" * 50)
        
        try:
            webbrowser.open(f'http://localhost:{PORT}/index.html')
        except:
            print("Please open the browser to access the above address")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")

if __name__ == "__main__":
    main()
