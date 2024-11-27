from flask import Blueprint, request, jsonify, Response, make_response, send_file, send_from_directory
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import pytz
from io import StringIO, BytesIO
import csv
import base64
from firebase_admin import auth
from bson.decimal128 import Decimal128
from src.server.utils.helpers import send_email, send_sms, convert_decimal128, backup_database, calculate_statistics
from src.server.config import Config
import json
import time
from functools import wraps
from functools import lru_cache
import hashlib
from concurrent.futures import TimeoutError
import logging
from datetime import timezone
from ..utils.cache import get_cached_analysis, cache_analysis, generate_data_hash
from ..utils.mongo import get_db_client


logger = logging.getLogger(__name__)

api = Blueprint('api', __name__)

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip auth check for OPTIONS requests
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = auth.verify_id_token(token)
            request.user = decoded_token
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid token'}), 401
            
    return decorated_function

@api.route('/api/auth/signin', methods=['POST'])
def signin():
    id_token = request.json.get('idToken')
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        return jsonify({'message': 'User authenticated', 'uid': uid}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 401

@api.route('/api/auth/googleSignIn', methods=['POST'])
def google_sign_in():
    id_token = request.json['idToken']
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        return jsonify({'message': 'Google sign-in successful', 'uid': uid}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to authenticate with Google', 
                       'details': str(e)}), 401

@api.route('/samples', methods=['GET'])
@require_auth
def get_samples():
    client = get_db_client()
    collection = client[Config.DATABASE_NAME][Config.COLLECTION_NAME]
    
    statuses = ["In Process", "Ready for Pickup", 
                "Picked up. Ready for Analysis", "Complete"]
    
    pipeline = [
        {"$match": {"status": {"$in": statuses}}},
        {"$project": {"_id": 0}},
        {"$sort": {"timestamp": -1}}
    ]
    
    samples = list(collection.aggregate(pipeline))
    return [convert_decimal128(sample) for sample in samples]

@api.route('/update_sample', methods=['POST'])
@require_auth
def update_sample():
    from ..main import collection
    try:
        update_data = request.json
        chip_id = update_data.get('chip_id')
        
        if not chip_id:
            return jsonify({"success": False, "error": "Chip ID is required"}), 400

        # Get the current sample data
        current_sample = collection.find_one({"chip_id": chip_id})
        if not current_sample:
            return jsonify({"success": False, "error": "Sample not found"}), 404

        # Build update fields
        update_fields = {}
        for field in ['status', 'sample_type', 'patient_id', 'timestamp', 'notes']:
            if field in update_data:
                update_fields[field] = update_data[field]

        result = collection.update_one(
            {"chip_id": chip_id},
            {"$set": update_fields}
        )

        if result.modified_count > 0:
            # Send notification for status changes
            if update_data.get('status') and update_data.get('status') != current_sample.get('status'):
                subject = f"Sample Status Updated: {chip_id}"
                body = (f"Sample status has been updated:\n\n"
                       f"Chip ID: {chip_id}\n"
                       f"Previous Status: {current_sample.get('status', 'N/A')}\n"
                       f"New Status: {update_data.get('status')}\n"
                       f"Sample Type: {update_data.get('sample_type', current_sample.get('sample_type', 'N/A'))}\n"
                       f"Patient ID: {update_data.get('patient_id', current_sample.get('patient_id', 'N/A'))}\n"
                       f"Update Time: {update_data.get('timestamp', datetime.now(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S UTC'))}")
                send_email(subject, body)
            return jsonify({"success": True}), 200
        
        return jsonify({
            "success": False,
            "error": "Sample not found"
        }), 404

    except Exception as e:
        error_msg = f"Error updating sample {chip_id}: {str(e)}"
        logger.error(error_msg)
        send_email("Error in Sample Update", error_msg)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api.route('/update_patient_info', methods=['POST'])
