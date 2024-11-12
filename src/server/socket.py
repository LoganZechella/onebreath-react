import eventlet
eventlet.monkey_patch(all=True)

from flask_socketio import SocketIO

socketio = SocketIO()

def init_socketio(app):
    socketio.init_app(
        app,
        cors_allowed_origins=["https://onebreathpilot.netlify.app", "http://localhost:5173"],
        async_mode='eventlet',
        ping_timeout=60
    )
    return socketio 