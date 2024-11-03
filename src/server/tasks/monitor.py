import threading
import time
from datetime import datetime
import pytz
from src.server.utils.helpers import send_email

def check_and_update_samples(collection):
    while True:
        current_time = datetime.now(pytz.utc)
        samples_to_update = collection.find({
            "status": "In Process",
            "expected_completion_time": {"$lte": current_time}
        })

        for sample in samples_to_update:
            update_sample_status(collection, sample['chip_id'], "Ready for Pickup")

        time.sleep(60)

def update_sample_status(collection, chip_id, new_status):
    collection.update_one(
        {"chip_id": chip_id},
        {"$set": {"status": new_status}}
    )

def start_monitoring(collection):
    monitor_thread = threading.Thread(
        target=check_and_update_samples,
        args=(collection,),
        daemon=True
    )
    monitor_thread.start() 