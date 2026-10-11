import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "smart-fertilizer-super-secret-key-2026")
    
    # By default, uses local SQLite database for instant zero-configuration execution
    # Set DATABASE_URL to 'mysql+pymysql://user:password@localhost/smart_fertilizer_db' for MySQL
    SQLITE_PATH = os.path.join(BASE_DIR, "database", "smart_fertilizer.db")
    DATABASE_URI = os.environ.get("DATABASE_URL", f"sqlite:///{SQLITE_PATH}")

    # Machine Learning artifacts
    ML_MODEL_PATH = os.path.join(BASE_DIR, "ml", "fertilizer_model.pkl")
    ML_ENCODERS_PATH = os.path.join(BASE_DIR, "ml", "encoders.pkl")

    # Notification settings (Simulated & SMTP/SMS gateway ready)
    ENABLE_NOTIFICATIONS = True
    SMS_SENDER_NAME = "KRISHI-ALERT"
