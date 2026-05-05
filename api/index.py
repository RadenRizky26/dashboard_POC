from flask import Flask, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, db
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
import os

app = Flask(__name__)
CORS(app)

# Inisialisasi Firebase
current_dir = os.path.dirname(os.path.abspath(__file__))
key_path = os.path.join(current_dir, 'firebase-key.json')
if not firebase_admin._apps:
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://bestari-c3618-default-rtdb.asia-southeast1.firebasedatabase.app/'
    })

def build_fuzzy_system():
    e_range = np.linspace(-10, 10, 1000); ce_range = np.linspace(-5, 5, 1000); u_range = np.linspace(0, 100, 1000)
    E = ctrl.Antecedent(e_range, 'E'); CE = ctrl.Antecedent(ce_range, 'CE'); U = ctrl.Consequent(u_range, 'U', defuzzify_method='centroid')

    E['NB'] = fuzz.trapmf(e_range, [-10, -10, -6, -3]); E['NS'] = fuzz.trapmf(e_range, [-6, -3, -3, 0]); E['Z'] = fuzz.trapmf(e_range, [-3, 0, 0, 3]); E['PS'] = fuzz.trapmf(e_range, [0, 3, 3, 6]); E['PB'] = fuzz.trapmf(e_range, [3, 6, 10, 10])
    CE['NB'] = fuzz.trapmf(ce_range, [-5.0, -5.0, -3.0, -1.5]); CE['NS'] = fuzz.trapmf(ce_range, [-3.0, -1.5, -1.5, 0.0]); CE['Z'] = fuzz.trapmf(ce_range, [-1.5, 0.0, 0.0, 1.5]); CE['PS'] = fuzz.trapmf(ce_range, [0.0, 1.5, 1.5, 3.0]); CE['PB'] = fuzz.trapmf(ce_range, [1.5, 3.0, 5.0, 5.0])
    U['NB'] = fuzz.trapmf(u_range, [0, 0, 5, 20]); U['NS'] = fuzz.trapmf(u_range, [10, 25, 25, 40]); U['Z'] = fuzz.trapmf(u_range, [35, 50, 50, 65]); U['PS'] = fuzz.trapmf(u_range, [60, 75, 75, 90]); U['PB'] = fuzz.trapmf(u_range, [80, 95, 100, 100])

    rules = [
        ctrl.Rule(E['NB'] & CE['NB'], U['NB']), ctrl.Rule(E['NB'] & CE['NS'], U['NB']), ctrl.Rule(E['NB'] & CE['Z'],  U['NS']), ctrl.Rule(E['NB'] & CE['PS'], U['NS']), ctrl.Rule(E['NB'] & CE['PB'], U['Z']),
        ctrl.Rule(E['NS'] & CE['NB'], U['NB']), ctrl.Rule(E['NS'] & CE['NS'], U['NS']), ctrl.Rule(E['NS'] & CE['Z'],  U['NS']), ctrl.Rule(E['NS'] & CE['PS'], U['Z']),  ctrl.Rule(E['NS'] & CE['PB'], U['PS']),
        ctrl.Rule(E['Z']  & CE['NB'], U['NS']), ctrl.Rule(E['Z']  & CE['NS'], U['NS']), ctrl.Rule(E['Z']  & CE['Z'],  U['Z']),  ctrl.Rule(E['Z']  & CE['PS'], U['PS']), ctrl.Rule(E['Z']  & CE['PB'], U['PS']),
        ctrl.Rule(E['PS'] & CE['NB'], U['NS']), ctrl.Rule(E['PS'] & CE['NS'], U['Z']),  ctrl.Rule(E['PS'] & CE['Z'],  U['PS']), ctrl.Rule(E['PS'] & CE['PS'], U['PS']), ctrl.Rule(E['PS'] & CE['PB'], U['PB']),
        ctrl.Rule(E['PB'] & CE['NB'], U['Z']),  ctrl.Rule(E['PB'] & CE['NS'], U['PS']), ctrl.Rule(E['PB'] & CE['Z'],  U['PS']), ctrl.Rule(E['PB'] & CE['PS'], U['PB']), ctrl.Rule(E['PB'] & CE['PB'], U['PB']),
    ]
    return ctrl.ControlSystemSimulation(ctrl.ControlSystem(rules))

fuzzy_sim = build_fuzzy_system()

@app.route('/api/index', methods=['GET'])
def get_data_poc():
    try:
        ref = db.reference('data_POC')
        data_db = ref.get()
        if not data_db: return jsonify({"status": "error", "message": "Belum ada data"}), 404

        # Ambil data (asumsi ESP32 sudah mengirim E dan CE ke Firebase)
        suhu = data_db.get('slave', {}).get('suhu', 0.0)
        e_val = data_db.get('fuzzy', {}).get('E', 0.0)
        ce_val = data_db.get('fuzzy', {}).get('CE', 0.0)
        pwr_mikro = data_db.get('master', {}).get('motorPower', 0.0)

        # Hitung Fuzzy Python
        e_val = float(np.clip(e_val, -10, 10))
        ce_val = float(np.clip(ce_val, -5, 5))
        fuzzy_sim.input['E'] = e_val
        fuzzy_sim.input['CE'] = ce_val
        fuzzy_sim.compute()
        pwr_python = float(fuzzy_sim.output['U'])

        diff = abs(pwr_mikro - pwr_python)

        return jsonify({
            "status": "success",
            "data": {
                "suhu_aktual": suhu,
                "fuzzy_params": {"E": e_val, "CE": ce_val},
                "perbandingan_power": {
                    "power_mikrokontroler": pwr_mikro,
                    "power_python": pwr_python,
                    "selisih_error_persen": round(diff, 2)
                }
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run()