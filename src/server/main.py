import eventlet
eventlet.monkey_patch(all=True)

from flask import Flask, request, current_app
from flask_cors import CORS
from flask_mail import Mail
import firebase_admin
from firebase_admin import credentials
from google.cloud import storage
from pymongo import MongoClient
from openai import OpenAI
import logging
from src.server.utils.helpers import send_email
from src.server.config import Config
from flask_apscheduler import APScheduler
from datetime import datetime, timedelta
import pytz
import os
from .routes.admin import admin_api, SocketIOHandler
from flask_socketio import SocketIO
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import time
from src.server.utils.mongo import create_mongo_client, test_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app, 
     resources={r"/*": {
         "origins": ["https://onebreathpilot.netlify.app", "http://localhost:5173"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True,
         "expose_headers": ["Content-Range", "X-Content-Range"],
         "max_age": 600
     }},
     supports_credentials=True)

# Initialize Flask-Mail
mail = Mail(app)

# Initialize scheduler
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

# Initialize SocketIO with specific configuration for production
socketio = SocketIO(
    app,
    cors_allowed_origins=["https://onebreathpilot.netlify.app", "http://localhost:5173"],
    async_mode='eventlet',  # Changed from 'gevent' to 'eventlet'
    logger=True,
    engineio_logger=True,
    ping_timeout=60
)

# Create application context immediately
ctx = app.app_context()
ctx.push()

try:
    # Firebase Admin SDK initialization
    cred = credentials.Certificate('/etc/secrets/Firebaseadminsdk.json')
    firebase_admin.initialize_app(cred)
    
    # Initialize MongoDB client
    logger.info("Attempting to connect to MongoDB...")
    client = create_mongo_client(Config.MONGO_URI)
    
    if test_connection(client):
        logger.info("Successfully connected to MongoDB")
        db = client[Config.DATABASE_NAME]
        collection = db[Config.COLLECTION_NAME]
        analyzed_collection = db[Config.ANALYZED_COLLECTION_NAME]
    else:
        raise ConnectionError("Failed to establish MongoDB connection")
    
    # Initialize GCS client
    storage_client = storage.Client.from_service_account_json(Config.GCS_CREDENTIALS)
    bucket = storage_client.bucket(Config.GCS_BUCKET)
    
    # Initialize OpenAI client
    openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)
    
except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    raise

# Register routes after successful initialization
from .routes.api import api
app.register_blueprint(api)

# Add the admin blueprint
app.register_blueprint(admin_api, url_prefix='/admin')

# Configure logging with SocketIO handler
socket_handler = SocketIOHandler()
logger.addHandler(socket_handler)

@app.after_request
def add_headers(response):
    origin = request.headers.get('Origin')
    if origin in ["https://onebreathpilot.netlify.app", "http://localhost:5173"]:
        response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

# Make sure this is at the end of the file
if __name__ == '__main__':
    socketio.run(app)