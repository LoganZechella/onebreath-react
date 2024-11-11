from flask import Blueprint, request, jsonify, Response, make_response, send_file, send_from_directory
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import pytz
from io import StringIO, BytesIO
import csv
import base64
from firebase_admin import auth
from bson.decimal128 import Decimal128
from src.server.utils.helpers import send_email, send_sms, convert_decimal128, backup_database
from src.server.config import Config
import json
import time
from functools import wraps
from functools import lru_cache
import hashlib
from concurrent.futures import TimeoutError
import logging


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
    from ..main import collection
    statuses = ["In Process", "Ready for Pickup", 
                "Picked up. Ready for Analysis", "Complete"]
    query_result = collection.find(
        {"status": {"$in": statuses}}, 
        {"_id": 0}
    )
    samples = list(query_result)
    samples = [convert_decimal128(sample) for sample in samples]
    return jsonify(samples), 200 

@api.route('/update_sample', methods=['POST'])
@require_auth
def update_sample():
    from ..main import collection
    try:
        update_data = request.json
        chip_id = update_data.get('chip_id')
        status = update_data.get('status')
        sample_type = update_data.get('sample_type')

        if not chip_id:
            return jsonify({"success": False, "error": "Chip ID is required"}), 400

        update_fields = {"status": status} if status else {}
        if sample_type:
            update_fields["sample_type"] = sample_type

        result = collection.update_one(
            {"chip_id": chip_id},
            {"$set": update_fields}
        )

        if result.matched_count > 0:
            return jsonify({"success": True}), 200
        
        return jsonify({
            "success": False,
            "error": "Sample not found"
        }), 404

    except Exception as e:
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
        from ..main import analyzed_collection, openai_client
        
        # Reduce timeout to 25 seconds to stay within worker timeout
        TIMEOUT_SECONDS = 25
        
        # Fetch and validate samples
        analyzed_samples = list(analyzed_collection.find({}, {'_id': 0}))
        if not analyzed_samples:
            return jsonify({
                "success": False,
                "error": "No analyzed samples available"
            }), 404
        
        # Preprocess the data
        processed_samples = [convert_sample(sample) for sample in analyzed_samples]
        
        # Generate hash of processed data
        data_hash = generate_data_hash(processed_samples)
        
        # Check cache
        cached_result = get_cached_analysis(data_hash)
        if cached_result:
            return jsonify({
                "success": True, 
                "insights": cached_result, 
                "cached": True,
                "sampleCount": len(analyzed_samples)
            }), 200

        # Create message content
        message_content = (
            "Analyze this breath analysis dataset and provide insights on trends, "
            "patterns, and potential areas of interest. Focus on key metrics and "
            f"their relationships: {json.dumps(processed_samples)}"
        )

        # Create a new thread
        thread = openai_client.beta.threads.create()

        # Add a message to the thread
        openai_client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=message_content
        )

        # Run the assistant
        run = openai_client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=Config.ASSISTANT_ID,
            instructions="Analyze the breath analysis data and provide clear, concise insights."
        )

        # Wait for completion with timeout
        start_time = time.time()
        while True:
            if time.time() - start_time > TIMEOUT_SECONDS:
                raise TimeoutError(f"Analysis timed out after {TIMEOUT_SECONDS} seconds")
            
            run_status = openai_client.beta.threads.runs.retrieve(
                thread_id=thread.id,
                run_id=run.id
            )
            
            if run_status.status == "completed":
                break
            elif run_status.status == "failed":
                raise Exception(f"Assistant run failed: {run_status.last_error}")
            
            time.sleep(0.5)  # Reduced sleep time

        # Get the assistant's response
        messages = openai_client.beta.threads.messages.list(
            thread_id=thread.id
        )
        
        # Get the latest assistant message
        assistant_messages = [
            msg for msg in messages 
            if msg.role == "assistant"
        ]
        
        if not assistant_messages:
            raise Exception("No response received from assistant")
            
        response_content = assistant_messages[0].content[0].text.value

        # Cache the result
        get_cached_analysis.cache_set(data_hash, response_content)

        # Return response without manually adding CORS headers
        return jsonify({
            "success": True,
            "insights": response_content,
            "cached": False,
            "sampleCount": len(analyzed_samples)
        }), 200

    except TimeoutError as e:
        logger.error(f"AI Analysis Timeout: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Analysis timed out after {TIMEOUT_SECONDS} seconds"
        }), 504
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

        # Add error field if present
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
        required_fields = ['chip_id', 'patient_id', 'sample_type', 'status', 'timestamp']
        
        if not all(field in data for field in required_fields):
            return jsonify({
                "success": False,
                "error": f"Missing required fields. Required: {', '.join(required_fields)}"
            }), 400

        new_sample = {
            "chip_id": data['chip_id'],
            "patient_id": data['patient_id'],
            "sample_type": data['sample_type'],
            "status": data['status'],
            "timestamp": data['timestamp']
        }

        result = collection.insert_one(new_sample)
        
        if result.inserted_id:
            return jsonify({"success": True}), 201
            
        return jsonify({
            "success": False,
            "error": "Failed to insert sample"
        }), 500

    except Exception as e:
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