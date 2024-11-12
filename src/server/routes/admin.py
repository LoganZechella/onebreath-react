from flask import Blueprint, jsonify, request
from flask_socketio import emit, SocketIO
from functools import wraps
import logging
from datetime import datetime, timedelta, UTC
from collections import deque
import threading
from firebase_admin import auth

# Initialize SocketIO (this should be imported from main.py)
from ..socket import socketio

admin_api = Blueprint('admin_api', __name__)

# In-memory storage for logs and metrics
class MetricsStore:
    def __init__(self, max_size=1000):
        self.error_logs = deque(maxlen=max_size)
        self.request_logs = deque(maxlen=max_size)
        self.performance_metrics = deque(maxlen=max_size)
        self.active_connections = 0
        self.lock = threading.Lock()

metrics_store = MetricsStore()

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = auth.verify_id_token(token)
            if not decoded_token.get('admin', False):
                return jsonify({'error': 'Unauthorized'}), 403
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid token'}), 401
            
    return decorated_function

@admin_api.route('/health', methods=['GET'])
@require_admin
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(UTC).isoformat(),
        'active_connections': metrics_store.active_connections,
    })

@admin_api.route('/logs/error', methods=['GET'])
@require_admin
def get_error_logs():
    days = request.args.get('days', 3, type=int)
    cutoff = datetime.now(UTC) - timedelta(days=days)
    
    with metrics_store.lock:
        logs = [log for log in metrics_store.error_logs if log['timestamp'] >= cutoff]
    
    return jsonify(logs)

@admin_api.route('/logs/request', methods=['GET'])
@require_admin
def get_request_logs():
    days = request.args.get('days', 3, type=int)
    cutoff = datetime.now(UTC) - timedelta(days=days)
    
    with metrics_store.lock:
        logs = [log for log in metrics_store.request_logs if log['timestamp'] >= cutoff]
    
    return jsonify(logs)

@admin_api.route('/metrics', methods=['GET'])
@require_admin
def get_metrics():
    with metrics_store.lock:
        return jsonify({
            'performance': list(metrics_store.performance_metrics)[-100:],  # Last 100 metrics
        })

# Custom logging handler
class SocketIOHandler(logging.Handler):
    def emit(self, record):
        try:
            log_entry = {
                'timestamp': datetime.now(UTC).isoformat(),
                'level': record.levelname,
                'message': record.getMessage(),
                'module': record.module,
                'funcName': record.funcName,
                'lineNo': record.lineno,
            }
            
            with metrics_store.lock:
                metrics_store.error_logs.append(log_entry)
            
            # Emit to all connected admin clients
            emit('log_update', log_entry, namespace='/admin')
        except Exception as e:
            print(f"Error in SocketIOHandler: {e}")

# Request logger middleware
@admin_api.before_app_request
def log_request():
    if not request.path.startswith('/admin'):  # Don't log admin requests
        log_entry = {
            'timestamp': datetime.now(UTC).isoformat(),
            'method': request.method,
            'path': request.path,
            'ip': request.remote_addr,
            'user_agent': request.user_agent.string,
        }
        
        with metrics_store.lock:
            metrics_store.request_logs.append(log_entry)

# WebSocket events
@socketio.on('connect', namespace='/admin')
@require_admin
def handle_admin_connect():
    with metrics_store.lock:
        metrics_store.active_connections += 1
    emit('connection_update', {'active_connections': metrics_store.active_connections}, broadcast=True)

@socketio.on('disconnect', namespace='/admin')
def handle_admin_disconnect():
    with metrics_store.lock:
        metrics_store.active_connections -= 1
    emit('connection_update', {'active_connections': metrics_store.active_connections}, broadcast=True) 