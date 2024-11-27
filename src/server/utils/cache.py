from functools import lru_cache, wraps
from datetime import datetime, timedelta
import hashlib
import json

class CacheManager:
    def __init__(self):
        self.sample_cache = {}
        self.cache_ttl = timedelta(minutes=1)
        
    def cache_key(self, prefix, *args, **kwargs):
        """Generate a unique cache key"""
        key_parts = [prefix, *args]
        key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
        return hashlib.md5(json.dumps(key_parts).encode()).hexdigest()
    
    def invalidate_cache(self):
        """Clear all cached data"""
        self.sample_cache.clear()
    
    def cached_samples(self, status=None):
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                key = self.cache_key('samples', status)
                now = datetime.now()
                
                if key in self.sample_cache:
                    cached_data, timestamp = self.sample_cache[key]
                    if now - timestamp < self.cache_ttl:
                        return cached_data
                
                result = func(*args, **kwargs)
                self.sample_cache[key] = (result, now)
                return result
            return wrapper
        return decorator

# Simple in-memory cache
_cache = {}

def get_cached_analysis(key: str) -> str | None:
    """
    Get cached analysis result if it exists and is not expired
    """
    if key not in _cache:
        return None
        
    cached_item = _cache[key]
    if datetime.now() - cached_item['timestamp'] > timedelta(minutes=5):
        # Cache expired
        del _cache[key]
        return None
        
    return cached_item['content']

def cache_analysis(key: str, content: str) -> None:
    """
    Cache analysis result with timestamp
    """
    _cache[key] = {
        'content': content,
        'timestamp': datetime.now()
    }

def generate_data_hash(data: list) -> str:
    """
    Generate a hash of the data to use as cache key
    """
    return hash(json.dumps(data, sort_keys=True))

cache_manager = CacheManager() 