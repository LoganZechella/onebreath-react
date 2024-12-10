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
import openai
from ..main import openai_client


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

@api.route('/statistics_summary', methods=['GET', 'OPTIONS'])
@require_auth
def statistics_summary():
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

@api.route('/ai/chat', methods=['POST'])
@require_auth
def ai_chat():
    try:
        data = request.json
        question = data.get('question')
        context = data.get('context')
        
        if not question or not context:
            return jsonify({
                'success': False,
                'error': 'Question and context are required'
            }), 400

        # Define section-specific guidance based on the context title
        section_guidance = {
            "Sample Classification": """Focus on:
- Interpreting lung-RADS scores and their clinical significance
- Explaining the distribution of cancer types and stages
- Discussing the implications of sample types for diagnosis
- Relating findings to clinical diagnostic criteria""",
            
            "VOC Profile Analysis": """Focus on:
- Explaining the significance of specific VOC concentration differences
- Interpreting statistical measures (p-values, effect sizes)
- Discussing the reliability of VOC markers for cancer detection
- Comparing VOC patterns between positive and negative samples""",
            
            "Quality Assessment": """Focus on:
- Evaluating the reliability of breath sample collection
- Interpreting CO2 levels and their impact on results
- Assessing potential sources of error or contamination
- Discussing quality control measures and their importance""",
            
            "Clinical Applications": """Focus on:
- Translating findings into practical clinical recommendations
- Comparing VOC analysis with other screening methods
- Discussing sensitivity and specificity implications
- Evaluating cost-effectiveness and implementation strategies""",
            
            "Confounding Factors": """Focus on:
- Analyzing the impact of smoking history on results
- Evaluating the influence of medical comorbidities
- Discussing strategies to control for confounding variables
- Recommending ways to improve result accuracy"""
        }

        # Get section-specific guidance
        title = context.get('title', '')
        specific_guidance = section_guidance.get(title, "")

        # Construct a detailed prompt with specific guidance
        prompt = f"""You are analyzing a lung cancer detection finding using VOC (Volatile Organic Compounds) analysis. 
Below is the specific context and a question about it. Provide a detailed, evidence-based response.

CONTEXT:
Title: {context.get('title')}
Key Finding: {context.get('keyFinding')}

Statistical Details:
{json.dumps(context.get('stats', []), indent=2)}

Analysis Summary:
{context.get('analysis')}

SPECIFIC GUIDANCE FOR THIS SECTION:
{specific_guidance}

QUESTION FROM USER:
{question}

Please provide a response that:
1. Directly addresses the question using evidence from the context
2. References specific numerical data and statistical findings where relevant
3. Explains the clinical significance for lung cancer detection
4. Uses precise medical terminology while remaining clear and understandable
5. Acknowledges any limitations or uncertainties in the data
6. Provides practical implications for clinical decision-making
7. Relates the answer to current lung cancer screening best practices

If discussing VOC concentrations:
- Explain the significance of specific concentration differences
- Relate concentrations to established reference ranges
- Discuss the reliability of these markers for cancer detection

If discussing patient data:
- Reference specific lung-RADS scores and their implications
- Consider the distribution of cancer types and stages
- Discuss how the findings relate to patient outcomes

If discussing quality metrics:
- Evaluate the reliability of the measurements
- Consider the impact of any quality issues on interpretation
- Suggest ways to improve data quality if relevant

FORMAT YOUR RESPONSE WITH:
- Clear topic sentences for each main point
- Specific data citations from the context
- Clinical implications clearly stated
- Any necessary caveats or limitations
"""

        # Get response from OpenAI with enhanced parameters
        response = openai_client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert in lung cancer detection and VOC analysis, with deep knowledge of:
- Lung cancer screening and diagnosis
- VOC biomarker interpretation
- Clinical research methodology
- Medical statistics
- Quality control in clinical testing

