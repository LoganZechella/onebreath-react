import eventlet
eventlet.monkey_patch()

from flask_socketio import SocketIO
from flask import request
from .utils.cache import cache_manager
from .config import Config

class OptimizedSocketIO(SocketIO):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._clients = set()
        
    def handle_connect(self):
        self._clients.add(request.sid)
        
    def handle_disconnect(self):
        self._clients.discard(request.sid)
        
    def emit_to_active_clients(self, event, data):
        """Optimized emission to only active clients"""
        for client in self._clients:
            self.emit(event, data, room=client)

socketio = OptimizedSocketIO()

def init_socketio(app):
    socketio.init_app(
        app,
        cors_allowed_origins=["https://onebreathpilot.netlify.app", "http://localhost:5173"],
        async_mode='eventlet',
        ping_timeout=60,
        ping_interval=25,
        max_http_buffer_size=1024 * 1024,
        message_queue='redis://localhost:6379/0' if not Config.PRODUCTION else Config.REDIS_URL,
        async_handlers=True,
        logger=True,
        engineio_logger=True
    )
    return socketio 