@require_auth
def update_patient_info():
    from ..main import collection
    try:
        data = request.json
        chip_id = data.get('chipID')
        patient_info = data.get('patientInfo')
        
        if not chip_id or not patient_info:
            return jsonify({"success": False, "message": "Invalid data."}), 400
        
        collection.update_one(
            {"chip_id": chip_id},
            {"$set": patient_info},
            upsert=True
        )
        return jsonify({"success": True, "message": "Patient information updated successfully."}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@api.route('/generate_presigned_url', methods=['POST'])
@require_auth
def generate_presigned_url():
    from ..main import bucket
    try:
        file_name = request.json.get('file_name')
        if not file_name:
            return jsonify({"success": False, "message": "Missing file name"}), 400

        secure_file_name = secure_filename(file_name)
        blob = bucket.blob(secure_file_name)
        presigned_url = blob.generate_signed_url(expiration=7200, method='GET')

        return jsonify({"success": True, "url": presigned_url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/upload_from_memory', methods=['POST'])
@require_auth
def upload_from_memory():
    from ..main import bucket
    try:
        data = request.get_json()
        destination_blob_name = data['destination_blob_name']
        image_data = data['source_file_name']

        image_data = base64.b64decode(image_data.split(",")[1])
        image_stream = BytesIO(image_data)
        
        blob = bucket.blob(destination_blob_name)
        blob.upload_from_file(image_stream)

        return jsonify({'success': True, 'message': 'File uploaded successfully'}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/download_dataset', methods=['GET'])
@require_auth
def download_dataset():
    from ..main import collection
    try:
        samples = list(collection.find({"status": "Complete"}, {"_id": 0}))
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow(['Date', 'Chip ID', 'Patient ID', 'Sample Type', 
                        'Batch', 'Mfg. Date', 'Final Volume (mL)', 
                        'Avg. CO2 (%)', 'Error Code'])
        
        # Write data
        for sample in samples:
            try:
                # Format timestamp
                timestamp = datetime.fromisoformat(str(sample['timestamp']).replace('Z', '+00:00'))
                formatted_date = timestamp.strftime('%m/%d/%y')
                
                # Format manufacturing date
                mfg_date = sample.get('mfg_date')
                if mfg_date:
                    mfg_date = datetime.fromisoformat(str(mfg_date).replace('Z', '+00:00'))
                    mfg_date = mfg_date.strftime('%m/%d/%y')
                
                writer.writerow([
                    formatted_date,
                    sample.get('chip_id', 'N/A'),
                    sample.get('patient_id', 'N/A'),
                    sample.get('sample_type', 'N/A'),
                    sample.get('batch_number', 'N/A'),
                    mfg_date if mfg_date else 'N/A',
                    f"{sample.get('final_volume', 'N/A')}",
                    f"{sample.get('average_co2', 'N/A')}",
                    sample.get('error', 'N/A')
                ])
            except Exception as e:
                logger.error(f"Error processing sample {sample.get('chip_id')}: {str(e)}")
                continue
        
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=completed_samples_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
                'Access-Control-Allow-Origin': 'https://onebreatpilot.netlify.app',
                'Access-Control-Allow-Credentials': 'true'
            }
        )
    except Exception as e:
        logger.error(f"Error generating CSV: {str(e)}")
        return jsonify({"error": str(e)}), 500

@api.route('/completed_samples', methods=['GET'])
@require_auth
def get_completed_samples():
    from ..main import collection
    try:
        print("Fetching completed samples...")
        all_samples = collection.find({"status": "Complete"}, {"_id": 0})
        completed_samples = [convert_decimal128(sample) for sample in all_samples]
        print(f"Found {len(completed_samples)} completed samples")
        return jsonify(completed_samples), 200
    except Exception as e:
        print(f"Error fetching completed samples: {str(e)}")
        return jsonify({"error": str(e)}), 500

@api.route('/upload_document_metadata', methods=['POST'])
@require_auth
def upload_document_metadata():
    from ..main import collection
    try:
        chip_id = request.json.get('chip_id')
        document_urls = request.json.get('document_urls')
        if not chip_id or not document_urls:
            return jsonify({"success": False, "message": "Missing chipID or document URLs"}), 400
        
        sample = collection.find_one({"chip_id": chip_id})
        if not sample:
            return jsonify({"success": False, "message": "No sample found"}), 404

        update_result = collection.update_one(
            {"chip_id": chip_id},
            {"$set": {"document_urls": document_urls}}
        )

        if update_result.modified_count >= 0:
            return jsonify({"success": True, "message": "Document URLs added successfully"}), 200
        return jsonify({"success": False, "message": "Failed to add document URLs"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/analyzed', methods=['GET'])
@require_auth
def get_analyzed_samples():
    try:
        from ..main import analyzed_collection
        analyzed_samples = list(analyzed_collection.find({}, {'_id': 0}).sort("timestamp", 1))
        analyzed_samples = [convert_decimal128(sample) for sample in analyzed_samples]
        return jsonify(analyzed_samples), 200
    except Exception as e:
        print(f"Error fetching analyzed samples: {str(e)}")
        return jsonify([]), 200

# Cache for storing analysis results
@lru_cache(maxsize=128)
def get_cached_analysis(data_hash):
    return None

def generate_data_hash(data):
    """Generate a hash of the analyzed samples data for cache comparison"""
    return hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()

@api.route('/ai_analysis', methods=['GET', 'OPTIONS'])
@require_auth
def ai_analysis():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        from ..main import analyzed_collection
        
        # Fields to analyze
        voc_fields = [
            '2-Butanone', 'Pentanal', '2-hydroxy-acetaldehyde',
            '2-hydroxy-3-butanone', '4-HHE', '4-HNE', 'Decanal'
        ]
        voc_per_liter_fields = [f"{voc}_per_liter" for voc in voc_fields]
        additional_fields = ['average_co2', 'final_volume']
        
        # Fetch and convert samples
        analyzed_samples = list(analyzed_collection.find({}, {'_id': 0}))
        if not analyzed_samples:
            return jsonify({
                "success": False,
                "error": "No analyzed samples available"
            }), 404
            
        # Convert samples and ensure all numeric fields are floats
        processed_samples = []
        for sample in analyzed_samples:
            converted = convert_sample(sample)
            processed_samples.append(converted)

        data_hash = generate_data_hash(str(processed_samples))  # Convert to string before hashing
        
        # Check cache
        cached_analysis = get_cached_analysis(data_hash)
        if cached_analysis:
            return jsonify({
                "success": True,
                "insights": cached_analysis,
                "cached": True,
                "sampleCount": len(analyzed_samples)
            }), 200

        # Calculate statistics
        all_fields = voc_fields + voc_per_liter_fields + additional_fields
        stats = calculate_statistics(processed_samples, all_fields)
        
        # Generate summary
        summary = "Statistical Analysis Summary:\n\n"
        
        # Add VOC statistics
        summary += "VOC Measurements (nanomoles):\n"
        for voc in voc_fields:
            if stats[voc]:
                summary += f"\n{voc}:\n"
                summary += f"Mean: {stats[voc]['mean']:.2f}\n"
                summary += f"Median: {stats[voc]['median']:.2f}\n"
                summary += f"Range: {stats[voc]['range']['min']:.2f} - {stats[voc]['range']['max']:.2f}\n"
                summary += f"Sample Count: {stats[voc]['sample_count']}\n"
        
        # Add VOC per liter statistics
        summary += "\nVOC Measurements (nanomoles/liter of breath):\n"
        for voc in voc_per_liter_fields:
            if stats[voc]:
                summary += f"\n{voc.replace('_per_liter', '')}:\n"
                summary += f"Mean: {stats[voc]['mean']:.2f}\n"
                summary += f"Median: {stats[voc]['median']:.2f}\n"
                summary += f"Range: {stats[voc]['range']['min']:.2f} - {stats[voc]['range']['max']:.2f}\n"
                summary += f"Sample Count: {stats[voc]['sample_count']}\n"
        
        # Add additional measurements
        summary += "\nAdditional Measurements:\n"
        for field in additional_fields:
            if stats[field]:
                summary += f"\n{field}:\n"
                summary += f"Mean: {stats[field]['mean']:.2f}\n"
                summary += f"Median: {stats[field]['median']:.2f}\n"
                summary += f"Range: {stats[field]['range']['min']:.2f} - {stats[field]['range']['max']:.2f}\n"
                summary += f"Sample Count: {stats[field]['sample_count']}\n"
        
        # Cache and return results
        cache_analysis(data_hash, summary)
        return jsonify({
            "success": True,
            "insights": summary,
            "cached": False,
            "sampleCount": len(analyzed_samples)
        }), 200

    except Exception as e:
        logger.error(f"AI Analysis Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def convert_sample(sample):
    """Convert MongoDB types to JSON-serializable formats"""
    converted = {}
    for key, value in sample.items():
        if isinstance(value, Decimal128):
            converted[key] = float(value.to_decimal())
        elif isinstance(value, datetime):
            converted[key] = value.isoformat()
        else:
            converted[key] = value
    return converted

@api.route('/samples/<chip_id>/pickup', methods=['PUT'])
@require_auth
def update_sample_pickup(chip_id):
    from ..main import collection
    try:
        data = request.json
        required_fields = ['status', 'sample_type', 'average_co2', 'final_volume']
        
        if not all(field in data for field in required_fields):
            return jsonify({
                "success": False,
                "error": f"Missing required fields. Required: {required_fields}"
            }), 400

        update_data = {
            "status": data['status'],
            "sample_type": data['sample_type'],
            "average_co2": data['average_co2'],
            "final_volume": data['final_volume']
        }

        if 'error' in data:
            update_data['error'] = data['error']

        update_result = collection.update_one(
            {"chip_id": chip_id},
            {"$set": update_data}
        )

        if update_result.modified_count == 1:
            if data['status'] == "Picked up. Ready for Analysis":
                subject = f"Sample Picked Up: {chip_id}"
                body = (f"Sample with chip ID {chip_id} has been picked up.\n"
                       f"Sample Type: {data['sample_type']}\n"
                       f"Final Volume: {data['final_volume']} mL\n"
                       f"Average CO2: {data['average_co2']}%")
                send_email(subject, body)
            return jsonify({"success": True}), 200
            
        return jsonify({
            "success": False,
            "error": "Sample not found"
        }), 404

    except Exception as e:
        logger.error(f"Error updating sample pickup data: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api.route('/register_sample', methods=['POST'])
@require_auth
def register_sample():
    from ..main import collection
    try:
        data = request.json
        required_fields = ['chip_id', 'patient_id', 'sample_type', 'status']
        
        if not all(field in data for field in required_fields):
            return jsonify({
                "success": False,
                "error": f"Missing required fields. Required: {', '.join(required_fields)}"
            }), 400

        # Parse timestamp just for expected_completion_time calculation
        try:
            timestamp_dt = datetime.strptime(data['timestamp'], '%Y-%m-%dT%H:%M:%S.%fZ')
            timestamp_dt = timestamp_dt.replace(tzinfo=timezone.utc)
            expected_completion_time = (timestamp_dt + timedelta(hours=2)).isoformat()
        except ValueError as e:
            return jsonify({
                "success": False,
                "error": f"Invalid timestamp format. Use ISO format. Error: {str(e)}"
            }), 400

        # Create new sample document with all required fields
        new_sample = {
            "chip_id": data['chip_id'],
            "patient_id": data['patient_id'],
            "sample_type": data['sample_type'],
            "status": data['status'],
            "timestamp": data['timestamp'],
            "expected_completion_time": expected_completion_time,
            "batch_number": data.get('batch_number'),
            "mfg_date": data.get('mfg_date'),
            "notes": data.get('notes')
        }

        # Remove None values to keep the document clean
        new_sample = {k: v for k, v in new_sample.items() if v is not None}

        result = collection.insert_one(new_sample)
        
        if result.inserted_id:
            # Update email notification to include notes if present
            subject = f"New Sample Registered: {data['chip_id']}"
            body = (f"A new sample has been registered:\n\n"
                   f"Chip ID: {data['chip_id']}\n"
                   f"Patient ID: {data['patient_id']}\n"
                   f"Sample Type: {data['sample_type']}\n"
                   f"Status: {data['status']}\n"
                   f"Registration Time: {timestamp_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
                   f"Expected Completion: {expected_completion_time}")
            
            if data.get('notes'):
                body += f"\n\nNotes: {data['notes']}"
                
            body += "\n\nThe sample will be ready for pickup in 2 hours."
            
            send_email(subject, body)
            return jsonify({"success": True}), 201
            
        return jsonify({
            "success": False,
            "error": "Failed to insert sample"
        }), 500

    except Exception as e:
        error_msg = f"Error registering sample: {str(e)}"
        logger.error(error_msg)
        send_email("Error in Sample Registration", 
                  f"Failed to register sample with error:\n{error_msg}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@api.after_request
def add_headers(response):
    origin = request.headers.get('Origin')
    if origin in ["https://onebreathpilot.netlify.app", "http://localhost:5173"]:
        response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@api.route('/', defaults={'path': ''})
@api.route('/<path:path>')
def catch_all(path):
    return send_from_directory('../public', 'index.html')

@api.route('/update_expired_samples', methods=['POST'])
@require_auth
def update_expired_samples():
    from ..main import collection
    try:
        # Calculate the timestamp for 2 hours ago
        two_hours_ago = datetime.now(pytz.UTC) - timedelta(hours=2)
        
        # Update all expired "In Process" samples
        result = collection.update_many(
            {
                "status": "In Process",
                "timestamp": {"$lt": two_hours_ago}
            },
            {"$set": {"status": "Ready for Pickup"}}
        )
        
        return jsonify({
            "success": True,
            "updated_count": result.modified_count
        }), 200
    except Exception as e:
        logger.error(f"Error updating expired samples: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500