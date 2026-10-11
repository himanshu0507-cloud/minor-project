"""
Smart Fertilizer Recommendation System - Automated Test Suite
Verifies all REST APIs, ML model predictions, appointments, and notifications.
"""
import os
import sys
import unittest
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app import app
from backend.database import init_db, get_db

class SmartFertilizerTestCase(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()
        init_db()

    def test_01_health(self):
        """Test health check endpoint"""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["ml_model_loaded"])
        print("\n[PASS] Health check and ML model verification.")

    def test_02_predict_fertilizer(self):
        """Test Random Forest ML prediction"""
        payload = {
            "crop_type": "Wheat",
            "nitrogen": 75.0,
            "phosphorus": 30.0,
            "potassium": 35.0,
            "soil_ph": 6.8,
            "temperature": 22.0,
            "humidity": 60.0
        }
        res = self.client.post("/api/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("recommended_fertilizer", data)
        self.assertIn(data["dosage"]["level"], ["Low", "Medium", "High"])
        self.assertGreater(data["confidence"], 0)
        self.assertIsInstance(data["suggested_crops"], list)
        print(f"[PASS] ML Prediction test passed: Recommended {data['recommended_fertilizer']} ({data['dosage']['level']} dose, {data['dosage']['kg_acre']} kg/acre).")

    def test_03_auth_flow(self):
        """Test Farmer registration and Login"""
        test_email = "test.farmer.2026@example.com"
        reg_payload = {
            "name": "Test Farmer",
            "email": test_email,
            "phone": "+91-9876500000",
            "password": "securepassword123",
            "role": "farmer",
            "location": "Nashik, Maharashtra"
        }
        # Register
        res = self.client.post("/api/register", json=reg_payload)
        self.assertIn(res.status_code, [201, 409]) # 409 if already registered from previous run

        # Login
        login_res = self.client.post("/api/login", json={
            "email": test_email,
            "password": "securepassword123"
        })
        self.assertEqual(login_res.status_code, 200)
        data = login_res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["user"]["role"], "farmer")
        print("[PASS] User registration & authentication verified.")

    def test_04_book_and_track_appointment(self):
        """Test Soil testing appointment booking and notification dispatch"""
        payload = {
            "farmer_name": "Balwinder Singh",
            "contact_number": "+91-9988776655",
            "location": "Ludhiana Farm, Punjab",
            "preferred_date": "2026-09-20",
            "farm_size_acres": 5.0,
            "soil_type": "Alluvial Loam"
        }
        res = self.client.post("/api/book-appointment", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data["success"])
        tracking_id = data["tracking_id"]
        appt_id = data["appointment"]["id"]
        self.assertTrue(tracking_id.startswith("SOIL-"))
        print(f"[PASS] Appointment booking verified with Tracking ID: {tracking_id}")

        # Update appointment status as Admin
        update_res = self.client.post("/api/admin/update-status", json={
            "appointment_id": appt_id,
            "status": "Approved",
            "assigned_date": "2026-09-22",
            "admin_notes": "Technician Baldev assigned for field soil collection."
        })
        self.assertEqual(update_res.status_code, 200)
        up_data = update_res.get_json()
        self.assertTrue(up_data["success"])
        self.assertTrue(up_data["notification"]["sms_sent"])
        print("[PASS] Admin status update and SMS/Email notification dispatch verified.")

    def test_05_admin_stats(self):
        """Test Admin KPI counts and notification logs"""
        res = self.client.get("/api/admin/stats")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["stats"]["total_appointments"], 1)
        self.assertIsInstance(data["recent_notifications"], list)
        print(f"[PASS] Admin stats verified. Total appointments: {data['stats']['total_appointments']}")

if __name__ == "__main__":
    unittest.main()
