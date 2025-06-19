from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re
import os

app = Flask(__name__)
CORS(app)

def detect_platform(url):
    """Auto-detect platform from URL"""
    if 'tiktok.com' in url or 'vm.tiktok.com' in url:
        return 'tiktok'
    elif 'instagram.com' in url:
        return 'instagram'
    elif 'facebook.com' in url or 'fb.watch' in url:
        return 'facebook'
    return None

def download_tiktok_api(video_url):
    """Download TikTok video using third-party API"""
    try:
        print(f"🔗 Processing TikTok URL: {video_url}")
        
        # Method 1: Try free TikWM API
        try:
            alt_api_url = "https://www.tikwm.com/api/"
            alt_payload = {
                "url": video_url,
                "hd": 1
            }
            
            alt_response = requests.post(alt_api_url, json=alt_payload, timeout=15)
            if alt_response.status_code == 200:
                alt_data = alt_response.json()
                
                if alt_data.get('code') == 0:  # Success
                    video_data = alt_data.get('data', {})
                    return {
                        'success': True,
                        'download_url': video_data.get('hdplay', video_data.get('play')),
                        'video_info': {
                            'title': video_data.get('title', 'TikTok Video'),
                            'author': video_data.get('author', {}).get('nickname', 'Unknown'),
                            'duration': video_data.get('duration', 0),
                            'view_count': video_data.get('play_count', 0),
                            'like_count': video_data.get('digg_count', 0),
                            'share_count': video_data.get('share_count', 0),
                        }
                    }
        except Exception as alt_error:
            print(f"❌ TikWM API failed: {str(alt_error)}")
        
        return {
            'success': False,
            'error': 'Download service temporarily unavailable',
            'suggestion': 'Please try again in a few moments'
        }
        
    except Exception as e:
        print(f"💥 General Error: {str(e)}")
        return {'error': f'Download failed: {str(e)}'}

@app.route('/api/download', methods=['POST'])
def download_video():
    """Universal download endpoint"""
    try:
        data = request.get_json()
        video_url = data.get('url')
        
        if not video_url:
            return jsonify({'error': 'URL is required'}), 400
        
        platform = detect_platform(video_url)
        if not platform:
            return jsonify({'error': 'Unsupported platform'}), 400
        
        if platform == 'tiktok':
            result = download_tiktok_api(video_url)
            return jsonify(result)
        else:
            return jsonify({
                'success': False,
                'error': f'{platform.title()} support coming soon!'
            })
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'Backend Online! 🚀',
        'version': '7.1.0',
        'endpoints': ['/api/download', '/api/health'],
        'supported_platforms': ['tiktok', 'instagram (coming soon)', 'facebook (coming soon)']
    })

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'TikTok Downloader API',
        'endpoints': ['/api/health', '/api/download'],
        'status': 'online'
    })

# Vercel entry point
def handler(request):
    return app(request.environ, start_response)

if __name__ == '__main__':
    app.run(debug=True)
