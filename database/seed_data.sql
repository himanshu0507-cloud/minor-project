-- ==========================================================
-- Smart Fertilizer Recommendation System - Seed Data
-- ==========================================================

USE smart_fertilizer_db;

-- 1. Insert Default Administrator
-- Default Admin credentials:
-- Email: admin@kisan.gov.in
-- Password: admin123 (PBKDF2/Werkzeug hash format)
INSERT INTO users (name, email, phone, password_hash, role, location, preferred_language)
VALUES (
    'Krishi Vigyan Kendra Admin',
    'admin@kisan.gov.in',
    '+91-9876543210',
    'scrypt:32768:8:1$vT7rPkWyQfCg$e55b62b1bdf69a6c760ee5e2c77f0d01d4a04780dfa838525b6a38ba335276e6bc6494191316b2ef87ea286782c3f914d7a8ceab2b86ab87556fef3a34a7428f',
    'admin',
    'Pune Agricultural Research Station, Maharashtra',
    'en'
) ON DUPLICATE KEY UPDATE name=name;

-- 2. Insert Sample Farmer
INSERT INTO users (name, email, phone, password_hash, role, location, preferred_language)
VALUES (
    'Ramesh Patil',
    'ramesh.farmer@example.com',
    '+91-9822012345',
    'scrypt:32768:8:1$vT7rPkWyQfCg$e55b62b1bdf69a6c760ee5e2c77f0d01d4a04780dfa838525b6a38ba335276e6bc6494191316b2ef87ea286782c3f914d7a8ceab2b86ab87556fef3a34a7428f',
    'farmer',
    'Baramati, Pune, Maharashtra',
    'mr'
) ON DUPLICATE KEY UPDATE name=name;

-- 3. Insert Sample Appointments for Testing
INSERT INTO appointments (tracking_id, user_id, farmer_name, contact_number, location, farm_size_acres, soil_type, preferred_date, status, admin_notes)
VALUES 
(
    'SOIL-2026-0812',
    2,
    'Ramesh Patil',
    '+91-9822012345',
    'Plot No 4, Baramati Shivar, Pune',
    4.5,
    'Black Soil',
    '2026-09-15',
    'Pending',
    'Awaiting soil testing technician schedule.'
),
(
    'SOIL-2026-0798',
    NULL,
    'Suresh Sharma',
    '+91-9421098765',
    'Village Dhanora, Vidarbha',
    7.0,
    'Red Loam',
    '2026-09-10',
    'Approved',
    'Technician Ajay assigned for field sample collection on 10th Sept.'
);
