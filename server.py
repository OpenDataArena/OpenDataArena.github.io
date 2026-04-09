import http.client
import http.server
import importlib.util
import json
import os
import socket
import threading
import time
import webbrowser
from pathlib import Path

PORT = int(os.getenv("PORT", "8008"))
DIRECTORY = Path(__file__).parent.resolve()
LINEAGE_API_SERVER_PATH = DIRECTORY / "data-lineage" / "website" / "api_server.py"

HOP_BY_HOP_HEADERS = {
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailers",
	"transfer-encoding",
	"upgrade",
}
PROXY_RESPONSE_SKIP_HEADERS = HOP_BY_HOP_HEADERS | {"server", "date"}

LINEAGE_API_PORT = None
LINEAGE_API_THREAD = None
LINEAGE_API_ERROR = None


def _ensure_lineage_api_env_defaults():
	"""从项目根目录的 .env 读取默认值，但不覆盖已存在的环境变量。"""
	env_path = DIRECTORY / ".env"
	if not env_path.exists():
		return

	for line in env_path.read_text(encoding="utf-8").splitlines():
		line = line.strip()
		if not line or line.startswith("#") or "=" not in line:
			continue
		key, value = line.split("=", 1)
		os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def _find_free_port():
	with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
		sock.bind(("127.0.0.1", 0))
		return sock.getsockname()[1]


def _load_lineage_api_module():
	spec = importlib.util.spec_from_file_location("lineage_api_server", LINEAGE_API_SERVER_PATH)
	if spec is None or spec.loader is None:
		raise RuntimeError(f"Unable to load lineage API module from {LINEAGE_API_SERVER_PATH}")

	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


def _wait_for_lineage_api(port, timeout_seconds=10):
	deadline = time.time() + timeout_seconds
	last_error = None

	while time.time() < deadline:
		try:
			conn = http.client.HTTPConnection("127.0.0.1", port, timeout=1)
			conn.request("GET", "/api/health")
			response = conn.getresponse()
			response.read()
			conn.close()
			if 200 <= response.status < 500:
				return
		except OSError as exc:
			last_error = exc
		time.sleep(0.15)

	raise RuntimeError(
		f"Lineage API did not become ready on 127.0.0.1:{port}"
		+ (f" ({last_error})" if last_error else "")
	)


def start_lineage_api():
	global LINEAGE_API_PORT, LINEAGE_API_THREAD, LINEAGE_API_ERROR

	try:
		module = _load_lineage_api_module()
		module.init_llm()

		requested_port = int(os.getenv("LINEAGE_INTERNAL_PORT", "0") or "0")
		LINEAGE_API_PORT = requested_port or _find_free_port()

		def run():
			module.app.run(
				host="127.0.0.1",
				port=LINEAGE_API_PORT,
				debug=False,
				use_reloader=False,
				threaded=True,
			)

		LINEAGE_API_THREAD = threading.Thread(
			target=run,
			name="lineage-api-server",
			daemon=True,
		)
		LINEAGE_API_THREAD.start()
		_wait_for_lineage_api(LINEAGE_API_PORT)
	except Exception as exc:
		LINEAGE_API_ERROR = exc
		LINEAGE_API_PORT = None


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, directory=DIRECTORY, **kwargs)

	def end_headers(self):
		self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
		self.send_header("Pragma", "no-cache")
		self.send_header("Expires", "0")
		super().end_headers()

	def do_GET(self):
		if self.path.startswith("/api/"):
			self._proxy_to_lineage_api()
			return
		super().do_GET()

	def do_HEAD(self):
		if self.path.startswith("/api/"):
			self._proxy_to_lineage_api()
			return
		super().do_HEAD()

	def do_POST(self):
		if self.path.startswith("/api/"):
			self._proxy_to_lineage_api()
			return
		self.send_error(405, "Method not allowed")

	def do_OPTIONS(self):
		if self.path.startswith("/api/"):
			self._proxy_to_lineage_api()
			return
		self.send_response(204)
		self.end_headers()

	def _proxy_to_lineage_api(self):
		if LINEAGE_API_PORT is None:
			message = {
				"error": "lineage_api_unavailable",
				"message": str(LINEAGE_API_ERROR or "Lineage API failed to start"),
			}
			payload = json.dumps(message, ensure_ascii=False).encode("utf-8")
			self.send_response(503, "Service Unavailable")
			self.send_header("Content-Type", "application/json; charset=utf-8")
			self.send_header("Content-Length", str(len(payload)))
			self.end_headers()
			if self.command != "HEAD":
				self.wfile.write(payload)
			return

		content_length = int(self.headers.get("Content-Length", "0") or "0")
		body = self.rfile.read(content_length) if content_length > 0 else None

		headers = {
			key: value
			for key, value in self.headers.items()
			if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "host"
		}
		headers["Host"] = f"127.0.0.1:{LINEAGE_API_PORT}"

		connection = http.client.HTTPConnection("127.0.0.1", LINEAGE_API_PORT, timeout=300)
		try:
			connection.request(self.command, self.path, body=body, headers=headers)
			response = connection.getresponse()
			payload = response.read()

			self.send_response(response.status, response.reason)
			for key, value in response.getheaders():
				if key.lower() in PROXY_RESPONSE_SKIP_HEADERS:
					continue
				self.send_header(key, value)
			self.end_headers()

			if self.command != "HEAD":
				self.wfile.write(payload)
		except Exception as exc:
			payload = json.dumps(
				{
					"error": "lineage_proxy_failed",
					"message": str(exc),
				},
				ensure_ascii=False,
			).encode("utf-8")
			self.send_response(502, "Bad Gateway")
			self.send_header("Content-Type", "application/json; charset=utf-8")
			self.send_header("Content-Length", str(len(payload)))
			self.end_headers()
			if self.command != "HEAD":
				self.wfile.write(payload)
		finally:
			connection.close()


class ThreadingHTTPServer(http.server.ThreadingHTTPServer):
	daemon_threads = True
	allow_reuse_address = True


def main():
	_ensure_lineage_api_env_defaults()
	os.chdir(DIRECTORY)
	start_lineage_api()

	with ThreadingHTTPServer(("", PORT), MyHTTPRequestHandler) as httpd:
		print("Server started!")
		print(f"Directory: {DIRECTORY}")
		print(f"Access address: http://localhost:{PORT}")
		print(f"Home page: http://localhost:{PORT}/index.html")
		print(f"Data Lineage page: http://localhost:{PORT}/data-lineage/website/index.html")
		if LINEAGE_API_PORT is not None:
			print(f"Data Lineage API: http://localhost:{PORT}/api/... (proxied to 127.0.0.1:{LINEAGE_API_PORT})")
		else:
			print(f"Data Lineage API startup failed: {LINEAGE_API_ERROR}")
		print("-" * 50)

		try:
			webbrowser.open(f"http://localhost:{PORT}/index.html")
		except Exception:
			print("Please open the browser to access the above address")

		try:
			httpd.serve_forever()
		except KeyboardInterrupt:
			print("\nServer stopped")


if __name__ == "__main__":
	main()
