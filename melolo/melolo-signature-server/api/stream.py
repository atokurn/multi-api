"""
Stream API Endpoint
Fetches video stream and detail using generated signatures
Updated to match Melolo APK v5.1.8
"""

from flask import Flask, request, jsonify
import requests
import sys
import os
import time
import json
import base64

# Add lib to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from lib.argus import generate_all_signatures
except ImportError:
    from lib.argus import generate_all_signatures

app = Flask(__name__)

# ============================================
# Melolo API configuration (from APK v5.1.8)
# ============================================
BASE_URL = "https://api.tmtreader.com"
APP_ID = "645713"
APP_NAME = "Melolo"
VERSION_CODE = "51080"
VERSION_NAME = "5.1.8"
DEFAULT_DEVICE_ID = "7591043717768381959"  
DEFAULT_INSTALL_ID = "7591045314401322760"

# Device params matching the APK
DEFAULT_DEVICE_PARAMS = {
    'aid': APP_ID,
    'app_name': APP_NAME,
    'version_code': VERSION_CODE,
    'version_name': VERSION_NAME,
    'device_platform': 'android',
    'os': 'android',
    'os_version': '14',
    'os_api': '34',
    'device_type': 'sdk_gphone64_arm64',
    'device_brand': 'google',
    'language': 'id',
    'app_language': 'id',
    'sys_language': 'id',
    'user_language': 'id',
    'current_region': 'ID',
    'carrier_region': 'ID',
    'app_region': 'ID',
    'sys_region': 'ID',
    'channel': 'gp',
    'ac': 'wifi',
    'ssmix': 'a',
    'resolution': '1080*2337',
    'dpi': '420',
    'update_version_code': VERSION_CODE,
    'manifest_version_code': VERSION_CODE,
    'carrier_region_v2': '510',
    'time_zone': 'Asia/Jakarta',
    'mcc_mnc': '510010',
}

USER_AGENT = f'com.worldance.drama/{VERSION_CODE} (Linux; U; Android 14; en; sdk_gphone64_arm64; Build/UE1A.230829.036.A4; Cronet/TTNetVersion:57545f6e 2025-08-04 QuicVersion:ccae1727 2025-07-24)'


def build_query_string(extra_params=None):
    """Build full query string from device params + extras"""
    params = {**DEFAULT_DEVICE_PARAMS}
    if extra_params:
        params.update(extra_params)
    params['_rticket'] = str(int(time.time() * 1000))
    return '&'.join(f'{k}={v}' for k, v in params.items())


def get_video_stream(video_id: str, device_id: str = None, install_id: str = None):
    """
    Fetch video stream URL from Melolo API using generated signatures
    """
    device_id = device_id or DEFAULT_DEVICE_ID
    install_id = install_id or DEFAULT_INSTALL_ID
    timestamp = int(time.time())
    
    # Build query string with all device params
    extra_params = {
        'video_id': video_id,
        'content_type': '1',
        'device_id': device_id,
        'iid': install_id,
    }
    query_string = build_query_string(extra_params)
    api_path = f'/novel/player/video_model/v1/?{query_string}'
    full_url = BASE_URL + api_path
    
    # Generate signatures
    headers = generate_all_signatures(
        url=api_path,
        device_id=device_id,
        install_id=install_id,
        app_id=APP_ID
    )
    
    # Build request headers
    request_headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json; charset=utf-8, application/x-protobuf',
        'Accept-Encoding': 'gzip, deflate',
        'Age-Range': '3',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json; charset=utf-8',
        'Host': 'api.tmtreader.com',
        'passport-sdk-version': '50357',
        'sdk-version': '2',
        'x-vc-bdturing-sdk-version': '2.2.1.i18n',
        'X-Xs-From-Web': 'false',
        'X-SS-DP': APP_ID,
        **headers
    }
    
    try:
        response = requests.get(full_url, headers=request_headers, timeout=30)
        data = response.json()
        
        # Process video_model to decode base64 URLs
        if data.get('data') and data['data'].get('video_model'):
            try:
                video_model = json.loads(data['data']['video_model'])
                data['data']['parsed_video_model'] = video_model
                
                # Decode base64 video URLs
                if video_model.get('video_list'):
                    for quality, video in video_model['video_list'].items():
                        if video.get('main_url'):
                            video['decoded_main_url'] = base64.b64decode(video['main_url']).decode('utf-8')
                        if video.get('backup_url_1'):
                            video['decoded_backup_url'] = base64.b64decode(video['backup_url_1']).decode('utf-8')
            except (json.JSONDecodeError, Exception) as e:
                data['video_model_parse_error'] = str(e)
        
        return data
    except Exception as e:
        return {'error': str(e), 'success': False}


