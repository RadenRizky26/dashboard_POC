import os
import json
import time
import threading
from flask import Flask, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, db

app = Flask(__name__)
CORS(app)

# Cache untuk menyimpan data terbaru
cached_data = {
    "status": "initializing",
    "data": {
        "slave": {"suhu": 0.0, "heaterPower": 0.0, "ph": 7.0},
        "master": {"rpm": 0.0, "motorPower": 0.0}
    },
    "timestamp": time.time()
}
cache_lock = threading.Lock()

def initialize_firebase():
    if not firebase_admin._apps:
        firebase_key_env = os.environ.get('FIREBASE_KEY')
        if firebase_key_env:
            service_account_info = json.loads(firebase_key_env)
            cred = credentials.Certificate(service_account_info)
        else:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            key_path = os.path.join(current_dir, 'firebase-key.json')
            cred = credentials.Certificate(key_path)
            
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://bestari-c3618-default-rtdb.asia-southeast1.firebasedatabase.app/'
        })

def fetch_firebase_data():
    """Background thread untuk mengambil data dari Firebase setiap 1 detik"""
    global cached_data
    print("🔄 Background thread started - fetching data every 1 second")
    
    while True:
        try:
            ref = db.reference('data_POC')
            db_data = ref.get()
            
            if db_data:
                slave = db_data.get('slave', {})
                master = db_data.get('master', {})
                
                with cache_lock:
                    cached_data = {
                        "status": "success",
                        "data": {
                            "slave": {
                                "suhu": slave.get('suhu', 0.0),
                                "heaterPower": slave.get('heaterPower', 0.0),
                                "ph": slave.get('ph', 7.0)
                            },
                            "master": {
                                "rpm": master.get('rpm', 0.0),
                                "motorPower": master.get('motorPower', 0.0)
                            }
                        },
                        "timestamp": time.time()
                    }
                print(f"✅ Data updated: Suhu={slave.get('suhu', 0.0)}°C, RPM={master.get('rpm', 0.0)}")
            else:
                with cache_lock:
                    cached_data["status"] = "error"
                print("⚠️ Firebase data is empty")
                
        except Exception as e:
            with cache_lock:
                cached_data["status"] = "error"
            print(f"❌ Error fetching data: {str(e)}")
        
        # Tunggu 1 detik sebelum fetch berikutnya
        time.sleep(1.0)

initialize_firebase()

# Start background thread untuk fetch data setiap 1 detik
data_thread = threading.Thread(target=fetch_firebase_data, daemon=True)
data_thread.start()

@app.route('/api/index', methods=['GET'])
def get_data():
    """Endpoint API yang mengembalikan data dari cache (diupdate setiap 1 detik)"""
    try:
        with cache_lock:
            data_copy = cached_data.copy()
        
        if data_copy["status"] == "success":
            return jsonify(data_copy), 200
        elif data_copy["status"] == "initializing":
            return jsonify({"status": "initializing", "message": "Waiting for first data fetch..."}), 202
        else:
            return jsonify({"status": "error", "message": "Failed to fetch Firebase data"}), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run()