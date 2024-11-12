import eventlet
eventlet.monkey_patch()  # This needs to happen before any other imports

from src.server.main import app, socketio

if __name__ == '__main__':
    socketio.run(app) 