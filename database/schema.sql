-- ==========================================================
-- Smart Fertilizer Recommendation System - MySQL Database Schema
-- ==========================================================

CREATE DATABASE IF NOT EXISTS smart_fertilizer_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_fertilizer_db;

-- 1. Users Table (Farmers & Administrators)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('farmer', 'admin') DEFAULT 'farmer',
    location VARCHAR(200),
    preferred_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Soil Testing Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_id VARCHAR(30) NOT NULL UNIQUE,
    user_id INT,
    farmer_name VARCHAR(120) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    location VARCHAR(255) NOT NULL,
    farm_size_acres DECIMAL(6,2),
    soil_type VARCHAR(50),
    preferred_date DATE NOT NULL,
    assigned_date DATE,
    status ENUM('Pending', 'Approved', 'Sample Collected', 'Testing In Progress', 'Completed', 'Rejected') DEFAULT 'Pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Fertilizer Recommendation History Table
CREATE TABLE IF NOT EXISTS recommendation_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    crop_type VARCHAR(50) NOT NULL,
    nitrogen DECIMAL(6,2) NOT NULL,
    phosphorus DECIMAL(6,2) NOT NULL,
    potassium DECIMAL(6,2) NOT NULL,
    soil_ph DECIMAL(4,2) NOT NULL,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    recommended_fertilizer VARCHAR(80) NOT NULL,
    suggested_crops TEXT,
    dosage_level VARCHAR(20) NOT NULL,
    dosage_kg_acre DECIMAL(6,2),
    soil_health_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Notification Audit Logs (SMS & Email simulated dispatch)
CREATE TABLE IF NOT EXISTS notification_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT,
    user_id INT,
    channel ENUM('SMS', 'EMAIL') NOT NULL,
    recipient VARCHAR(150) NOT NULL,
    subject_or_title VARCHAR(200),
    message_content TEXT NOT NULL,
    status ENUM('SENT', 'FAILED') DEFAULT 'SENT',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_appointment_tracking ON appointments(tracking_id);
CREATE INDEX idx_appointment_status ON appointments(status);
CREATE INDEX idx_recommendation_user ON recommendation_history(user_id);
