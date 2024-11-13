import eventlet
eventlet.monkey_patch(all=True)

from src.server.main import app, socketio

if __name__ == '__main__':
    socketio.run(app) 