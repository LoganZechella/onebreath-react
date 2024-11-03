from flask_mail import Message
from twilio.rest import Client
from datetime import datetime, timedelta
import pytz
import json
import gzip
from src.server.config import Config
from flask import current_app

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