Provide responses that are:
1. Evidence-based and specific to the context
2. Clinically relevant and actionable
3. Clear but technically precise
4. Properly qualified with appropriate caveats"""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4,  # Lower temperature for more focused responses
            max_tokens=750,   # Increased token limit for more detailed responses
            presence_penalty=0.1,  # Slight penalty to prevent repetition
            frequency_penalty=0.1   # Slight penalty to encourage diverse language
        )

        # Extract and return the response
        message = response.choices[0].message.content
        return jsonify({
            'success': True,
            'message': message
        })

    except Exception as e:
        logger.error(f"Error in AI chat endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api.route('/ai/stat_details', methods=['POST'])
@require_auth
def get_stat_details():
    try:
        from ..main import analyzed_collection
        from ..utils.helpers import calculate_statistics, convert_sample
        
        data = request.json
        section = data.get('section')
        stat = data.get('stat')
        
        if not section or not stat:
            return jsonify({
                'success': False,
                'error': 'Section and stat are required'
            }), 400

        # Get raw data for calculations
        analyzed_samples = list(analyzed_collection.find({}, {'_id': 0}))
        processed_samples = [convert_sample(sample) for sample in analyzed_samples]

        # Process samples based on section type
        if section == "Sample Classification":
            # Get positive and negative samples
            positive_samples = [s for s in processed_samples 
                             if s.get('sample_type') == 'LC Positive' 
                             or (s.get('lung_RADS', 0) >= 3)]
            negative_samples = [s for s in processed_samples 
                              if s.get('sample_type') == 'LC Negative' 
                              or (s.get('lung_RADS', 0) < 3)]

            if "Lung cancer positive" in stat:
                details = {
                    "description": "Detailed analysis of lung cancer positive samples",
                    "breakdown": [
                        {"label": "Total Positive Samples", "value": len(positive_samples)},
                        {"label": "By lung-RADS ≥ 3", "value": len([s for s in positive_samples if s.get('lung_RADS', 0) >= 3])},
                        {"label": "By LC Positive Label", "value": len([s for s in positive_samples if s.get('sample_type') == 'LC Positive'])},
                        {"label": "With Histology Data", "value": len([s for s in positive_samples if s.get('cancer_histology')])},
                        {"label": "With Staging Data", "value": len([s for s in positive_samples if s.get('cancer_stage')])},
                    ],
                    "trends": [
                        {"label": "Positive Rate", "value": f"{(len(positive_samples) / len(processed_samples)) * 100:.1f}%"},
                        {"label": "Average lung-RADS", "value": f"{sum(s.get('lung_RADS', 0) for s in positive_samples) / len(positive_samples):.1f}"},
                        {"label": "Detection Method Split", "value": "lung-RADS/Direct Label"},
                        {"label": "Data Completeness", "value": f"{len([s for s in positive_samples if all(k in s for k in ['sample_type', 'lung_RADS'])])}/{len(positive_samples)}"}
                    ],
                    "implications": [
                        "Sample distribution indicates representative dataset for lung cancer detection",
                        "Multiple detection criteria provide comprehensive classification",
                        "Histology and staging data available for subset of positive cases",
                        "Consider both lung-RADS and direct labeling in analysis"
                    ],
                    "relatedMetrics": [
                        {"label": "Histology Distribution", 
                         "value": ", ".join(f"{h}: {len([s for s in positive_samples if s.get('cancer_histology') == h])}" 
                                          for h in set(s.get('cancer_histology') for s in positive_samples if s.get('cancer_histology')))},
                        {"label": "Stage Distribution", 
                         "value": ", ".join(f"{st}: {len([s for s in positive_samples if s.get('cancer_stage') == st])}" 
                                          for st in set(s.get('cancer_stage') for s in positive_samples if s.get('cancer_stage')))},
                        {"label": "lung-RADS Distribution", 
                         "value": f"3: {len([s for s in positive_samples if s.get('lung_RADS') == 3])}, " +
                                 f"4: {len([s for s in positive_samples if s.get('lung_RADS') == 4])}"}
                    ],
                    "visualizationType": "pie"
                }
            elif "Total samples analyzed" in stat:
                total = len(processed_samples)
                positive = len([s for s in processed_samples 
                              if s.get('sample_type') == 'LC Positive' 
                              or (s.get('lung_RADS', 0) >= 3)])
                negative = total - positive

                details = {
                    "description": "Comprehensive breakdown of sample distribution and classification metrics",
                    "breakdown": [
                        {"label": "Total Samples", "value": total},
                        {"label": "Positive Samples", "value": positive},
                        {"label": "Negative Samples", "value": negative},
                        {"label": "Positive Rate", "value": f"{(positive/total)*100:.1f}%"}
                    ],
                    "trends": [
                        {"label": "Sample Collection Period", 
                         "value": f"{min(s.get('timestamp', 'N/A') for s in processed_samples)} to {max(s.get('timestamp', 'N/A') for s in processed_samples)}"},
                        {"label": "Classification Method", 
                         "value": "lung-RADS ≥ 3 or LC Positive"},
                        {"label": "Data Completeness", 
                         "value": f"{len([s for s in processed_samples if all(k in s for k in ['sample_type', 'lung_RADS'])])}/{total}"}
                    ],
                    "implications": [
                        f"Sample size of {total} provides {'adequate' if total >= 20 else 'limited'} statistical power",
                        f"Positive:Negative ratio of {positive}:{negative} indicates {'balanced' if 0.4 <= positive/negative <= 2.5 else 'imbalanced'} dataset",
                        "Classification uses both direct labeling and lung-RADS scores",
                        "Consider sample size when interpreting statistical significance"
                    ],
                    "relatedMetrics": [
                        {"label": "lung-RADS Distribution", 
                         "value": f"1: {len([s for s in processed_samples if s.get('lung_RADS') == 1])}, " +
                                 f"2: {len([s for s in processed_samples if s.get('lung_RADS') == 2])}, " +
                                 f"3: {len([s for s in processed_samples if s.get('lung_RADS') == 3])}, " +
                                 f"4: {len([s for s in processed_samples if s.get('lung_RADS') == 4])}"},
                        {"label": "Direct Labels", 
                         "value": f"Pos: {len([s for s in processed_samples if s.get('sample_type') == 'LC Positive'])}, " +
                                 f"Neg: {len([s for s in processed_samples if s.get('sample_type') == 'LC Negative'])}"}
                    ],
                    "visualizationType": "pie"
                }
            else:
                details = {
                    "description": f"Analysis of {stat}",
                    "breakdown": [
                        {"label": "Sample Size", "value": len(processed_samples)},
                        {"label": "Data Completeness", 
                         "value": f"{len([s for s in processed_samples if stat.lower() in {k.lower() for k in s.keys()}])}"}
                    ],
                    "implications": [
                        "Consider this metric in context of overall analysis",
                        "Refer to related sections for comprehensive understanding"
                    ]
                }

        elif section == "VOC Profile Analysis":
            # Get positive and negative samples
            positive_samples = [s for s in processed_samples 
                             if s.get('sample_type') == 'LC Positive' 
                             or (s.get('lung_RADS', 0) >= 3)]
            negative_samples = [s for s in processed_samples 
                              if s.get('sample_type') == 'LC Negative' 
                              or (s.get('lung_RADS', 0) < 3)]

            # Extract VOC name from stat label
            voc_name = stat.split(" ")[0]  # Assumes format "VOC_NAME average concentration" or similar
            
            # Calculate detailed statistics
            pos_values = [float(s.get(voc_name, 0)) for s in positive_samples if voc_name in s]
            neg_values = [float(s.get(voc_name, 0)) for s in negative_samples if voc_name in s]
            
            from scipy import stats
            import numpy as np

            # Statistical calculations
            t_stat, p_value = stats.ttest_ind(pos_values, neg_values)
            effect_size = (np.mean(pos_values) - np.mean(neg_values)) / np.std(pos_values + neg_values)
            
            details = {
                "description": f"Detailed analysis of {voc_name} concentrations between lung cancer positive and negative samples",
                "breakdown": [
                    {"label": "Positive Sample Mean", "value": f"{np.mean(pos_values):.3f}"},
                    {"label": "Negative Sample Mean", "value": f"{np.mean(neg_values):.3f}"},
                    {"label": "Positive Sample Std", "value": f"{np.std(pos_values):.3f}"},
                    {"label": "Negative Sample Std", "value": f"{np.std(neg_values):.3f}"},
                    {"label": "Sample Size (Pos/Neg)", "value": f"{len(pos_values)}/{len(neg_values)}"}
                ],
                "trends": [
                    {"label": "T-statistic", "value": f"{t_stat:.3f}"},
                    {"label": "P-value", "value": f"{p_value:.3f}"},
                    {"label": "Effect Size (Cohen's d)", "value": f"{effect_size:.3f}"},
                    {"label": "Concentration Difference", "value": f"{np.mean(pos_values) - np.mean(neg_values):.3f}"}
                ],
                "implications": [
                    f"The {abs(effect_size):.1f} standard deviation difference indicates " + 
                    ("a strong" if abs(effect_size) > 0.8 else 
                     "a moderate" if abs(effect_size) > 0.5 else "a small") + 
                    " effect size",
                    f"Statistical significance: " +
                    ("Strong evidence" if p_value < 0.01 else
                     "Moderate evidence" if p_value < 0.05 else
                     "Weak evidence") + " of difference between groups",
                    f"Direction: {'Higher' if np.mean(pos_values) > np.mean(neg_values) else 'Lower'} concentration in positive samples",
                    "Consider these results alongside other VOC markers for comprehensive analysis"
                ],
                "relatedMetrics": [
                    {"label": "Positive Sample Range", 
                     "value": f"{np.min(pos_values):.3f} - {np.max(pos_values):.3f}"},
                    {"label": "Negative Sample Range", 
                     "value": f"{np.min(neg_values):.3f} - {np.max(neg_values):.3f}"},
                    {"label": "Confidence Interval (95%)", 
                     "value": f"{np.mean(pos_values) - 1.96 * np.std(pos_values):.3f} - {np.mean(pos_values) + 1.96 * np.std(pos_values):.3f}"}
                ],
                "visualizationType": "bar"  # Frontend can use this to render appropriate visualization
            }

        elif section == "Quality Assessment":
            if "CO2" in stat:
                co2_values = [float(s.get('average_co2', 0)) for s in processed_samples if 'average_co2' in s]
                optimal_range = (2.0, 5.0)
                
                details = {
                    "description": "Analysis of CO2 levels as a quality control metric for breath samples",
                    "breakdown": [
                        {"label": "Mean CO2", "value": f"{np.mean(co2_values):.2f}%"},
                        {"label": "Median CO2", "value": f"{np.median(co2_values):.2f}%"},
                        {"label": "Std Deviation", "value": f"{np.std(co2_values):.2f}%"},
                        {"label": "Within Range", 
                         "value": f"{len([v for v in co2_values if optimal_range[0] <= v <= optimal_range[1]])} samples"}
                    ],
                    "trends": [
                        {"label": "Range", "value": f"{min(co2_values):.2f}% - {max(co2_values):.2f}%"},
                        {"label": "Optimal Range", "value": f"{optimal_range[0]}% - {optimal_range[1]}%"},
                        {"label": "Quality Rate", 
                         "value": f"{len([v for v in co2_values if optimal_range[0] <= v <= optimal_range[1]]) / len(co2_values) * 100:.1f}%"}
                    ],
                    "implications": [
                        f"{'High' if np.mean(co2_values) > np.median(co2_values) else 'Low'} skewness in CO2 distribution",
                        f"Quality rate indicates {'excellent' if len([v for v in co2_values if optimal_range[0] <= v <= optimal_range[1]]) / len(co2_values) > 0.9 else 'good' if len([v for v in co2_values if optimal_range[0] <= v <= optimal_range[1]]) / len(co2_values) > 0.8 else 'concerning'} sample collection",
                        "CO2 levels serve as key quality control metric",
                        "Consider impact on VOC concentration reliability"
                    ],
                    "relatedMetrics": [
                        {"label": "Below Range", 
                         "value": f"{len([v for v in co2_values if v < optimal_range[0]])} samples"},
                        {"label": "Above Range", 
                         "value": f"{len([v for v in co2_values if v > optimal_range[1]])} samples"},
                        {"label": "Interquartile Range", 
                         "value": f"{np.percentile(co2_values, 25):.2f}% - {np.percentile(co2_values, 75):.2f}%"}
                    ],
                    "visualizationType": "line"
                }

        else:
            # Generic statistical analysis for other sections
            details = {
                "description": f"Statistical analysis of {stat}",
                "breakdown": [
                    {"label": "Sample Size", "value": len(processed_samples)},
                    {"label": "Data Completeness", 
                     "value": f"{len([s for s in processed_samples if stat.lower() in {k.lower() for k in s.keys()}])}"}
                ],
                "implications": [
                    "Consider this metric in context of overall analysis",
                    "Refer to related sections for comprehensive understanding"
                ]
            }

        return jsonify({
            'success': True,
            'details': details
        })

    except Exception as e:
        logger.error(f"Error in stat details endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api.route('/ai_analysis', methods=['GET'])
@require_auth
def ai_analysis():
    try:
        from ..main import analyzed_collection, openai_client
        from ..utils.helpers import calculate_statistics
        
        # Fetch and preprocess data
        analyzed_samples = list(analyzed_collection.find({}, {'_id': 0}))
        if not analyzed_samples:
            return jsonify({
                "success": False,
                "error": "No analyzed samples available"
            }), 404

        logger.info(f"Total samples from database: {len(analyzed_samples)}")

        # Convert samples and clean data
        processed_samples = []
        for sample in analyzed_samples:
            # First convert the entire sample to handle Decimal128 and datetime
            processed_sample = convert_sample(sample)
            
            # Then process numeric values and filter negatives
            final_sample = {}
            for key, value in processed_sample.items():
                try:
                    if isinstance(value, (int, float)):
                        # Keep negative values for now, we'll handle them in the analysis
                        final_sample[key] = value
                    else:
                        final_sample[key] = value
                except (ValueError, TypeError):
                    final_sample[key] = value
                    
            if final_sample:
                processed_samples.append(final_sample)

        logger.info(f"Processed samples after conversion: {len(processed_samples)}")

        # Filter out outliers for VOC measurements
        voc_fields = [
            '2-Butanone', 'Pentanal', 'Decanal', 
            '2-hydroxy-acetaldehyde', '2-hydroxy-3-butanone',
            '4-HHE', '4-HNE'
        ]
        voc_per_liter_fields = [f"{voc}_per_liter" for voc in voc_fields]
        all_fields = voc_fields + voc_per_liter_fields + ['average_co2', 'final_volume']
        
        # Calculate statistics with outlier removal
        stats = calculate_statistics(processed_samples, all_fields)
        
        # Filter samples based on outlier bounds, but only for extreme outliers
        filtered_samples = []
        for sample in processed_samples:
            include_sample = True
            extreme_outlier_count = 0
            total_fields_checked = 0
            
            for field in all_fields:
                if field in sample and stats[field]:
                    try:
                        value = float(sample[field])
                        min_val = stats[field]['range']['min']
                        max_val = stats[field]['range']['max']
                        total_fields_checked += 1
                        
                        # Only exclude if it's an extreme outlier (more than 3 IQR from median)
                        q1 = stats[field].get('q1', min_val)
                        q3 = stats[field].get('q3', max_val)
                        iqr = q3 - q1
                        lower_bound = q1 - 3 * iqr
                        upper_bound = q3 + 3 * iqr
                        
                        if value < lower_bound or value > upper_bound:
                            extreme_outlier_count += 1
                    except (ValueError, TypeError):
                        continue
            
            # Only exclude if more than 50% of fields are extreme outliers
            if total_fields_checked > 0 and extreme_outlier_count / total_fields_checked <= 0.5:
                filtered_samples.append(sample)

        logger.info(f"Final filtered samples: {len(filtered_samples)}")

        # Use filtered samples for analysis
        data_hash = generate_data_hash(json.dumps(filtered_samples, sort_keys=True))
        
        # Check cache
        cached_result = get_cached_analysis(data_hash)
        if cached_result:
            return jsonify({
                "success": True,
                "insights": cached_result,
                "cached": True
            })

        # Create prompt for OpenAI
        system_prompt = """You are an expert data scientist specializing in lung cancer detection through VOC (Volatile Organic Compounds) analysis of breath samples. Your expertise includes advanced statistical analysis, pattern recognition, and medical diagnostics.

