import sqlite3
import os
from werkzeug.security import generate_password_hash, check_password_hash
from backend.config import Config

def get_db():
    """Returns a SQLite database connection with row factory enabled."""
    os.makedirs(os.path.dirname(Config.SQLITE_PATH), exist_ok=True)
    conn = sqlite3.connect(Config.SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes SQLite database tables and seeds default admin account."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'farmer',
            location TEXT,
            preferred_language TEXT DEFAULT 'en',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Appointments Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tracking_id TEXT NOT NULL UNIQUE,
            user_id INTEGER,
            farmer_name TEXT NOT NULL,
            contact_number TEXT NOT NULL,
            location TEXT NOT NULL,
            farm_size_acres REAL,
            soil_type TEXT,
            preferred_date TEXT NOT NULL,
            assigned_date TEXT,
            status TEXT DEFAULT 'Pending',
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # 3. Recommendation History Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recommendation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            crop_type TEXT NOT NULL,
            nitrogen REAL NOT NULL,
            phosphorus REAL NOT NULL,
            potassium REAL NOT NULL,
            soil_ph REAL NOT NULL,
            temperature REAL,
            humidity REAL,
            recommended_fertilizer TEXT NOT NULL,
            suggested_crops TEXT,
            dosage_level TEXT NOT NULL,
            dosage_kg_acre REAL,
            soil_health_summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # 4. Notification Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notification_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            appointment_id INTEGER,
            user_id INTEGER,
            channel TEXT NOT NULL,
            recipient TEXT NOT NULL,
            subject_or_title TEXT,
            message_content TEXT NOT NULL,
            status TEXT DEFAULT 'SENT',
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id)
        )
    """)

    # Seed Default Admin if not exists
    cursor.execute("SELECT id FROM users WHERE email = ?", ("admin@kisan.gov.in",))
    admin = cursor.fetchone()
    if not admin:
        admin_pass_hash = generate_password_hash("admin123")
        cursor.execute("""
            INSERT INTO users (name, email, phone, password_hash, role, location, preferred_language)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            "Krishi Officer (Admin)",
            "admin@kisan.gov.in",
            "+91-9876543210",
            admin_pass_hash,
            "admin",
            "State Krishi Vigyan Kendra Lab",
            "en"
        ))
        print("Default admin account created: admin@kisan.gov.in / admin123")

    # Seed Sample Farmer if not exists
    cursor.execute("SELECT id FROM users WHERE email = ?", ("farmer@kisan.gov.in",))
    farmer = cursor.fetchone()
    if not farmer:
        farmer_pass_hash = generate_password_hash("farmer123")
        cursor.execute("""
            INSERT INTO users (name, email, phone, password_hash, role, location, preferred_language)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            "Ramesh Patel",
            "farmer@kisan.gov.in",
            "+91-9822012345",
            farmer_pass_hash,
            "farmer",
            "Wardha, Maharashtra",
            "hi"
        ))
        print("Default sample farmer created: farmer@kisan.gov.in / farmer123")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
