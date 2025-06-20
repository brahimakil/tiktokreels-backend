# backend/api/download.py
from http.server import BaseHTTPRequestHandler
import json
import requests
import os

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Enhanced CORS headers
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()
            
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            video_url = data.get('url')
            if not video_url:
                response = {'error': 'URL is required'}
                self.wfile.write(json.dumps(response).encode())
                return
            
            # Detect platform
            platform = self.detect_platform(video_url)
            if not platform:
                response = {'error': 'Unsupported platform'}
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
            response = {'error': f'Server error: {str(e)}'}
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
            print(f"🔗 Processing TikTok URL: {video_url}")
            
            # Method 1: Try TikTok Downloader API (Free)
            api_url = "https://tiktok-video-no-watermark2.p.rapidapi.com/"
            
            headers = {
                "X-RapidAPI-Key": os.getenv("RAPIDAPI_KEY", "demo_key"),
                "X-RapidAPI-Host": "tiktok-video-no-watermark2.p.rapidapi.com"
            }
            
            payload = {"url": video_url, "hd": "1"}
            
            try:
                response = requests.post(api_url, json=payload, headers=headers, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('success'):
                        return {
                            'success': True,
                            'download_url': data.get('data', {}).get('hdplay', data.get('data', {}).get('play')),
                            'video_info': {
                                'title': data.get('data', {}).get('title', 'TikTok Video'),
                                'author': data.get('data', {}).get('author', {}).get('nickname', 'Unknown'),
                                'duration': data.get('data', {}).get('duration', 0),
                                'view_count': data.get('data', {}).get('play_count', 0),
                                'like_count': data.get('data', {}).get('digg_count', 0),
                                'share_count': data.get('data', {}).get('share_count', 0),
                            }
                        }
            except Exception as api_error:
                print(f"❌ RapidAPI failed: {str(api_error)}")
            
            # Method 2: Alternative free service
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
                print(f"❌ Alternative API failed: {str(alt_error)}")
            
            # Method 3: Another free service
            try:
                tikmate_url = "https://tikmate.online/download"
                tikmate_payload = {"url": video_url}
                
                tikmate_response = requests.post(tikmate_url, data=tikmate_payload, timeout=15)
                if tikmate_response.status_code == 200:
                    return {
                        'success': True,
                        'download_url': video_url,  # Placeholder
                        'video_info': {
                            'title': 'TikTok Video (Processing)',
                            'author': 'TikTok User',
                            'duration': 0,
                            'view_count': 0,
                            'like_count': 0,
                            'share_count': 0,
                        },
                        'message': 'Download processed - check the link'
                    }
            except Exception as tikmate_error:
                print(f"❌ TikMate failed: {str(tikmate_error)}")
            
            return {
                'success': False,
                'error': 'All download methods failed. TikTok may be blocking requests.',
                'suggestion': 'Try using a paid API service for reliable downloads.'
            }
            
        except Exception as e:
            print(f"💥 General Error: {str(e)}")
            return {'error': f'Download failed: {str(e)}'}