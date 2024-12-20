from flask_mail import Message
from twilio.rest import Client
from datetime import datetime, timedelta
import pytz
import json
import gzip
from src.server.config import Config
from flask import current_app
import numpy as np

def send_email(subject, body):
    with current_app.app_context():
        msg = Message(subject, 
                     sender=Config.MAIL_FROM_ADDRESS, 
                     recipients=Config.RECIPIENT_EMAILS)
        msg.body = body
        try:
            current_app.extensions['mail'].send(msg)
            print("Email sent successfully")
        except Exception as e:
            print(f"Failed to send email: {e}")

def send_sms(to_numbers, message_body):
    twilio_client = Client(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)
    for number in to_numbers:
        try:
            message = twilio_client.messages.create(
                body=message_body,
                from_=Config.TWILIO_PHONE_NUMBER,
                to=number.strip()
            )
            print(f"Message sent successfully to {number}. SID: {message.sid}")
        except Exception as e:
            print(f"Failed to send message to {number}: {e}")

def convert_decimal128(sample):
    from bson.decimal128 import Decimal128
    
    if isinstance(sample, dict):
        return {
            key: convert_decimal128(value) 
            for key, value in sample.items()
        }
    elif isinstance(sample, list):
        return [convert_decimal128(item) for item in sample]
    elif isinstance(sample, Decimal128):
        return float(sample.to_decimal())
    return sample

def backup_database(collection, bucket):
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file_name = f"backup_{timestamp}.json.gz"
        
        documents = list(collection.find({}, {'_id': False}))
        json_data = json.dumps(documents)
        compressed_data = gzip.compress(json_data.encode('utf-8'))
        
        backup_blob = bucket.blob(f"database_backups/{backup_file_name}")
        backup_blob.upload_from_string(compressed_data, 
                                     content_type='application/gzip')
        
        print(f"Database backup completed: {backup_file_name}")
        return True
    except Exception as e:
        print(f"Database backup failed: {str(e)}")
        return False 

def calculate_statistics(samples, fields):
    """Calculate mean, median, and range for specified fields, excluding outliers and negative values"""
    
    stats = {}
    for field in fields:
        # Convert values to float and filter out negative values
        values = []
        for sample in samples:
            try:
                value = float(sample.get(field, 0))
                if value >= 0:  # Exclude negative values
                    values.append(value)
            except (ValueError, TypeError):
                continue
                
        if values:
            # Calculate quartiles for outlier detection
            values = np.array(values)
            q1 = np.percentile(values, 25)
            q3 = np.percentile(values, 75)
            iqr = q3 - q1
            
            # Define outlier bounds (1.5 * IQR method)
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            # Filter out outliers
            filtered_values = values[(values >= lower_bound) & (values <= upper_bound)]
            
            if len(filtered_values) > 0:
                stats[field] = {
                    'mean': float(np.mean(filtered_values)),
                    'median': float(np.median(filtered_values)),
                    'range': {
                        'min': float(min(filtered_values)),
                        'max': float(max(filtered_values))
                    },
                    'sample_count': int(len(filtered_values)),
                    'original_count': int(len(values)),
                    'outliers_removed': int(len(values) - len(filtered_values))
                }
            else:
                stats[field] = None
        else:
            stats[field] = None
            
    return stats 

def convert_sample(sample):
    """Convert sample data to appropriate types and handle special MongoDB types."""
    from bson.decimal128 import Decimal128
    from datetime import datetime
    
    if isinstance(sample, dict):
        converted = {}
        for key, value in sample.items():
            if isinstance(value, Decimal128):
                converted[key] = float(value.to_decimal())
            elif isinstance(value, datetime):
                converted[key] = value.isoformat()
            elif isinstance(value, dict):
                converted[key] = convert_sample(value)
            elif isinstance(value, list):
                converted[key] = [convert_sample(item) for item in value]
            else:
                converted[key] = value
        return converted
    elif isinstance(sample, list):
        return [convert_sample(item) for item in sample]
    elif isinstance(sample, Decimal128):
        return float(sample.to_decimal())
    elif isinstance(sample, datetime):
        return value.isoformat()
    return sample