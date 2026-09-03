from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse
import urllib.error

class handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            data = json.loads(body)
            token = data.get('token', '').strip()
            user_id = data.get('user_id', '17841433558793598').strip()

            base_url = "https://graph.instagram.com/v19.0" if token.startswith("IG") else "https://graph.facebook.com/v19.0"
            target_url = f"{base_url}/me?fields=id,username&access_token={token}"

            req = urllib.request.Request(target_url, headers={"User-Agent": "AgroPost/1.0"})
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                self.send_json(200, {"success": True, "data": result})
        except urllib.error.HTTPError as err:
            err_content = err.read().decode('utf-8')
            try:
                err_json = json.loads(err_content)
                self.send_json(400, {"success": False, "error": err_json})
            except Exception:
                self.send_json(err.code, {"success": False, "error": {"message": str(err)}})
        except Exception as e:
            self.send_json(500, {"success": False, "error": {"message": str(e)}})
