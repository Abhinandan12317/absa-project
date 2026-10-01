from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging

logger = logging.getLogger(__name__)

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "absa_project"

_client = None
_db = None

def get_database():
    global _client, _db
    if _db is None:
        try:
            _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            _client.admin.command('ping')
            _db = _client[DB_NAME]
            logger.info("MongoDB connected successfully")
        except ConnectionFailure as e:
            logger.error(f"MongoDB connection failed: {e}")
            raise
    return _db

def close_connection():
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")