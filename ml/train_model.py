import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder

# Set seed for reproducibility
np.random.seed(42)

# Define Crops and their typical agronomic nutrient profiles (N, P, K in kg/ha, optimal pH)
CROPS = [
    {"name": "Rice", "N_opt": 90, "P_opt": 45, "K_opt": 45, "pH_opt": (5.5, 7.0), "temp_opt": (22, 32), "hum_opt": (70, 95)},
    {"name": "Wheat", "N_opt": 120, "P_opt": 60, "K_opt": 40, "pH_opt": (6.0, 7.5), "temp_opt": (15, 25), "hum_opt": (50, 75)},
    {"name": "Maize", "N_opt": 100, "P_opt": 50, "K_opt": 40, "pH_opt": (5.8, 7.2), "temp_opt": (20, 30), "hum_opt": (55, 80)},
    {"name": "Cotton", "N_opt": 110, "P_opt": 55, "K_opt": 55, "pH_opt": (6.5, 8.0), "temp_opt": (24, 35), "hum_opt": (45, 75)},
    {"name": "Sugarcane", "N_opt": 150, "P_opt": 65, "K_opt": 70, "pH_opt": (6.0, 7.5), "temp_opt": (25, 36), "hum_opt": (60, 85)},
    {"name": "Tomato", "N_opt": 100, "P_opt": 70, "K_opt": 80, "pH_opt": (6.0, 7.0), "temp_opt": (18, 28), "hum_opt": (55, 75)},
    {"name": "Potato", "N_opt": 110, "P_opt": 80, "K_opt": 100, "pH_opt": (5.0, 6.5), "temp_opt": (16, 24), "hum_opt": (60, 80)},
    {"name": "Groundnut", "N_opt": 25, "P_opt": 50, "K_opt": 50, "pH_opt": (6.0, 7.2), "temp_opt": (22, 30), "hum_opt": (50, 70)},
    {"name": "Pulses", "N_opt": 30, "P_opt": 60, "K_opt": 30, "pH_opt": (6.0, 7.5), "temp_opt": (20, 28), "hum_opt": (45, 65)},
    {"name": "Soybean", "N_opt": 35, "P_opt": 65, "K_opt": 45, "pH_opt": (6.0, 7.0), "temp_opt": (22, 30), "hum_opt": (55, 75)},
    {"name": "Coffee", "N_opt": 100, "P_opt": 40, "K_opt": 90, "pH_opt": (5.0, 6.5), "temp_opt": (18, 26), "hum_opt": (65, 85)},
    {"name": "Tea", "N_opt": 130, "P_opt": 35, "K_opt": 60, "pH_opt": (4.5, 5.8), "temp_opt": (18, 28), "hum_opt": (70, 90)},
]

def determine_fertilizer_and_dosage(n_diff, p_diff, k_diff, ph):
    """
    n_diff: crop_N_opt - actual_N (positive means deficit, negative means surplus)
    p_diff: crop_P_opt - actual_P
    k_diff: crop_K_opt - actual_K
    """
    total_deficit = max(0, n_diff) + max(0, p_diff) + max(0, k_diff)
    if total_deficit > 80:
        dosage = "High"
        kg_acre = round(np.random.uniform(70, 100), 1)
    elif total_deficit > 35:
        dosage = "Medium"
        kg_acre = round(np.random.uniform(40, 65), 1)
    else:
        dosage = "Low"
        kg_acre = round(np.random.uniform(20, 35), 1)

    if n_diff > 40 and p_diff <= 20 and k_diff <= 20:
        fertilizer = "Urea"
    elif p_diff > 35 and n_diff <= 25 and k_diff <= 20:
        fertilizer = "SSP" if ph < 6.5 else "DAP"
    elif k_diff > 35 and n_diff <= 25 and p_diff <= 20:
        fertilizer = "Potash (MOP)"
    elif p_diff > 30 and k_diff > 30 and n_diff <= 30:
        fertilizer = "10-26-26"
    elif p_diff > 35 and n_diff > 25 and k_diff <= 25:
        fertilizer = "14-35-14"
    elif n_diff > 25 and p_diff > 25 and k_diff <= 20:
        fertilizer = "28-28-0"
    elif n_diff > 20 and p_diff > 20 and k_diff > 20:
        fertilizer = "17-17-17" if ph >= 6.5 else "20-20-0"
    elif n_diff > 20:
        fertilizer = "Urea"
    elif p_diff > 20:
        fertilizer = "DAP"
    elif k_diff > 20:
        fertilizer = "Potash (MOP)"
    else:
        fertilizer = "17-17-17"

    return fertilizer, dosage, kg_acre

