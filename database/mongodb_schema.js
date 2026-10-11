/**
 * Smart Fertilizer Recommendation System - MongoDB Schema & Initialization Script
 * Execute in mongosh or MongoDB Compass:
 *   mongosh mongodb://localhost:27017/smart_fertilizer_db mongodb_schema.js
 */

const dbName = "smart_fertilizer_db";
const db = db.getSiblingDB(dbName);

// 1. Users Collection
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "password_hash", "role"],
      properties: {
        name: { bsonType: "string", description: "Full name" },
        email: { bsonType: "string", pattern: "^.+@.+$", description: "Unique valid email address" },
        phone: { bsonType: "string", description: "Contact number" },
        password_hash: { bsonType: "string", description: "Bcrypt or PBKDF2 hashed password" },
        role: { enum: ["farmer", "admin"], description: "Role access" },
        location: { bsonType: "string" },
        preferred_language: { enum: ["en", "hi", "mr"], description: "Selected language" },
        created_at: { bsonType: "date" }
      }
    }
  }
});
db.users.createIndex({ email: 1 }, { unique: true });

// 2. Appointments Collection
db.createCollection("appointments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tracking_id", "farmer_name", "contact_number", "location", "preferred_date", "status"],
      properties: {
        tracking_id: { bsonType: "string" },
        user_id: { bsonType: ["objectId", "null"] },
        farmer_name: { bsonType: "string" },
        contact_number: { bsonType: "string" },
        location: { bsonType: "string" },
        farm_size_acres: { bsonType: ["double", "int", "null"] },
        soil_type: { bsonType: ["string", "null"] },
        preferred_date: { bsonType: "string" },
        assigned_date: { bsonType: ["string", "null"] },
        status: { 
          enum: ["Pending", "Approved", "Sample Collected", "Testing In Progress", "Completed", "Rejected"] 
        },
        admin_notes: { bsonType: ["string", "null"] },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});
db.appointments.createIndex({ tracking_id: 1 }, { unique: true });
db.appointments.createIndex({ user_id: 1 });
db.appointments.createIndex({ status: 1 });

// 3. Recommendation History Collection
db.createCollection("recommendation_history", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["crop_type", "nitrogen", "phosphorus", "potassium", "soil_ph", "recommended_fertilizer", "dosage_level"],
      properties: {
        user_id: { bsonType: ["objectId", "null"] },
        crop_type: { bsonType: "string" },
        nitrogen: { bsonType: ["double", "int"] },
        phosphorus: { bsonType: ["double", "int"] },
        potassium: { bsonType: ["double", "int"] },
        soil_ph: { bsonType: ["double", "int"] },
        temperature: { bsonType: ["double", "int", "null"] },
        humidity: { bsonType: ["double", "int", "null"] },
        recommended_fertilizer: { bsonType: "string" },
        suggested_crops: { bsonType: ["array", "string"] },
        dosage_level: { enum: ["Low", "Medium", "High"] },
        dosage_kg_acre: { bsonType: ["double", "int"] },
        soil_health_summary: { bsonType: "string" },
        created_at: { bsonType: "date" }
      }
    }
  }
});
db.recommendation_history.createIndex({ user_id: 1 });

// 4. Notification Logs Collection
db.createCollection("notification_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["channel", "recipient", "message_content", "status"],
      properties: {
        appointment_id: { bsonType: ["objectId", "string", "null"] },
        channel: { enum: ["SMS", "EMAIL"] },
        recipient: { bsonType: "string" },
        subject_or_title: { bsonType: "string" },
        message_content: { bsonType: "string" },
        status: { enum: ["SENT", "FAILED"] },
        sent_at: { bsonType: "date" }
      }
    }
  }
});

print("MongoDB smart_fertilizer_db collections and indexes initialized successfully.");
