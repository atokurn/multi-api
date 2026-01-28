"""
Stream API Endpoint
Fetches video stream using generated signatures
"""

from flask import Flask, request, jsonify
import requests
import sys
import os
import time

# Add lib to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from lib.argus import generate_all_signatures
except ImportError:
    from lib.argus import generate_all_signatures

app = Flask(__name__)

# Melolo API configuration
BASE_URL = "https://api16-normal-useast5.tiktokv.us"
APP_ID = "645713"
DEFAULT_DEVICE_ID = "7588647109784749575"
DEFAULT_INSTALL_ID = "7588654318736475654"

def get_video_stream(video_id: str, device_id: str = None, install_id: str = None):
    """
    Fetch video stream URL from Melolo API using generated signatures
    """
    device_id = device_id or DEFAULT_DEVICE_ID
    install_id = install_id or DEFAULT_INSTALL_ID
    timestamp = int(time.time())
    
    # Build API URL
    params = {
        'item_id': video_id,
        'aid': APP_ID,
        'app_name': 'melolovideo',
        'version_code': '10904',
        'device_id': device_id,
        'iid': install_id,
        'os_version': '14',
        'device_platform': 'android'
    }
    
    query_string = '&'.join(f'{k}={v}' for k, v in params.items())
    api_path = f'/novel/player/video_model/v1/?{query_string}'
    full_url = BASE_URL + api_path
    
    # Generate signatures
    headers = generate_all_signatures(
        url=api_path,
        device_id=device_id,
        install_id=install_id,
        app_id=APP_ID
    )
    
    # Add other required headers
    request_headers = {
        'User-Agent': 'com.fiction.melolovideo/10904 (Linux; U; Android 14; en_US; sdk_gphone64_arm64; Build/UP1A.231005.007; Cronet/TTNetVersion:6e51da31 2024-09-11 QuicVersion:11cd2db6 2023-12-14)',
        'Accept': 'application/json',
        'X-SS-TC': '0',
        **headers
    }
    
    try:
        response = requests.get(full_url, headers=request_headers, timeout=30)
        return response.json()
    except Exception as e:
        return {'error': str(e), 'success': False}

@app.route('/api/stream', methods=['GET'])
def stream():
    """
    Get video stream URL
    
    GET /api/stream?videoId=7583564321033030661
    
    Returns video stream data with main_url, backup_url, expire_time
    """
    video_id = request.args.get('videoId') or request.args.get('video_id')
    device_id = request.args.get('device_id')
    install_id = request.args.get('install_id')
    
    if not video_id:
        return jsonify({
            'success': False,
            'error': 'videoId parameter is required'
        }), 400
    
    try:
        result = get_video_stream(video_id, device_id, install_id)
        
        if result.get('error'):
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
        
        return jsonify({
            'success': True,
            'data': result,
            'source': 'python-signature-server'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# For Vercel
handler = app

if __name__ == '__main__':
    app.run(debug=True, port=5001)
