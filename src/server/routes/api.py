from flask import Blueprint, request, jsonify, Response
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

api = Blueprint('api', __name__)

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
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
        location = update_data.get('location')

        if not chip_id or not status:
            return jsonify({"error": "Missing chipID or status"}), 400

        if status == "In Process":
            update_data['expected_completion_time'] = datetime.now(pytz.utc) + timedelta(hours=2)

        update_result = collection.update_one(
            {"chip_id": chip_id},
            {"$set": update_data}
        )

        if update_result.modified_count == 1:
            if status in ["In Process", "Ready for Pickup"]:
                subject = f"Sample Status Updated: {status}"
                body = f"Sample with chip ID {chip_id} has been updated to '{status}' at '{location}'. Check dashboard for details."
                send_email(subject, body)
            return jsonify({"success": True, "message": "Sample updated successfully."}), 200
        return jsonify({"success": False, "message": "No sample found with given chipID"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
        samples = collection.find({"status": "Complete"}, {"_id": 0}).sort("timestamp", 1)

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['Date', 'Chip ID', 'Batch', 'Mfg. Date', 'Patient ID', 
                        'Final Volume (mL)', 'Avg. CO2 (%)', 'Error Code', 
                        'Patient Form Uploaded'])
        
        for sample in samples:
            formatted_date = sample['timestamp'].split('T')[0]
            parts = formatted_date.split('-')
            short_year = parts[0].split('0')
            short_date = f"{parts[1]}/{parts[2]}/{short_year[1]}"
            
            formatted_mfg = sample['mfg_date'].strftime('%Y-%m-%d')
            mfg_parts = formatted_mfg.split('-')
            mfg_short_year = mfg_parts[0][-2:]
            mfg_short_date = f"{mfg_parts[1]}/{mfg_parts[2]}/{mfg_short_year}"
            
            writer.writerow([
                short_date,
                sample['chip_id'],
                sample['batch_number'],
                mfg_short_date,
                sample.get('patient_id', 'N/A'),
                f"{sample['final_volume']}",
                f"{sample['average_co2']}",
                sample.get('error', 'N/A'), 
                'Yes' if sample.get('document_urls') else 'No'
            ])
        
        output.seek(0)
        return Response(
            output, 
            mimetype="text/csv", 
            headers={"Content-Disposition": "attachment;filename=completed_samples.csv"}
        )
    except Exception as e:
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
    from ..main import analyzed_collection
    try:
        analyzed_samples = list(analyzed_collection.find({}, {'_id': 0}).sort("timestamp", 1))
        analyzed_samples = [convert_decimal128(sample) for sample in analyzed_samples]
        return jsonify(analyzed_samples), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/ai_analysis', methods=['GET'])
@require_auth
def ai_analysis():
    from ..main import analyzed_collection, openai_client
    try:
        analyzed_samples = list(analyzed_collection.find({}, {'_id': 0}))
        
        def convert_sample(sample):
            for key, value in sample.items():
                if isinstance(value, Decimal128):
                    sample[key] = float(value.to_decimal())
                elif isinstance(value, datetime):
                    sample[key] = value.isoformat()
            return sample
        
        analyzed_samples = [convert_sample(sample) for sample in analyzed_samples]
        data_summary = json.dumps(analyzed_samples[:10])
        
        thread = openai_client.beta.threads.create()

        message = openai_client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=f"Analyze this breath analysis data and provide insights: {data_summary}"
        )

        run = openai_client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=Config.ASSISTANT_ID
        )

        while run.status != "completed":
            time.sleep(1)
            run = openai_client.beta.threads.runs.retrieve(
                thread_id=thread.id, 
                run_id=run.id
            )

        messages = openai_client.beta.threads.messages.list(thread_id=thread.id)
        assistant_response = next(
            msg.content[0].text.value 
            for msg in messages 
            if msg.role == "assistant"
        )
        
        return jsonify({"success": True, "insights": assistant_response}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500