def get_video_detail(series_id: str, device_id: str = None, install_id: str = None):
    """
    Fetch video detail (episode list) from Melolo API
    """
    device_id = device_id or DEFAULT_DEVICE_ID
    install_id = install_id or DEFAULT_INSTALL_ID
    timestamp = int(time.time())
    
    # Build query string
    extra_params = {
        'device_id': device_id,
        'iid': install_id,
    }
    query_string = build_query_string(extra_params)
    api_path = f'/novel/player/video_detail/v1/?{query_string}'
    full_url = BASE_URL + api_path
    
    # Body
    body_data = json.dumps({
        'series_id': str(series_id),
        'content_type': 1
    })
    
    # Generate signatures with body
    headers = generate_all_signatures(
        url=api_path,
        body=body_data,
        device_id=device_id,
        install_id=install_id,
        app_id=APP_ID
    )
    
    request_headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json; charset=utf-8, application/x-protobuf',
        'Accept-Encoding': 'gzip, deflate',
        'Age-Range': '3',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json; charset=utf-8',
        'Host': 'api.tmtreader.com',
        'passport-sdk-version': '50357',
        'sdk-version': '2',
        'x-vc-bdturing-sdk-version': '2.2.1.i18n',
        'X-Xs-From-Web': 'false',
        'X-SS-DP': APP_ID,
        **headers
    }
    
    try:
        response = requests.post(full_url, data=body_data, headers=request_headers, timeout=30)
        return response.json()
    except Exception as e:
        return {'error': str(e), 'success': False}


@app.route('/api/stream', methods=['GET'])
def stream():
    """
    Get video stream URL
    GET /api/stream?videoId=7583564321033030661
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
        
        # Extract the main_url from parsed video model
        main_url = None
        backup_url = None
        expire_time = None
        
        parsed = result.get('data', {}).get('parsed_video_model', {})
        video_list = parsed.get('video_list', {})
        
        # Get best quality video URL
        for quality in ['video_4', 'video_3', 'video_2', 'video_1']:
            if quality in video_list:
                main_url = video_list[quality].get('decoded_main_url')
                backup_url = video_list[quality].get('decoded_backup_url')
                break
        
        # Also check direct main_url
        if not main_url and result.get('data', {}).get('main_url'):
            main_url = result['data']['main_url']
        
        expire_time = result.get('data', {}).get('expire_time')
        
        return jsonify({
            'success': True,
            'data': {
                'main_url': main_url,
                'backup_url': backup_url,
                'expire_time': expire_time,
                'raw': result.get('data', {})
            },
            'source': 'python-signature-server'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/detail', methods=['GET'])
def detail():
    """
    Get video detail (episode list)
    GET /api/detail?seriesId=12345
    """
    series_id = request.args.get('seriesId') or request.args.get('series_id') or request.args.get('bookId')
    device_id = request.args.get('device_id')
    install_id = request.args.get('install_id')
    
    if not series_id:
        return jsonify({
            'success': False,
            'error': 'seriesId parameter is required'
        }), 400
    
    try:
        result = get_video_detail(series_id, device_id, install_id)
        
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
