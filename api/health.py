# backend/api/health.py
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            'status': 'TikTok Downloader API Online! 🚀',
            'version': '3.0.0',
            'methods': ['Third-party APIs', 'Multiple fallbacks'],
            'note': 'Using external services to bypass TikTok blocks'
        }
        
        self.wfile.write(json.dumps(response).encode())
        return