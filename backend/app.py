import os
import sys
import pickle
import random
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.config import Config
from backend.database import get_db, init_db
from backend.notifications import send_notification

# Initialize Flask app
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)
app.config.from_object(Config)

# Initialize database on startup
init_db()

# Load Machine Learning Model & Encoders
model = None
encoders = None

try:
    if os.path.exists(Config.ML_MODEL_PATH) and os.path.exists(Config.ML_ENCODERS_PATH):
        with open(Config.ML_MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        with open(Config.ML_ENCODERS_PATH, "rb") as f:
            encoders = pickle.load(f)
        print("Scikit-Learn Random Forest model and encoders loaded successfully.")
    else:
        print("Warning: ML model artifacts not found at specified path. Please run ml/train_model.py")
except Exception as e:
    print(f"Error loading ML model: {e}")

# ==========================================================
# Frontend Serving Routes
# ==========================================================
@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:path>")
def serve_static_files(path):
    file_path = os.path.join(FRONTEND_DIR, path)
    if os.path.exists(file_path):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")

# ==========================================================
# Authentication Endpoints (/login, /register)
# ==========================================================
@app.route("/register", methods=["POST"])
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")
    role = data.get("role", "farmer").strip().lower()
    location = data.get("location", "").strip()
    language = data.get("language", "en").strip()

    if not name or not email or not password:
        return jsonify({"success": False, "message": "Name, email, and password are required."}), 400

    if role not in ["farmer", "admin"]:
        role = "farmer"

    conn = get_db()
    cursor = conn.cursor()

    # Check if user already exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "Email is already registered. Please login."}), 409

    pwd_hash = generate_password_hash(password)
    try:
        cursor.execute("""
            INSERT INTO users (name, email, phone, password_hash, role, location, preferred_language)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (name, email, phone, pwd_hash, role, location, language))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()

        user_info = {
            "id": user_id,
            "name": name,
            "email": email,
            "phone": phone,
            "role": role,
            "location": location,
            "language": language
        }
        return jsonify({
            "success": True,
            "message": "Registration successful!",
            "user": user_info
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

@app.route("/login", methods=["POST"])
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    user_info = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "role": user["role"],
        "location": user["location"],
        "language": user["preferred_language"] or "en"
    }

    return jsonify({
        "success": True,
        "message": "Login successful!",
        "user": user_info
    }), 200

# ==========================================================
# Machine Learning Prediction Endpoint (/predict)
# ==========================================================
@app.route("/predict", methods=["POST"])
@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json() or {}
    user_id = data.get("user_id")

    try:
        crop_type = str(data.get("crop_type", "")).strip()
        nitrogen = float(data.get("nitrogen", 0))
        phosphorus = float(data.get("phosphorus", 0))
        potassium = float(data.get("potassium", 0))
        soil_ph = float(data.get("soil_ph", 7.0))
        temperature = float(data.get("temperature", 26.0)) if data.get("temperature") else 26.0
        humidity = float(data.get("humidity", 65.0)) if data.get("humidity") else 65.0
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Please enter valid numeric soil parameters."}), 400

    if not crop_type:
        return jsonify({"success": False, "message": "Crop type is required."}), 400

    if model is None or encoders is None:
        return jsonify({"success": False, "message": "ML Model is not initialized. Please train model."}), 503

    le_crop = encoders["crop_encoder"]
    le_fertilizer = encoders["fertilizer_encoder"]
    crops_metadata = encoders.get("crops_metadata", [])

    # Check if crop exists in training classes
    if crop_type not in le_crop.classes_:
        # Fallback crop mapping
        crop_encoded = 0
    else:
        crop_encoded = le_crop.transform([crop_type])[0]

    import pandas as pd
    # Predict Fertilizer using trained Random Forest
    features = pd.DataFrame([[nitrogen, phosphorus, potassium, soil_ph, temperature, humidity, crop_encoded]], columns=encoders["feature_cols"])
    pred_class_index = model.predict(features)[0]
    recommended_fertilizer = le_fertilizer.inverse_transform([pred_class_index])[0]

    # Get class probabilities
    probabilities = model.predict_proba(features)[0]
    confidence = round(float(np_max := max(probabilities)) * 100, 1)

    # Determine Crop Suitability and Nutrient Analysis
    # Match crop profile
    matched_crop = next((c for c in crops_metadata if c["name"].lower() == crop_type.lower()), None)
    
    n_opt = matched_crop["N_opt"] if matched_crop else 100
    p_opt = matched_crop["P_opt"] if matched_crop else 50
    k_opt = matched_crop["K_opt"] if matched_crop else 50
    ph_range = matched_crop["pH_opt"] if matched_crop else (6.0, 7.5)

    n_diff = n_opt - nitrogen
    p_diff = p_opt - phosphorus
    k_diff = k_opt - potassium
    total_deficit = max(0, n_diff) + max(0, p_diff) + max(0, k_diff)

    # Dosage recommendation (Low / Medium / High)
    if total_deficit > 70:
        dosage_level = "High"
        dosage_kg_acre = round(75.0 + (total_deficit * 0.2), 1)
        dosage_desc = "Significant soil nutrient deficit detected. Split application into basal and top dressing."
    elif total_deficit > 30:
        dosage_level = "Medium"
        dosage_kg_acre = round(45.0 + (total_deficit * 0.2), 1)
        dosage_desc = "Moderate deficit. Standard recommended dosage split into 2 applications."
    else:
        dosage_level = "Low"
        dosage_kg_acre = round(25.0 + max(0, total_deficit * 0.1), 1)
        dosage_desc = "Soil nutrients are near optimal. Maintenance dose for balanced harvest yield."

    # Suggested alternative crops based on soil conditions (pH & nutrients)
    suggested_crops = []
    for c in crops_metadata:
        c_name = c["name"]
        if c_name.lower() == crop_type.lower():
            continue
        c_ph = c["pH_opt"]
        if c_ph[0] <= soil_ph <= c_ph[1]:
            suggested_crops.append(c_name)
    if not suggested_crops:
        suggested_crops = ["Maize", "Pulses", "Soybean"]
    suggested_crops = suggested_crops[:3]

    # Soil Health Assessment
    soil_health_notes = []
    if soil_ph < 5.8:
        soil_health_notes.append("Acidic soil detected (pH < 5.8): Consider agricultural lime (calcium carbonate) application.")
    elif soil_ph > 7.8:
        soil_health_notes.append("Alkaline soil detected (pH > 7.8): Consider gypsum application and organic compost.")
    else:
        soil_health_notes.append(f"Soil pH ({soil_ph}) is in the optimal vegetative growth range.")

    if n_diff > 30:
        soil_health_notes.append(f"Nitrogen is deficient by ~{int(n_diff)} kg/ha.")
    if p_diff > 25:
        soil_health_notes.append(f"Phosphorus is deficient by ~{int(p_diff)} kg/ha.")
    if k_diff > 25:
        soil_health_notes.append(f"Potassium is deficient by ~{int(k_diff)} kg/ha.")
    if not soil_health_notes:
        soil_health_notes.append("Well-balanced soil fertility profile.")

    summary_text = " | ".join(soil_health_notes)

    # Save to history if user_id is provided
    if user_id:
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO recommendation_history (
                    user_id, crop_type, nitrogen, phosphorus, potassium, soil_ph,
                    temperature, humidity, recommended_fertilizer, suggested_crops,
                    dosage_level, dosage_kg_acre, soil_health_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, crop_type, nitrogen, phosphorus, potassium, soil_ph,
                temperature, humidity, recommended_fertilizer,
                ", ".join(suggested_crops), dosage_level, dosage_kg_acre, summary_text
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error logging recommendation history: {e}")

    result = {
        "success": True,
        "input_summary": {
            "crop_type": crop_type,
            "nitrogen": nitrogen,
            "phosphorus": phosphorus,
            "potassium": potassium,
            "soil_ph": soil_ph,
            "temperature": temperature,
            "humidity": humidity
        },
        "recommended_fertilizer": recommended_fertilizer,
        "confidence": confidence,
        "suggested_crops": suggested_crops,
        "dosage": {
            "level": dosage_level,
            "kg_acre": dosage_kg_acre,
            "description": dosage_desc
        },
        "nutrient_analysis": {
            "nitrogen_status": "Deficient" if n_diff > 25 else ("Surplus" if n_diff < -20 else "Optimal"),
            "phosphorus_status": "Deficient" if p_diff > 20 else ("Surplus" if p_diff < -15 else "Optimal"),
            "potassium_status": "Deficient" if k_diff > 20 else ("Surplus" if k_diff < -15 else "Optimal"),
            "soil_health_notes": soil_health_notes
        }
    }

    return jsonify(result), 200

# ==========================================================
# Appointment Booking Endpoints (/book-appointment)
# ==========================================================
@app.route("/book-appointment", methods=["POST"])
@app.route("/api/book-appointment", methods=["POST"])
def book_appointment():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    farmer_name = data.get("farmer_name", "").strip()
    contact_number = data.get("contact_number", "").strip()
    location = data.get("location", "").strip()
    preferred_date = data.get("preferred_date", "").strip()
    farm_size = data.get("farm_size_acres")
    soil_type = data.get("soil_type", "Standard Loam").strip()

    if not farmer_name or not contact_number or not location or not preferred_date:
        return jsonify({
            "success": False,
            "message": "Farmer name, contact number, location, and preferred date are required."
        }), 400

    # Generate unique human-readable tracking ID (e.g., SOIL-2026-4821)
    tracking_id = f"SOIL-{datetime.datetime.now().year}-{random.randint(1000, 9999)}"

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO appointments (
                tracking_id, user_id, farmer_name, contact_number, location,
                farm_size_acres, soil_type, preferred_date, status, admin_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tracking_id,
            user_id,
            farmer_name,
            contact_number,
            location,
            farm_size if farm_size else 0,
            soil_type,
            preferred_date,
            "Pending",
            "Request received via Web Portal. Awaiting laboratory technician assignment."
        ))
        conn.commit()
        appointment_id = cursor.lastrowid

        # Send initial confirmation notification (SMS / Email)
        send_notification(
            db_connection=conn,
            appointment_id=appointment_id,
            user_id=user_id,
            farmer_name=farmer_name,
            contact_number=contact_number,
            new_status="Pending",
            notes="Appointment request registered. Tracking ID: " + tracking_id
        )

        conn.close()

        return jsonify({
            "success": True,
            "message": "Soil testing appointment booked successfully!",
            "tracking_id": tracking_id,
            "appointment": {
                "id": appointment_id,
                "tracking_id": tracking_id,
                "farmer_name": farmer_name,
                "contact_number": contact_number,
                "location": location,
                "preferred_date": preferred_date,
                "status": "Pending"
            }
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500

@app.route("/api/appointments/my", methods=["GET"])
def get_my_appointments():
    user_id = request.args.get("user_id")
    phone = request.args.get("phone")

    conn = get_db()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("SELECT * FROM appointments WHERE user_id = ? ORDER BY id DESC", (user_id,))
    elif phone:
        cursor.execute("SELECT * FROM appointments WHERE contact_number = ? ORDER BY id DESC", (phone,))
    else:
        conn.close()
        return jsonify({"success": False, "message": "user_id or phone parameter required."}), 400

    rows = cursor.fetchall()
    appointments = [dict(row) for row in rows]
    conn.close()

    return jsonify({"success": True, "appointments": appointments}), 200

# ==========================================================
# Farmer Recommendation History
# ==========================================================
@app.route("/api/history", methods=["GET"])
def get_recommendation_history():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM recommendation_history
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 20
    """, (user_id,))
    rows = cursor.fetchall()
    history = [dict(row) for row in rows]
    conn.close()

    return jsonify({"success": True, "history": history}), 200

# ==========================================================
# Admin Endpoints (/admin/appointments, /admin/update-status)
# ==========================================================
@app.route("/admin/appointments", methods=["GET"])
@app.route("/api/admin/appointments", methods=["GET"])
def get_all_appointments():
    status_filter = request.args.get("status")

    conn = get_db()
    cursor = conn.cursor()

    if status_filter and status_filter != "All":
        cursor.execute("SELECT * FROM appointments WHERE status = ? ORDER BY id DESC", (status_filter,))
    else:
        cursor.execute("SELECT * FROM appointments ORDER BY id DESC")

    rows = cursor.fetchall()
    appointments = [dict(row) for row in rows]
    conn.close()

    return jsonify({"success": True, "appointments": appointments}), 200

@app.route("/admin/update-status", methods=["POST"])
@app.route("/api/admin/update-status", methods=["POST"])
def update_appointment_status():
    data = request.get_json() or {}
    appointment_id = data.get("appointment_id")
    new_status = data.get("status")
    admin_notes = data.get("admin_notes", "").strip()
    assigned_date = data.get("assigned_date")

    valid_statuses = ["Pending", "Approved", "Sample Collected", "Testing In Progress", "Completed", "Rejected"]

    if not appointment_id or not new_status:
        return jsonify({"success": False, "message": "appointment_id and status are required."}), 400

    if new_status not in valid_statuses:
        return jsonify({"success": False, "message": f"Status must be one of: {', '.join(valid_statuses)}"}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Get appointment details for notification
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,))
    appt = cursor.fetchone()
    if not appt:
        conn.close()
        return jsonify({"success": False, "message": "Appointment not found."}), 404

    try:
        cursor.execute("""
            UPDATE appointments
            SET status = ?, admin_notes = ?, assigned_date = COALESCE(?, assigned_date)
            WHERE id = ?
        """, (new_status, admin_notes, assigned_date, appointment_id))
        conn.commit()

        # Send simulated SMS/Email notification to farmer
        notif_result = send_notification(
            db_connection=conn,
            appointment_id=appointment_id,
            user_id=appt["user_id"],
            farmer_name=appt["farmer_name"],
            contact_number=appt["contact_number"],
            new_status=new_status,
            assigned_date=assigned_date,
            notes=admin_notes
        )

        conn.close()

        return jsonify({
            "success": True,
            "message": f"Appointment status updated to '{new_status}' successfully!",
            "notification": notif_result
        }), 200
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": f"Database update error: {str(e)}"}), 500

@app.route("/api/admin/stats", methods=["GET"])
def get_admin_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM appointments")
    total_appts = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM appointments WHERE status = 'Pending'")
    pending_appts = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM appointments WHERE status = 'Approved'")
    approved_appts = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM appointments WHERE status = 'Completed'")
    completed_appts = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'farmer'")
    total_farmers = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM recommendation_history")
    total_recommendations = cursor.fetchone()["count"]

    # Recent notification logs
    cursor.execute("SELECT * FROM notification_logs ORDER BY id DESC LIMIT 10")
    recent_notifs = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        "success": True,
        "stats": {
            "total_appointments": total_appts,
            "pending_appointments": pending_appts,
            "approved_appointments": approved_appts,
            "completed_appointments": completed_appts,
            "total_farmers": total_farmers,
            "total_recommendations": total_recommendations
        },
        "recent_notifications": recent_notifs
    }), 200

# ==========================================================
# Health Check Endpoint
# ==========================================================
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "app": "Smart Fertilizer Recommendation System",
        "ml_model_loaded": model is not None,
        "timestamp": datetime.datetime.now().isoformat()
    }), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
