from functools import lru_cache, wraps
from datetime import datetime, timedelta
import hashlib
import json

class CacheManager:
    def __init__(self):
        self.sample_cache = {}
        self.cache_ttl = timedelta(minutes=5)
        
    def cache_key(self, prefix, *args, **kwargs):
        """Generate a unique cache key"""
        key_parts = [prefix, *args]
        key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
        return hashlib.md5(json.dumps(key_parts).encode()).hexdigest()
    
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

cache_manager = CacheManager() 