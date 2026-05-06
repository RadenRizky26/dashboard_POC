import os
import json
from flask import Flask, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, db

app = Flask(__name__)
CORS(app)

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

initialize_firebase()

@app.route('/api/index', methods=['GET'])
def get_data():
    try:
        ref = db.reference('data_POC')
        db_data = ref.get()
        if not db_data: 
            return jsonify({"status": "error", "message": "Firebase kosong"}), 404

        slave = db_data.get('slave', {})
        master = db_data.get('master', {})
        
        return jsonify({
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
            }
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run()