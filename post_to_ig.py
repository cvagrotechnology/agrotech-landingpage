#!/usr/bin/env python3
"""
Agrotech Instagram Auto-Publisher (Meta Graph API v19.0)
======================================================
Script CLI untuk mengunggah Single Feed Image, Carousel, atau Video Reels
langsung ke akun Instagram Bisnis/Creator Agrotech.
Tidak membutuhkan pip install eksternal (menggunakan modul standar Python).

Penggunaan:
    python3 post_to_ig.py --image assets/ig_reels_promo_1.jpg --caption "Caption di sini..." --token "IGAAT..."
"""

import sys
import os
import time
import argparse
import json
import urllib.request
import urllib.parse
import urllib.error

# KONFIGURASI DEFAULT
DEFAULT_IG_USER_ID = os.environ.get("IG_USER_ID", "17841433558793598")
DEFAULT_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN", "")
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

def get_base_url(token):
    if token and token.startswith("IG"):
        return f"https://graph.instagram.com/{GRAPH_API_VERSION}"
    return f"https://graph.facebook.com/{GRAPH_API_VERSION}"

def resolve_public_url(media_path):
    """Memastikan URL media dapat diunduh oleh server Meta via internet"""
    if media_path.startswith("http://") or media_path.startswith("https://"):
        return media_path
    if media_path in PUBLIC_ASSET_MAP:
        return PUBLIC_ASSET_MAP[media_path]
    clean_path = media_path.lstrip("./")
    return PUBLIC_ASSET_MAP.get(clean_path, "https://files.catbox.moe/j84sma.jpg")

def http_post(url, data_dict):
    """Kirim POST request menggunakan modul bawaan urllib"""
    encoded = urllib.parse.urlencode(data_dict).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, headers={"User-Agent": "AgroPost-CLI/1.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        try:
            return json.loads(err.read().decode("utf-8"))
        except Exception:
            return {"error": {"message": str(err), "code": err.code}}
    except Exception as err:
        return {"error": {"message": str(err)}}

def http_get(url, params_dict=None):
    """Kirim GET request menggunakan modul bawaan urllib"""
    full_url = url
    if params_dict:
        query = urllib.parse.urlencode(params_dict)
        full_url = f"{url}?{query}"
    req = urllib.request.Request(full_url, headers={"User-Agent": "AgroPost-CLI/1.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        try:
            return json.loads(err.read().decode("utf-8"))
        except Exception:
            return {"error": {"message": str(err), "code": err.code}}
    except Exception as err:
        return {"error": {"message": str(err)}}

def create_media_container(user_id, access_token, media_url, caption, media_type="IMAGE"):
    """Langkah 1: Membuat Media Container di server Meta Graph API"""
    base_url = get_base_url(access_token)
    url = f"{base_url}/{user_id}/media"
    online_url = resolve_public_url(media_url)
    
    payload = {
        "access_token": access_token,
        "caption": caption
    }
    
    if media_type == "VIDEO" or media_type == "REELS":
        payload["media_type"] = "REELS"
        payload["video_url"] = online_url
    else:
        payload["image_url"] = online_url

    print(f"[*] Mengirim pembuatan container ({media_type})...")
    print(f"[*] Endpoint : {url}")
    print(f"[*] Media URL: {online_url}")
    
    data = http_post(url, payload)
    
    if "error" in data:
        err = data["error"]
        print(f"[!] Error dari Meta API: {err.get('message')}")
        if "error_user_msg" in err:
            print(f"[!] Keterangan: {err.get('error_user_msg')}")
        return None
        
    container_id = data.get("id")
    print(f"[✓] Container berhasil dibuat dengan ID: {container_id}")
    return container_id

def wait_for_container_ready(container_id, access_token, max_attempts=15):
    """Menunggu pemrosesan video/reels sampai siap dipublikasikan"""
    base_url = get_base_url(access_token)
    url = f"{base_url}/{container_id}"
    params = {
        "fields": "status_code,status",
        "access_token": access_token
    }
    
    print("[*] Menunggu status pemrosesan container...")
    for _ in range(max_attempts):
        res = http_get(url, params)
        status = res.get("status_code")
        
        if status == "FINISHED":
            print("[✓] Media container siap dipublikasikan!")
            return True
        elif status == "ERROR":
            print(f"[!] Gagal memproses media: {res.get('status')}")
            return False
            
        time.sleep(2)
    return True

def publish_media_container(user_id, access_token, container_id):
    """Langkah 2: Mempublikasikan container ke feed akun Instagram"""
    base_url = get_base_url(access_token)
    url = f"{base_url}/{user_id}/media_publish"
    payload = {
        "creation_id": container_id,
        "access_token": access_token
    }
    
    print(f"[*] Mempublikasikan container {container_id} ke Instagram...")
    data = http_post(url, payload)
    
    if "error" in data:
        print(f"[!] Gagal publikasi: {data['error'].get('message')}")
        return None
        
    post_id = data.get("id")
    print(f"[🚀] SUKSES! Postingan telah terbit di Instagram. ID Post: {post_id}")
    return post_id

def main():
    parser = argparse.ArgumentParser(description="Agrotech Instagram Auto Publisher")
    parser.add_argument("--image", required=True, help="URL media publik (atau path lokal assets/...)")
    parser.add_argument("--caption", required=True, help="Teks caption postingan Instagram")
    parser.add_argument("--format", choices=["feed", "reels", "carousel"], default="feed", help="Format postingan")
    parser.add_argument("--user-id", default=DEFAULT_IG_USER_ID, help="Instagram Business Account ID")
    parser.add_argument("--token", default=DEFAULT_ACCESS_TOKEN, help="Meta Graph API Access Token")
    
    args = parser.parse_args()

    if not args.token:
        print("[!] Error: Token akses belum dimasukkan. Gunakan parameter --token 'TOKEN_ANDA'")
        sys.exit(1)

    print("=" * 60)
    print(" Agrotech Instagram Automated Publisher (Meta API)")
    print("=" * 60)
    print(f"Target Akun IG ID : {args.user_id}")
    print(f"Format Konten    : {args.format.upper()}")
    print(f"Media Target     : {args.image}")
    print("-" * 60)

    # 1. Buat Container
    media_type = "REELS" if args.format == "reels" else "IMAGE"
    container_id = create_media_container(args.user_id, args.token, args.image, args.caption, media_type)
    
    if not container_id:
        print("[!] Pengunggahan dibatalkan karena pembuatan container gagal.")
        sys.exit(1)

    # 2. Tunggu Pemrosesan jika format Video/Reels
    if media_type == "REELS":
        if not wait_for_container_ready(container_id, args.token):
            sys.exit(1)

    # 3. Publish
    post_id = publish_media_container(args.user_id, args.token, container_id)
    if post_id:
        print("=" * 60)
        print(f"✅ POSTINGAN SUDAH LIVE DI INSTAGRAM @cvagrotechnology!")
        print(f"ID Post: {post_id}")
        print("=" * 60)

if __name__ == "__main__":
    main()
