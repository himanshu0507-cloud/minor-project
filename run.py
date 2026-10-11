"""
Smart Fertilizer Recommendation System - Startup Script
Usage:
    python run.py
"""
import os
import sys

# Ensure UTF-8 output encoding on Windows terminals if supported
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure backend and project root are discoverable
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app import app
from backend.database import init_db

if __name__ == "__main__":
    print("=" * 65)
    print("[*] Starting Smart Fertilizer Recommendation System...")
    print("=" * 65)
    
    # Verify/initialize database
    init_db()
    
    print("\n[+] Server running locally at: http://127.0.0.1:5000")
    print("[+] Farmer Portal: http://127.0.0.1:5000")
    print("[+] Admin Portal: Login with admin@kisan.gov.in / admin123")
    print("=" * 65)
    print("Press Ctrl+C to stop the server.\n")

    app.run(host="0.0.0.0", port=5000, debug=False)