def generate_synthetic_dataset(samples_per_crop=120):
    records = []
    
    for crop in CROPS:
        name = crop["name"]
        n_opt = crop["N_opt"]
        p_opt = crop["P_opt"]
        k_opt = crop["K_opt"]
        ph_low, ph_high = crop["pH_opt"]
        temp_low, temp_high = crop["temp_opt"]
        hum_low, hum_high = crop["hum_opt"]

        for _ in range(samples_per_crop):
            scenario = np.random.choice(["n_def", "p_def", "k_def", "pk_def", "np_def", "all_def", "balanced", "surplus"])
            
            if scenario == "n_def":
                n_actual = max(5, np.random.normal(n_opt * 0.4, 10))
                p_actual = max(5, np.random.normal(p_opt * 0.95, 8))
                k_actual = max(5, np.random.normal(k_opt * 0.95, 8))
            elif scenario == "p_def":
                n_actual = max(5, np.random.normal(n_opt * 0.95, 10))
                p_actual = max(5, np.random.normal(p_opt * 0.35, 6))
                k_actual = max(5, np.random.normal(k_opt * 0.95, 8))
            elif scenario == "k_def":
                n_actual = max(5, np.random.normal(n_opt * 0.95, 10))
                p_actual = max(5, np.random.normal(p_opt * 0.95, 8))
                k_actual = max(5, np.random.normal(k_opt * 0.35, 7))
            elif scenario == "pk_def":
                n_actual = max(5, np.random.normal(n_opt * 0.9, 10))
                p_actual = max(5, np.random.normal(p_opt * 0.4, 6))
                k_actual = max(5, np.random.normal(k_opt * 0.4, 6))
            elif scenario == "np_def":
                n_actual = max(5, np.random.normal(n_opt * 0.45, 8))
                p_actual = max(5, np.random.normal(p_opt * 0.45, 6))
                k_actual = max(5, np.random.normal(k_opt * 0.9, 8))
            elif scenario == "all_def":
                n_actual = max(5, np.random.normal(n_opt * 0.4, 8))
                p_actual = max(5, np.random.normal(p_opt * 0.4, 6))
                k_actual = max(5, np.random.normal(k_opt * 0.4, 6))
            elif scenario == "surplus":
                n_actual = max(5, np.random.normal(n_opt * 1.2, 10))
                p_actual = max(5, np.random.normal(p_opt * 1.2, 8))
                k_actual = max(5, np.random.normal(k_opt * 1.2, 8))
            else:
                n_actual = max(5, np.random.normal(n_opt * 0.8, 10))
                p_actual = max(5, np.random.normal(p_opt * 0.8, 8))
                k_actual = max(5, np.random.normal(k_opt * 0.8, 8))

            ph_val = round(np.random.uniform(ph_low - 0.5, ph_high + 0.5), 2)
            temp_val = round(np.random.uniform(temp_low - 3, temp_high + 4), 1)
            hum_val = round(np.random.uniform(hum_low - 5, hum_high + 5), 1)

            n_actual = round(float(n_actual), 1)
            p_actual = round(float(p_actual), 1)
            k_actual = round(float(k_actual), 1)

            n_diff = n_opt - n_actual
            p_diff = p_opt - p_actual
            k_diff = k_opt - k_actual

            fertilizer, dosage, kg_acre = determine_fertilizer_and_dosage(n_diff, p_diff, k_diff, ph_val)

            records.append({
                "Nitrogen": n_actual,
                "Phosphorus": p_actual,
                "Potassium": k_actual,
                "pH": ph_val,
                "Temperature": temp_val,
                "Humidity": hum_val,
                "Crop_Type": name,
                "Fertilizer": fertilizer,
                "Dosage": dosage,
                "Dosage_kg_acre": kg_acre
            })

    df = pd.DataFrame(records)
    return df

def train():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(current_dir, "dataset.csv")
    model_path = os.path.join(current_dir, "fertilizer_model.pkl")
    encoders_path = os.path.join(current_dir, "encoders.pkl")

    print("Generating realistic agronomy dataset with 12 crop types and 1440 samples...")
    df = generate_synthetic_dataset(samples_per_crop=120)
    df.to_csv(dataset_path, index=False)
    print(f"Saved dataset to {dataset_path}")

    # Prepare features and target
    le_crop = LabelEncoder()
    le_fertilizer = LabelEncoder()

    df["Crop_Encoded"] = le_crop.fit_transform(df["Crop_Type"])
    y = le_fertilizer.fit_transform(df["Fertilizer"])

    feature_cols = ["Nitrogen", "Phosphorus", "Potassium", "pH", "Temperature", "Humidity", "Crop_Encoded"]
    X = df[feature_cols]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("Training Random Forest Classifier model...")
    rf_model = RandomForestClassifier(n_estimators=120, max_depth=14, random_state=42)
    rf_model.fit(X_train, y_train)

    y_pred = rf_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nModel Test Accuracy: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le_fertilizer.classes_))

    # Save model and metadata
    with open(model_path, "wb") as f:
        pickle.dump(rf_model, f)
    print(f"Serialized model saved to {model_path}")

    encoders = {
        "crop_encoder": le_crop,
        "fertilizer_encoder": le_fertilizer,
        "feature_cols": feature_cols,
        "crops_metadata": CROPS,
        "fertilizer_classes": list(le_fertilizer.classes_)
    }

    with open(encoders_path, "wb") as f:
        pickle.dump(encoders, f)
    print(f"Saved encoders and metadata to {encoders_path}")

if __name__ == "__main__":
    train()
