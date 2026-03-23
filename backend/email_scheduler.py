import asyncio
import threading
from datetime import datetime, timedelta
from db import users_collection, products_collection
from utils import send_email_alert, notifications_enabled
import os

# Internal job queue for email workers
email_queue = asyncio.Queue()

def calculate_next_run(hour, minute, force_tomorrow=False):
    """Computes the next occurrence of the given hour/minute.
    Allows for 'near-future' scheduling if the time is within 5 minutes of now,
    unless force_tomorrow is True."""
    now = datetime.now()
    next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    # If the scheduled time is more than 1 minute in the past, or if we force it, move to tomorrow.
    if force_tomorrow or next_run < (now - timedelta(minutes=1)):
        next_run += timedelta(days=1)
    return next_run

async def email_worker(worker_id):
    """Consumes jobs from the queue and sends emails asynchronously."""
    msg = f"[Worker-{worker_id}] Started."
    print(msg)
    log_to_file(msg)
    while True:
        user_data = await email_queue.get()
        try:
            email = user_data.get('email')
            user_id = user_data.get('_id')
            
            print(f"[Worker-{worker_id}] Processing alert for {email}...")
            
            # Fetch products and check for near-expiry (3-day threshold as per user preference)
            products = list(products_collection.find({"user_id": str(user_id)}))
            today = datetime.now().date()
            alert_products = [p for p in products if (lambda d: (datetime.strptime(d, '%d/%m/%Y').date() - today).days <= 3 if "/" in d else False)(p["expiry_date"])]
            
            if alert_products:
                if send_email_alert(email, alert_products):
                    log_to_file(f"SUCCESS: Alerts sent to {email} ({len(alert_products)} items).")
                else:
                    log_to_file(f"ERROR: Failed to send alerts to {email}. Handled by worker pool.")
            else:
                log_to_file(f"SKIP: No products near expiry for {email} during scheduled run.")
            
            # Re-calculate next run time for the next day - FORCE tomorrow to prevent duplicates
            notif = user_data.get("notification_time", {"hour": 6, "minute": 0})
            next_run = calculate_next_run(notif.get("hour", 6), notif.get("minute", 0), force_tomorrow=True)
            
            users_collection.update_one(
                {"_id": user_id},
                {"$set": {
                    "next_notification_at": next_run,
                    "last_alert_sent": datetime.now()
                }}
            )
            print(f"[Worker-{worker_id}] PID:{os.getpid()} Rescheduled {email} for {next_run}.")

        except Exception as e:
            print(f"[Worker-{worker_id}] Error: {e}")
        finally:
            email_queue.task_done()

async def central_poller():
    """Polls the database for users due for notifications."""
    msg = "[Poller] Starting centralized scheduler..."
    print(msg)
    log_to_file(msg)
    while True:
        try:
            now = datetime.now()
            
            # 1. Initialize users missing next_notification_at
            users_missing_next = list(users_collection.find({"next_notification_at": {"$exists": False}}))
            for user in users_missing_next:
                notif = user.get("notification_time", {"hour": 6, "minute": 0})
                next_run = calculate_next_run(notif.get("hour", 6), notif.get("minute", 0))
                users_collection.update_one({"_id": user["_id"]}, {"$set": {"next_notification_at": next_run}})
                log_to_file(f"Initialized next_run for {user.get('email')} to {next_run}")

            # 2. Find users who are DUE and have notifications_enabled=True
            # Note: We query directly for notifications_enabled: True (defaulting to True if missing)
            due_users = list(users_collection.find({
                "next_notification_at": {"$lte": now},
                "notifications_enabled": {"$ne": False} # Matches True or missing
            }))
            
            if due_users:
                print(f"[Poller] Found {len(due_users)} users due for alerts. Queueing...")
                for user in due_users:
                    # Update next_notification_at immediately to prevent double-queueing
                    # The worker will refine this, but we bump it by 1 minute as a placeholder
                    users_collection.update_one(
                        {"_id": user["_id"]}, 
                        {"$set": {"next_notification_at": now + timedelta(days=1)}}
                    )
                    await email_queue.put(user)
            
        except Exception as e:
            print(f"[Poller] Error: {e}")
            log_to_file(f"POLLER ERROR: {e}")
            
        await asyncio.sleep(30) # Poll every 30 seconds for better responsiveness

def start_alert_manager():
    """Entry point to start the async loop in a separate thread."""
    def run_async_loop():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Start a small pool of workers
        for i in range(3):
            loop.create_task(email_worker(i + 1))
            
        loop.create_task(central_poller())
        loop.run_forever()

    threading.Thread(target=run_async_loop, daemon=True).start()

def log_to_file(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    pid = os.getpid()
    log_line = f"[{timestamp}] PID:{pid} {message}\n"
    try:
        with open("scheduler_logs.txt", "a") as f:
            f.write(log_line)
    except:
        pass