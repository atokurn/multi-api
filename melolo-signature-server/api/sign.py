"""
Signature API Endpoint for Vercel Serverless Function
Generates ByteDance security headers (X-Argus, X-Gorgon, X-Khronos, X-Ladon)
"""

from http.server import BaseHTTPRequestHandler
import json
import sys
import os
import time
import hashlib
import struct
import base64
from urllib.parse import parse_qs, urlparse

# ============================================
# INLINE GORGON IMPLEMENTATION
# ============================================

GORGON_VERSION = "0404"

def md5_hex(data: str) -> str:
    return hashlib.md5(data.encode('utf-8')).hexdigest()

def generate_gorgon(url_params_hash: str, body_hash=None, cookie_hash=None, timestamp=None) -> str:
    if timestamp is None:
        timestamp = int(time.time())
    ts_hex = format(timestamp, 'x')
    gorgon_data = GORGON_VERSION + ts_hex
    gorgon_data += url_params_hash[:8] if url_params_hash else "00000000"
    gorgon_data += body_hash[:8] if body_hash else "00000000"
    gorgon_data += cookie_hash[:8] if cookie_hash else "00000000"
    while len(gorgon_data) < 40:
        gorgon_data += "0"
    return gorgon_data

def hash_url_params(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.query:
        return md5_hex("")
    params = parse_qs(parsed.query, keep_blank_values=True)
    sorted_params = sorted(params.items())
    param_str = "&".join(f"{k}={v[0] if isinstance(v, list) and v else v}" for k, v in sorted_params)
    return md5_hex(param_str)

def generate_khronos(timestamp=None) -> str:
    if timestamp is None:
        timestamp = int(time.time())
    return str(timestamp)

def generate_ss_stub(body=None):
    if not body or body.strip() == "":
        return None
    return md5_hex(body)

# ============================================
# INLINE LADON IMPLEMENTATION
# ============================================

def xor_encrypt(data: bytes, key: bytes) -> bytes:
    result = bytearray(len(data))
    key_len = len(key)
    for i, byte in enumerate(data):
        result[i] = byte ^ key[i % key_len]
    return bytes(result)

def generate_ladon(url: str, timestamp=None, device_id: str = "", app_id: str = "645713") -> str:
    if timestamp is None:
        timestamp = int(time.time())
    payload_parts = [str(timestamp), app_id, device_id, hashlib.md5(url.encode()).hexdigest()[:16]]
    payload = "|".join(payload_parts)
    key = struct.pack(">Q", timestamp)
    encrypted = xor_encrypt(payload.encode('utf-8'), key)
    result = b'\x01\x02' + bytes([1]) + encrypted
    return base64.b64encode(result).decode('utf-8')

# ============================================
# INLINE ARGUS IMPLEMENTATION (SIMPLIFIED)
# ============================================

def generate_argus(url: str, timestamp=None, device_id: str = "", install_id: str = "", app_id: str = "645713") -> str:
    if timestamp is None:
        timestamp = int(time.time())
    # Simplified X-Argus - just base64 encoded payload
    url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()
    device_token = hashlib.md5(f"{device_id}|{install_id}|{app_id}".encode()).hexdigest()
    payload = f"{timestamp}|{url_hash[:16]}|{device_token[:16]}|{app_id}"
    # Add magic header
    result = b'\xac\xec' + payload.encode('utf-8')
    return base64.b64encode(result).decode('utf-8')

def generate_all_signatures(url: str, body=None, cookie=None, timestamp=None, device_id="", install_id="", app_id="645713"):
    if timestamp is None:
        timestamp = int(time.time())
    url_hash = hash_url_params(url)
    body_hash = generate_ss_stub(body) if body else None
    cookie_hash = hashlib.md5(cookie.encode()).hexdigest() if cookie else None
    
    headers = {
        'X-Khronos': generate_khronos(timestamp),
        'X-Gorgon': generate_gorgon(url_hash, body_hash, cookie_hash, timestamp),
        'X-Ladon': generate_ladon(url, timestamp, device_id, app_id),
        'X-Argus': generate_argus(url, timestamp, device_id, install_id, app_id)
    }
    if body_hash:
        headers['X-SS-STUB'] = body_hash
    return headers

# ============================================
# VERCEL HANDLER
# ============================================

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/health' or self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'success': True,
                'service': 'melolo-signature-server',
                'status': 'healthy',
                'version': '1.0.0'
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            # Handle GET with query params
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            
            url = params.get('url', [''])[0]
            if not url:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': 'url required'}).encode())
                return
            
            device_id = params.get('device_id', ['7588647109784749575'])[0]
            install_id = params.get('install_id', ['7588654318736475654'])[0]
            app_id = params.get('app_id', ['645713'])[0]
            
            try:
                headers = generate_all_signatures(url, None, None, None, device_id, install_id, app_id)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'success': True, 'headers': headers}
                self.wfile.write(json.dumps(response).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
            
            url = data.get('url', '')
            req_body = data.get('body')
            cookie = data.get('cookie')
            device_id = data.get('device_id', '7588647109784749575')
            install_id = data.get('install_id', '7588654318736475654')
            app_id = data.get('app_id', '645713')
            
            if not url:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': 'url required'}).encode())
                return
            
            headers = generate_all_signatures(url, req_body, cookie, None, device_id, install_id, app_id)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'success': True, 'headers': headers, 'note': 'Simplified signatures'}
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
