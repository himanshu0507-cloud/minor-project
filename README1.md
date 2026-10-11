# 🌱 Smart Fertilizer Recommendation System

An AI-powered full-stack web application designed to help farmers optimize crop yields and soil fertility. The system uses a Machine Learning **Random Forest Classifier** trained on agronomic soil data (Nitrogen, Phosphorus, Potassium, Soil pH, Temperature, Humidity, and Crop Type) to recommend the optimal fertilizer, dosage rate (Low/Medium/High in kg/acre), and alternative suitable crops.

For farmers who do not have their soil testing values, the portal offers a **Soil Testing Appointment Booking** workflow with end-to-end appointment tracking, automated SMS/Email notification simulation, and a dedicated **Admin Dashboard** for agricultural officers (Krishi Vigyan Kendra).

---

## 🛠️ Tech Stack

- **Frontend**: Responsive Single-Page Application (SPA) with **React 18**, Tailwind CSS, Lucide Icons, and multi-language internationalization (**English, Hindi हिंदी, Marathi मराठी**).
- **Backend**: **Python Flask REST API** with CORS support and secure password hashing (`werkzeug.security`).
- **Machine Learning**: **Scikit-Learn Random Forest Classifier**, Pandas, NumPy, and serialized model artifacts via `pickle`.
- **Database**:
  - **SQLite** (Default, zero-setup, immediately executable out of the box).
  - **MySQL** (Full production schema in `database/schema.sql`).
  - **MongoDB** (Full collection & document validator scripts in `database/mongodb_schema.js`).
- **Notifications**: Simulated SMS & Email notification dispatcher with audit logging.

---

## 📂 Project Structure

```text
smart_fertilizer_system/
├── ml/
│   ├── dataset.csv                  # Agronomy dataset (1440 samples, 12 crop types)
│   ├── train_model.py               # Random Forest training & evaluation script
│   ├── fertilizer_model.pkl         # Trained Scikit-Learn model
│   └── encoders.pkl                 # Label encoders & agronomic metadata
├── backend/
│   ├── app.py                       # Flask application & REST API endpoints
│   ├── config.py                    # App configuration & DB paths
│   ├── database.py                  # Database connection & seed initializer
│   ├── notifications.py             # SMS & Email notification dispatcher
│   └── requirements.txt             # Python backend dependencies
├── database/
│   ├── schema.sql                   # Production MySQL schema
│   ├── mongodb_schema.js            # MongoDB schema & collection definitions
│   └── seed_data.sql                # Seed data for default admin and farmers
├── frontend/
│   ├── index.html                   # HTML5 SPA shell
│   ├── css/
│   │   └── style.css                # Custom green-leaf theme & status badges
│   └── js/
│       ├── app.js                   # React 18 frontend components
│       └── i18n.js                  # Multi-language dictionary (EN, HI, MR)
├── run.py                           # One-click startup runner
└── README.md                        # Documentation & setup guide
```

---

## 🚀 Step-by-Step Setup Instructions

### 1. Prerequisites
- **Python 3.10+** (Tested on Python 3.14)
- Web browser (Chrome, Edge, Firefox, or Safari)

### 2. Install Dependencies
Open PowerShell or your terminal inside the project directory:
```bash
pip install -r backend/requirements.txt
```

### 3. (Optional) Re-train the Machine Learning Model
The model artifacts (`fertilizer_model.pkl` and `encoders.pkl`) are already pre-generated. If you wish to re-train:
```bash
python ml/train_model.py
```
This will train the Random Forest model and print accuracy metrics.

### 4. Run the Application
Launch the Flask backend server:
```bash
python run.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 👥 User Roles & Credentials

### 1. Default Admin Account
- **Email**: `admin@kisan.gov.in`
- **Password**: `admin123`
- **Role**: Administrator / Agricultural Officer
- **Capabilities**: View all appointment requests, filter by status, approve appointments, assign technician visit dates, add notes, and inspect SMS/Email notification logs.

### 2. Sample Farmer Account
- **Email**: `farmer@kisan.gov.in`
- **Password**: `farmer123`
- **Role**: Farmer
- **Capabilities**: Input soil parameters, receive fertilizer advice, book soil tests, track appointments, and review past recommendation history.
- *Note: New farmers can also register directly via the Register tab!*

---

## 🌾 Key Features & Workflows

### 1. Soil Parameter Input & Fertilizer Prediction
When a farmer enters:
- **Crop Type**: Wheat, Rice, Maize, Cotton, Sugarcane, Tomato, Potato, Groundnut, Pulses, Soybean, Coffee, Tea
- **Nitrogen (N)**, **Phosphorus (P)**, **Potassium (K)** (in kg/ha)
- **Soil pH** (1 to 14 slider)
- **Temperature & Humidity** (optional)

The system predicts:
1. **Recommended Fertilizer**: Urea, DAP, SSP, 10-26-26, 14-35-14, 17-17-17, 20-20-0, 28-28-0, or Potash (MOP).
2. **Suggested Crop Types**: Alternative crops suitable for the entered soil pH and nutrient profile.
3. **Application Quantity & Dosage Level**: Low / Medium / High dosage with specific kg/acre recommendations and application schedule advice.
4. **Soil Health Assessment**: Nitrogen, Phosphorus, Potassium deficit/surplus status and pH correction tips (e.g., lime or gypsum recommendations).

### 2. Booking Soil Testing Appointments
If a farmer does not know their soil values, a prominent banner allows booking an appointment:
- Farmer Name
- Contact Number
- Location / Village / Pin code
- Preferred Date
- Farm Size & Observed Soil Type
- Generates a unique tracking code (e.g., `SOIL-2026-4821`).

### 3. Admin Appointment Management & Notifications
- Agricultural officers can review all appointments.
- Change status: `Pending` $\rightarrow$ `Approved` $\rightarrow$ `Sample Collected` $\rightarrow$ `Testing In Progress` $\rightarrow$ `Completed` / `Rejected`.
- Automatic SMS & Email dispatch simulation notifies the farmer upon status updates.
- Real-time audit log of dispatched notifications.

### 4. Multi-Language Support
Farmers can switch languages instantly with 1 click:
- **EN**: English
- **हिंदी**: Hindi
- **मराठी**: Marathi

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/register` | Register a new farmer or admin |
| `POST` | `/api/login` | Authenticate user credentials |
| `POST` | `/api/predict` | Generate ML fertilizer recommendation |
| `POST` | `/api/book-appointment` | Submit a soil testing request |
| `GET` | `/api/appointments/my` | Retrieve appointments for a farmer |
| `GET` | `/api/history` | Get past recommendation records |
| `GET` | `/api/admin/appointments` | Retrieve all appointments (supports `?status=`) |
| `POST` | `/api/admin/update-status` | Update appointment status and send notification |
| `GET` | `/api/admin/stats` | Retrieve dashboard KPI counts and notification logs |
| `GET` | `/api/health` | Service health status check |

---

## 🗄️ Database Schemas

### MySQL
To use MySQL instead of SQLite:
1. Import `database/schema.sql` into your MySQL instance:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. Set the environment variable:
   ```bash
   set DATABASE_URL=mysql+pymysql://user:password@localhost/smart_fertilizer_db
   ```

### MongoDB
To initialize MongoDB collections and validation rules:
```bash
mongosh mongodb://localhost:27017/smart_fertilizer_db database/mongodb_schema.js
```
