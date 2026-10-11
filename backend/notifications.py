import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Notifications")

def send_notification(db_connection, appointment_id, user_id, farmer_name, contact_number, new_status, assigned_date=None, notes=None):
    """
    Simulates sending SMS and Email notifications to the farmer when an appointment status is updated.
    Also records the notification event into the notification_logs table.
    """
    timestamp = datetime.datetime.now().strftime("%d-%b-%Y %I:%M %p")
    
    # 1. Compose SMS text
    if new_status == "Approved":
        date_str = assigned_date if assigned_date else "our upcoming schedule"
        sms_text = f"Dear {farmer_name}, your Soil Testing Appointment has been APPROVED for {date_str}. Field technician will visit your plot. Note: {notes or 'Keep field dampness minimal for sample'}. - Krishi Kendra"
        email_subject = f"Appointment Approved - Soil Health Testing Service"
    elif new_status == "Rejected":
        sms_text = f"Dear {farmer_name}, your Soil Testing Appointment could not be scheduled. Reason: {notes or 'Slot unavailable'}. Please contact local Krishi Kendra."
        email_subject = f"Update on Soil Testing Appointment"
    elif new_status == "Completed":
        sms_text = f"Dear {farmer_name}, your Soil Testing report is READY! Check your portal dashboard or visit the testing center. - Krishi Kendra"
        email_subject = f"Soil Health Report Ready - Krishi Kendra"
    elif new_status == "Sample Collected":
        sms_text = f"Dear {farmer_name}, our field agent collected your soil sample today at {timestamp}. Lab analysis has begun."
        email_subject = f"Soil Sample Collected - Lab Analysis Underway"
    else:
        sms_text = f"Dear {farmer_name}, your Soil Testing appointment status is now: {new_status}. Remarks: {notes or 'Updated by Admin'}."
        email_subject = f"Soil Testing Appointment Status Update: {new_status}"

    logger.info(f"\n================ [SMS DISPATCH SIMULATOR] ================")
    logger.info(f"To: {contact_number} | Farmer: {farmer_name}")
    logger.info(f"Message: {sms_text}")
    logger.info(f"==========================================================\n")

    # 2. Record to Database log
    try:
        cursor = db_connection.cursor()
        cursor.execute("""
            INSERT INTO notification_logs (appointment_id, user_id, channel, recipient, subject_or_title, message_content, status, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            appointment_id,
            user_id,
            "SMS",
            contact_number,
            "SMS Alert: " + new_status,
            sms_text,
            "SENT",
            datetime.datetime.now().isoformat()
        ))
        
        cursor.execute("""
            INSERT INTO notification_logs (appointment_id, user_id, channel, recipient, subject_or_title, message_content, status, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            appointment_id,
            user_id,
            "EMAIL",
            f"{farmer_name.lower().replace(' ', '.')}@farmer.in",
            email_subject,
            f"Greetings {farmer_name},\n\n{sms_text}\n\nWarm regards,\nKrishi Vigyan Kendra Soil Testing Lab",
            "SENT",
            datetime.datetime.now().isoformat()
        ))
        db_connection.commit()
    except Exception as e:
        logger.error(f"Error persisting notification log: {e}")

    return {
        "sms_sent": True,
        "email_sent": True,
        "recipient": contact_number,
        "message": sms_text
    }
