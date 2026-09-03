from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse
import urllib.error

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
    "assets/cv_agrotech_corp_logo1.jpg": "https://files.catbox.moe/l6km1s.jpg",
    "assets/cv_agrotech_corp_logo2.jpg": "https://files.catbox.moe/blkicc.jpg",
    "assets/cv_agrotech_corp_logo3.jpg": "https://files.catbox.moe/8fahla.jpg"
}

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
            payload = json.loads(body)
            token = payload.get('token', '').strip()
            user_id = payload.get('user_id', '17841433558793598').strip()
            caption = payload.get('caption', '')
            media_url = payload.get('media_url', '')

            # Resolve Public URL
            if media_url in PUBLIC_ASSET_MAP:
                media_url = PUBLIC_ASSET_MAP[media_url]
            elif media_url.startswith('data:image'):
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
                        uploaded = cat_resp.read().decode('utf-8').strip()
                        if uploaded.startswith('http'):
                            media_url = uploaded
                        else:
                            media_url = "https://files.catbox.moe/blkicc.jpg"
                except Exception:
                    media_url = "https://files.catbox.moe/blkicc.jpg"
            elif not media_url.startswith('http'):
                clean_path = media_url.lstrip('./')
                media_url = PUBLIC_ASSET_MAP.get(clean_path, "https://files.catbox.moe/j84sma.jpg")

            base_url = "https://graph.instagram.com/v19.0" if token.startswith("IG") else "https://graph.facebook.com/v19.0"
            target_id = "17841433558793598" if (user_id == "1387829872774340" or not user_id) else user_id

            # 1. Create Media Container
            container_url = f"{base_url}/{target_id}/media"
            container_params = {
                "access_token": token,
                "caption": caption
            }
            is_real_video = any(media_url.lower().endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.webm'])
            if is_real_video:
                container_params["media_type"] = "REELS"
                container_params["video_url"] = media_url
            else:
                container_params["image_url"] = media_url

            encoded_data = urllib.parse.urlencode(container_params).encode('utf-8')
            req1 = urllib.request.Request(container_url, data=encoded_data, headers={"User-Agent": "AgroPost/1.0"})
            with urllib.request.urlopen(req1) as resp1:
                res1_data = json.loads(resp1.read().decode('utf-8'))

            if "id" not in res1_data:
                self.send_json(400, {"success": False, "error": res1_data})
                return

            creation_id = res1_data["id"]

            # 2. Publish Container
            publish_url = f"{base_url}/{target_id}/media_publish"
            pub_params = {
                "creation_id": creation_id,
                "access_token": token
            }
            encoded_pub = urllib.parse.urlencode(pub_params).encode('utf-8')
            req2 = urllib.request.Request(publish_url, data=encoded_pub, headers={"User-Agent": "AgroPost/1.0"})
            with urllib.request.urlopen(req2) as resp2:
                res2_data = json.loads(resp2.read().decode('utf-8'))

            self.send_json(200, {"success": True, "data": res2_data})

        except urllib.error.HTTPError as err:
            err_body = err.read().decode('utf-8')
            try:
                self.send_json(400, {"success": False, "error": json.loads(err_body)})
            except Exception:
                self.send_json(err.code, {"success": False, "error": {"message": str(err)}})
        except Exception as e:
            self.send_json(500, {"success": False, "error": {"message": str(e)}})
