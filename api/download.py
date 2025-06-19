# backend/api/download.py
from http.server import BaseHTTPRequestHandler
import json
import requests
import urllib.parse

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Set CORS headers
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            video_url = data.get('url')
            if not video_url:
                response = {'success': False, 'error': 'URL is required'}
                self.wfile.write(json.dumps(response).encode())
                return
            
            # Detect platform
            platform = self.detect_platform(video_url)
            if not platform:
                response = {'success': False, 'error': 'Unsupported platform'}
                self.wfile.write(json.dumps(response).encode())
                return
            
            if platform == 'tiktok':
                result = self.download_tiktok_api(video_url)
                self.wfile.write(json.dumps(result).encode())
            else:
                response = {
                    'success': False,
                    'error': f'{platform.title()} support coming soon!'
                }
                self.wfile.write(json.dumps(response).encode())
                
        except Exception as e:
            response = {'success': False, 'error': f'Server error: {str(e)}'}
            self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def detect_platform(self, url):
        """Auto-detect platform from URL"""
        if 'tiktok.com' in url or 'vm.tiktok.com' in url:
            return 'tiktok'
        elif 'instagram.com' in url:
            return 'instagram'
        elif 'facebook.com' in url or 'fb.watch' in url:
            return 'facebook'
        return None
    
    def download_tiktok_api(self, video_url):
        """Download TikTok video using third-party API"""
        try:
            # Using free TikWM API
            api_url = "https://www.tikwm.com/api/"
            payload = {"url": video_url, "hd": 1}
            
            response = requests.post(api_url, json=payload, timeout=15)
            if response.status_code == 200:
                data = response.json()
                
                if data.get('code') == 0:  # Success
                    video_data = data.get('data', {})
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
            
            return {
                'success': False,
                'error': 'Download service temporarily unavailable',
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Download failed: {str(e)}'}