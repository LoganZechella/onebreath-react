from flask_socketio import SocketIO

socketio = SocketIO()

def init_socketio(app):
    socketio.init_app(app, cors_allowed_origins=["https://onebreathpilot.netlify.app", "http://localhost:3000"])
    return socketio 