Important Context - Lung Cancer Classification:
This study focuses exclusively on lung cancer detection using breath VOC analysis. Sample classification criteria:

LUNG CANCER POSITIVE samples meet either:
1. sample_type = "LC Positive" OR
2. lung_RADS score ≥ 3 (indicating suspicious pulmonary nodules)

LUNG CANCER NEGATIVE samples meet either:
1. sample_type = "LC Negative" OR
2. lung_RADS score < 3 (indicating benign findings)

Additional Context:
- Fields 'cancer_histology' and 'cancer_stage' indicate lung cancer characteristics
- 'lung_RADS' score follows standard grading for pulmonary nodules
- Study goal: Early detection of lung cancer through breath VOC analysis

Format your response in sections using exactly this structure:

### [Section Title]

**Key Finding:** [One sentence summary focusing on lung cancer detection implications]

**Statistical Details:**
- [Stat Label]: [Stat Value]
- [Stat Label]: [Stat Value]
...

**Analysis:** [Detailed analysis paragraph]

Required Sections:

### Sample Classification
- Total samples analyzed
- Breakdown by lung cancer status (positive/negative)
- lung-RADS distribution
- Cancer histology and staging summary

### VOC Profile Analysis
- Compare positive vs negative cases
- Raw and per-liter concentrations
- Statistical significance of differences
- Effect sizes with confidence intervals

