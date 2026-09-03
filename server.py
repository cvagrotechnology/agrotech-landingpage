#!/usr/bin/env python3
"""
AgroPost Local Bridge Server
============================
Server lokal ringan (tanpa dependensi eksternal) untuk mengatasi batasan CORS browser
dan menghubungkan aplikasi web langsung ke Meta Graph API Instagram.

Menjalankan:
    python3 server.py
Lalu buka:
    http://localhost:8000/ig-manager.html
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import urllib.error
import os
import time

PORT = 8000
GRAPH_API_VERSION = "v19.0"

PUBLIC_ASSET_MAP = {
    "assets/ig_reels_promo_1.jpg": "https://files.catbox.moe/wznkp3.jpg",
    "assets/ig_edu_carousel_1.jpg": "https://files.catbox.moe/j84sma.jpg",
    "assets/ig_edu_precision_fertigation.jpg": "https://files.catbox.moe/n2cm1p.jpg",
    "assets/ig_promo_satellite_ndvi.jpg": "https://files.catbox.moe/pofwlf.jpg",
    "assets/ig_profile_logo_1.jpg": "https://files.catbox.moe/l6km1s.jpg",
    "assets/ig_greenhouse_iot.jpg": "https://files.catbox.moe/blkicc.jpg",
    "assets/ig_drone_multispectral.jpg": "https://files.catbox.moe/8fahla.jpg",
    "assets/ig_harvest_success.jpg": "https://files.catbox.moe/m3c6uz.jpg",
    "assets/ig_smart_tractor.jpg": "https://files.catbox.moe/l112s8.jpg",
    "assets/ig_soil_probe_iot.jpg": "https://files.catbox.moe/hvrcfg.jpg",
    "assets/ig_agronomist_lab.jpg": "https://files.catbox.moe/ggv10t.jpg",
    "assets/ig_aerial_ndvi_farm.jpg": "https://files.catbox.moe/no8k21.jpg",
}

class AgroPostHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS for local dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/publish':
            self.handle_publish()
        elif self.path == '/api/test-token':
            self.handle_test_token()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_test_token(self):
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
                self.send_json_response(200, {"success": True, "data": result})
        except urllib.error.HTTPError as err:
            err_content = err.read().decode('utf-8')
            try:
                err_json = json.loads(err_content)
                self.send_json_response(400, {"success": False, "error": err_json})
            except Exception:
                self.send_json_response(err.code, {"success": False, "error": {"message": str(err)}})
        except Exception as e:
            self.send_json_response(500, {"success": False, "error": {"message": str(e)}})

    def handle_publish(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            payload = json.loads(body)
            token = payload.get('token', '').strip()
            user_id = payload.get('user_id', '17841433558793598').strip()
            caption = payload.get('caption', '')
            media_url = payload.get('media_url', '')
            format_type = payload.get('format', 'feed')

            # Ensure public URL
            if media_url in PUBLIC_ASSET_MAP:
                media_url = PUBLIC_ASSET_MAP[media_url]
            elif media_url.startswith('data:image'):
                print("[*] Menerima gambar Canvas yang di-generate. Mengunggah ke server publik Catbox...", flush=True)
                try:
                    import base64
                    header, b64data = media_url.split(',', 1)
                    img_data = base64.b64decode(b64data)
                    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
                    body_parts = []
                    body_parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n'.encode('utf-8'))
                    body_parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="agrotech_gen.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode('utf-8'))
                    body_parts.append(img_data)
                    body_parts.append(f'\r\n--{boundary}--\r\n'.encode('utf-8'))
                    full_body = b''.join(body_parts)

                    cat_req = urllib.request.Request(
                        'https://catbox.moe/user/api.php',
                        data=full_body,
                        headers={'Content-Type': f'multipart/form-data; boundary={boundary}', 'User-Agent': 'AgroPost/1.0'}
                    )
                    with urllib.request.urlopen(cat_req, timeout=15) as cat_resp:
                        uploaded_url = cat_resp.read().decode('utf-8').strip()
                        if uploaded_url.startswith('http'):
                            print(f"[+] Gambar hasil generate berhasil diunggah: {uploaded_url}", flush=True)
                            media_url = uploaded_url
                        else:
                            media_url = "https://files.catbox.moe/blkicc.jpg"
                except Exception as up_err:
                    print(f"[!] Upload canvas notice: {up_err}, menggunakan fallback asset.", flush=True)
                    media_url = "https://files.catbox.moe/blkicc.jpg"
            elif not media_url.startswith('http'):
                clean_path = media_url.lstrip('./')
                media_url = PUBLIC_ASSET_MAP.get(clean_path, "https://files.catbox.moe/j84sma.jpg")

            base_url = "https://graph.instagram.com/v19.0" if token.startswith("IG") else "https://graph.facebook.com/v19.0"
            if token.startswith("IG"):
                target_id = "17841433558793598" if (user_id == "1387829872774340" or not user_id) else user_id
            else:
                target_id = user_id or "17841433558793598"

            # 1. Create Container
            container_url = f"{base_url}/{target_id}/media"
            container_params = {
                "access_token": token,
                "caption": caption
            }
            # Deteksi apakah file adalah video nyata (.mp4/.mov) atau gambar (.jpg/.png)
            is_real_video = any(media_url.lower().endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.webm'])
            if is_real_video:
                container_params["media_type"] = "REELS"
                container_params["video_url"] = media_url
            else:
                container_params["image_url"] = media_url

            print(f"[*] Membuat Media Container ({'VIDEO' if is_real_video else 'IMAGE'})...", flush=True)
            print(f"[*] URL Media: {media_url}", flush=True)
            encoded_data = urllib.parse.urlencode(container_params).encode('utf-8')
            req1 = urllib.request.Request(container_url, data=encoded_data, headers={"User-Agent": "AgroPost/1.0"})
            
            with urllib.request.urlopen(req1) as resp1:
                res1_data = json.loads(resp1.read().decode('utf-8'))

            if "id" not in res1_data:
                self.send_json_response(400, {"success": False, "error": res1_data})
                return

            creation_id = res1_data["id"]
            print(f"[*] Container {creation_id} berhasil dibuat! Tipe: {'VIDEO' if is_real_video else 'IMAGE'}", flush=True)

            if is_real_video:
                # Untuk Video/Reels: Polling status sampai FINISHED
                print("[*] Menunggu pemrosesan video di server Meta...", flush=True)
                status_url = f"{base_url}/{creation_id}?fields=status_code,status&access_token={token}"
                for attempt in range(20):
                    time.sleep(3)
                    try:
                        req_st = urllib.request.Request(status_url, headers={"User-Agent": "AgroPost/1.0"})
                        with urllib.request.urlopen(req_st) as resp_st:
                            st_data = json.loads(resp_st.read().decode('utf-8'))
                            st_code = st_data.get("status_code")
                            print(f"[*] Status video #{attempt+1}: {st_code}", flush=True)
                            if st_code == "FINISHED":
                                break
                            elif st_code == "ERROR":
                                err_msg = st_data.get("status", "Meta gagal memproses format video ini.")
                                self.send_json_response(400, {"success": False, "error": {"message": f"Meta video error: {err_msg}"}})
                                return
                    except Exception as poll_e:
                        print(f"[*] Video polling notice: {poll_e}", flush=True)
            else:
                # Untuk Gambar: Server Meta butuh 3 detik untuk mengunduh byte gambar
                print("[*] Menunggu server Meta mengunduh gambar (3 detik)...", flush=True)
                time.sleep(3)

            # 2. Publish Container
            print(f"[*] Mempublikasikan container {creation_id} ke Instagram Feed...", flush=True)
            publish_url = f"{base_url}/{target_id}/media_publish"
            publish_params = {
                "creation_id": creation_id,
                "access_token": token
            }
            encoded_pub = urllib.parse.urlencode(publish_params).encode('utf-8')
            req2 = urllib.request.Request(publish_url, data=encoded_pub, headers={"User-Agent": "AgroPost/1.0"})

            with urllib.request.urlopen(req2) as resp2:
                res2_data = json.loads(resp2.read().decode('utf-8'))

            print(f"[🚀] SUKSES TAYANG! ID Post: {res2_data.get('id')}")
            self.send_json_response(200, {"success": True, "data": res2_data})

        except urllib.error.HTTPError as err:
            err_content = err.read().decode('utf-8')
            try:
                err_json = json.loads(err_content)
                self.send_json_response(400, {"success": False, "error": err_json})
            except Exception:
                self.send_json_response(err.code, {"success": False, "error": {"message": str(err)}})
        except Exception as e:
            self.send_json_response(500, {"success": False, "error": {"message": str(e)}})

    def send_json_response(self, code, obj):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode('utf-8'))

def run():
    # Change dir to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), AgroPostHandler) as httpd:
        print("=" * 60)
        print(f" AgroPost Bridge Server Aktif di: http://localhost:{PORT}")
        print(f" Buka URL: http://localhost:{PORT}/ig-manager.html")
        print("=" * 60)
        httpd.serve_forever()

if __name__ == "__main__":
    run()
