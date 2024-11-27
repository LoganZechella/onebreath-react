from pymongo import MongoClient, ReadPreference
from pymongo.errors import ConnectionFailure
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

def create_mongo_client(uri):
    """Create a MongoDB client with optimized settings for production"""
    return MongoClient(
        uri,
        maxPoolSize=50,
        minPoolSize=10,
        maxIdleTimeMS=45000,
        waitQueueTimeoutMS=5000,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=20000,
        socketTimeoutMS=20000,
        retryWrites=True,
        read_preference=ReadPreference.PRIMARY,
        w='majority',
        journal=True
    )

@lru_cache(maxsize=1)
def get_db_client():
    """Cached database client to prevent multiple connections"""
    from ..config import Config
    return create_mongo_client(Config.MONGO_URI)

def test_connection(client):
    """Test MongoDB connection"""
    try:
        client.admin.command('ping')
        return True
    except Exception as e:
        logger.error(f"MongoDB connection test failed: {e}")
        return False 