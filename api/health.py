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
            'status': 'Backend Online! 🚀',
            'version': '7.1.0',
            'endpoints': ['/api/download', '/api/health'],
            'supported_platforms': ['tiktok', 'instagram (coming soon)', 'facebook (coming soon)']
        }
        
        self.wfile.write(json.dumps(response).encode())
        return