### Quality Assessment
- CO2 level distribution (2-5% range)
- Sample collection quality
- Data reliability indicators
- Error rate analysis

### Clinical Applications
- Early detection potential
- Screening application feasibility
- Integration with current diagnostic workflow
- Cost-effectiveness analysis

### Confounding Factors
- Smoking history impact
- Recent exposure effects
- Collection timing influence
- Other medical conditions

For each section:
1. Focus on lung cancer detection implications
2. Provide detailed statistical evidence
3. Include clinical relevance
4. Address limitations
5. Suggest improvements

Remember:
- Always format sections with '###'
- Always prefix key findings with '**Key Finding:**'
- Always prefix statistical details with '**Statistical Details:**'
- Always prefix analysis with '**Analysis:**'
- Use bullet points for statistical details
- Provide comprehensive analysis paragraphs"""

        user_prompt = f"""Analyze this dataset of {len(filtered_samples)} breath samples for lung cancer detection.

Please structure your response exactly as follows:

1. Start each major section with '###'
2. Include for each section:
   - Key Finding (prefixed with '**Key Finding:**')
   - Statistical Details (prefixed with '**Statistical Details:**')
   - Analysis (prefixed with '**Analysis:**')

3. Analyze these specific aspects:
   * Sample Classification:
     - Lung cancer positive (LC Positive or lung-RADS ≥ 3)
     - Lung cancer negative (LC Negative or lung-RADS < 3)
     - Distribution of lung-RADS scores
     - Cancer histology and staging when available

   * VOC Analysis for each compound ({', '.join(voc_fields)}):
     - Concentrations in positive vs negative cases
     - Raw and per-liter values
     - Statistical significance
     - Pattern differences between groups

   * Quality Assessment:
     - CO2 levels (2-5% range)
     - Sample collection conditions
     - Data reliability metrics

