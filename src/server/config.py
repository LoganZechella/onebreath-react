from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    # Flask Configuration
    FLASK_PORT = int(os.getenv('PORT', 5000))
    
    # Mail Configuration
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_FROM_ADDRESS = os.getenv('MAIL_FROM_ADDRESS')
    RECIPIENT_EMAILS = os.getenv('RECIPIENT_EMAILS', '').split(',')
    
    # Twilio Configuration
    TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
    TWILIO_RECIPIENT_NUMBERS = os.getenv('TWILIO_RECIPIENT_NUMBERS', '').split(',')
    
    # MongoDB Configuration
    MONGO_URI = os.getenv('MONGO_URI')
    if not MONGO_URI:
        raise ValueError("MONGO_URI environment variable is not set")
    
    DATABASE_NAME = 'pilotstudy2024'
    COLLECTION_NAME = os.getenv('COLLECTION_NAME')
    ANALYZED_COLLECTION_NAME = os.getenv('ANALYZED_COLLECTION_NAME')
    MONGODB_DATA_API_KEY = os.getenv('MONGODB_DATA_API_KEY')
    
    # Google Cloud Storage
    GCS_BUCKET = os.getenv('GCS_BUCKET')
    GCS_CREDENTIALS = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    ASSISTANT_ID = os.getenv('ASSISTANT_ID')

class ProductionConfig(Config):
    """Production-specific configuration"""
    DEBUG = False
    TESTING = False
    
    # MongoDB optimizations
    MONGO_MAX_POOL_SIZE = 50
    MONGO_MIN_POOL_SIZE = 10
    
    # Cache settings
    CACHE_TYPE = 'redis'
    CACHE_REDIS_URL = os.getenv('REDIS_URL')
    CACHE_DEFAULT_TIMEOUT = 300
    
    # Rate limiting
    RATELIMIT_STORAGE_URL = os.getenv('REDIS_URL')
    RATELIMIT_STRATEGY = 'fixed-window-elastic-expiry'
    
    # Socket.IO
    SOCKETIO_MESSAGE_QUEUE = os.getenv('REDIS_URL')
    
    # OpenAI optimization
    OPENAI_REQUEST_TIMEOUT = 25
    OPENAI_MAX_RETRIES = 3