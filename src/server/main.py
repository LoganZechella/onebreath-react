from flask import Flask
from flask_cors import CORS
from flask_mail import Mail
import firebase_admin
from firebase_admin import credentials
from google.cloud import storage
from pymongo import MongoClient
from openai import OpenAI
import logging
from src.server.config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
CORS(app, 
     resources={r"/*": {
         "origins": ["https://onebreathpilotv2.netlify.app"],
         "methods": ["GET", "POST", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True,
         "expose_headers": ["Content-Range", "X-Content-Range"],
         "max_age": 600  # Cache preflight requests for 10 minutes
     }})

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'https://onebreathpilotv2.netlify.app')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Initialize Flask-Mail
mail = Mail(app)

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

@app.teardown_appcontext
def cleanup(exception=None):
    client = getattr(app, 'mongodb_client', None)
    if client:
        client.close()