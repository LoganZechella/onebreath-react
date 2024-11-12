from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging
import time

logger = logging.getLogger(__name__)

def create_mongo_client(uri):
    """Create a MongoDB client with basic configuration"""
    return MongoClient(
        uri,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000
    )

def test_connection(client):
    """Test MongoDB connection"""
    try:
        client.admin.command('ping')
        return True
    except Exception as e:
        logger.error(f"MongoDB connection test failed: {e}")
        return False 