4. Clinical Applications:
   * Early detection potential
   * Screening feasibility
   * Integration with current diagnostics
   * Cost-benefit analysis

5. Confounding Factors:
   * Smoking history analysis
   * Recent exposures
   * Collection timing
   * Medical comorbidities

Remember to:
- Use exact section formatting ('###')
- Include all three components (Key Finding, Statistical Details, Analysis)
- Provide confidence intervals for key metrics
- Focus exclusively on lung cancer detection
- Begin with complete sample classification
- Consider lung-RADS scores in analysis
- Analyze cancer histology and staging when available"""

        try:
            # Initialize OpenAI client
            if not openai_client:
                raise Exception("OpenAI client not initialized")

            # Make API call with retry logic
            max_retries = 3
            retry_count = 0
            last_error = None
            
            while retry_count < max_retries:
                try:
                    response = openai_client.chat.completions.create(
                        model="gpt-4o-2024-11-20",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                            {"role": "user", "content": f"Data: {json.dumps(filtered_samples)}"}
                        ],
                        temperature=0.2,
                        max_tokens=4000
                    )
                    
                    analysis_text = response.choices[0].message.content
                    
                    # Cache the result
                    cache_analysis(data_hash, analysis_text)
                    
                    return jsonify({
                        "success": True,
                        "insights": analysis_text,
                        "cached": False
                    })
                    
                except Exception as e:
                    last_error = str(e)
                    logger.error(f"OpenAI API Error (attempt {retry_count + 1}): {str(e)}")
                    retry_count += 1
                    if retry_count == max_retries:
                        raise Exception(f"OpenAI API failed after {max_retries} attempts. Last error: {last_error}")
                    time.sleep(2 ** retry_count)  # Exponential backoff
                    
        except Exception as e:
            logger.error(f"OpenAI API Error: {str(e)}")
            return jsonify({
                "success": False,
                "error": str(e),
                "retry_count": retry_count
            }), 500

    except Exception as e:
        logger.error(f"AI Analysis Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500