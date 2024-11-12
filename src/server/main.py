from flask import Flask, request
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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app, 
     resources={r"/*": {
         "origins": ["https://onebreathpilot.netlify.app", "http://localhost:3000"],
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

# Register scheduled task
@scheduler.task('interval', id='update_expired_samples', seconds=300)  # runs every 5 minutes
def scheduled_update_expired_samples():
    with app.app_context():
        try:
            # Calculate the timestamp for 2 hours ago using pytz
            two_hours_ago = datetime.now(pytz.UTC) - timedelta(hours=2)
            
            # Find samples that need updating
            expired_samples = collection.find({
                "status": "In Process",
                "timestamp": {"$lt": two_hours_ago}
            })
            
            # Update samples and send notifications
            for sample in expired_samples:
                result = collection.update_one(
                    {"_id": sample["_id"]},
                    {"$set": {"status": "Ready for Pickup"}}
                )
                
                if result.modified_count > 0:
                    subject = f"Sample Ready for Pickup: {sample['chip_id']}"
                    body = (f"Sample with chip ID {sample['chip_id']} is now ready for pickup.\n"
                           f"Sample Type: {sample.get('sample_type', 'N/A')}\n"
                           f"Patient ID: {sample.get('patient_id', 'N/A')}\n"
                           f"Time Registered: {sample['timestamp'].strftime('%Y-%m-%d %H:%M:%S UTC')}")
                    send_email(subject, body)
                    logger.info(f"Updated sample {sample['chip_id']} to Ready for Pickup")
                
        except Exception as e:
            error_msg = f"Scheduled task error: {str(e)}"
            logger.error(error_msg)
            with app.app_context():
                send_email("Error in Sample Update Task", error_msg)

try:
    # Firebase Admin SDK initialization
    cred = credentials.Certificate('/etc/secrets/Firebaseadminsdk.json')
    firebase_admin.initialize_app(cred)
    
    # Initialize MongoDB client
    client = MongoClient(Config.MONGO_URI)
    db = client[Config.DATABASE_NAME]
    collection = db[Config.COLLECTION_NAME]
    analyzed_collection = db[Config.ANALYZED_COLLECTION_NAME]
    
    # Test MongoDB connection
    client.admin.command('ping')
    logger.info("Successfully connected to MongoDB")
    
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

# Start background monitoring
from .tasks.monitor import start_monitoring
start_monitoring(collection)

# Add the admin blueprint
app.register_blueprint(admin_api, url_prefix='/admin')

# Configure logging with SocketIO handler
socket_handler = SocketIOHandler()
logger.addHandler(socket_handler)

# Initialize SocketIO
from .socket import init_socketio
socketio = init_socketio(app)

# Initialize Firebase Admin SDK if not already initialized
if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv('FIREBASE_ADMIN_SDK_PATH'))
    firebase_admin.initialize_app(cred)

# Make socketio available to other modules
__all__ = ['socketio']

@app.teardown_appcontext
def cleanup(exception=None):
    client = getattr(app, 'mongodb_client', None)
    if client:
        client.close()