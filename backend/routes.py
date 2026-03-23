from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import re
import json
import datetime
from datetime import datetime, timedelta
import dateparser
security = HTTPBearer()
router = APIRouter()

from bson import ObjectId
from db import users_collection
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from config import JWT_SECRET, JWT_ALGORITHM
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = users_collection.find_one({"_id": ObjectId(payload.get("sub"))})
        if not user: raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except JWTError: raise HTTPException(status_code=401, detail="Invalid token")

import threading
current_scheduler = {'thread': None, 'hour': 20, 'minute': 11}

@router.post("/scheduler/time")
async def set_scheduler_time(data: dict, current_user: dict = Depends(get_current_user)):
    hour = int(data.get('hour', 6))
    minute = int(data.get('minute', 0))
    
    # Calculate next notification timestamp based on new time
    next_run = calculate_next_run(hour, minute)
    
    # Update user's notification settings and schedule
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "notification_time": {"hour": hour, "minute": minute},
            "next_notification_at": next_run
        }}
    )
    return {"message": f"Notification time updated to {hour:02d}:{minute:02d}. Next alert at {next_run.strftime('%Y-%m-%d %H:%M:%S')}"}

@router.get("/scheduler/time")
async def get_scheduler_time_route(current_user: dict = Depends(get_current_user)):
    notif = current_user.get("notification_time", {"hour": 6, "minute": 0})
    print(f"[Backend] Fetching scheduler time for {current_user['username']}: {notif}")
    return notif

@router.get("/debug/notifications")
async def debug_notifications(current_user: dict = Depends(get_current_user)):
    user = users_collection.find_one({"_id": current_user["_id"]})
    return {
        "notification_time": user.get("notification_time"),
        "last_alert_sent": user.get("last_alert_sent"),
        "now_server_time": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "notifications_flag_exists": notifications_enabled()
    }

@router.post("/notifications/on")
async def enable_notifications(current_user: dict = Depends(get_current_user)):
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"notifications_enabled": True}}
    )
    return {"message": "Notifications enabled"}

@router.post("/notifications/off")
async def disable_notifications(current_user: dict = Depends(get_current_user)):
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"notifications_enabled": False}}
    )
    return {"message": "Notifications disabled"}

from datetime import datetime, timedelta
from PIL import Image
import io, base64, threading, dateparser, json, re

from bson import ObjectId
from schemas import UserCreate, ProductCreate
from db import users_collection, products_collection
from security import hash_password, verify_password, create_access_token
from utils import get_product_status, send_email_alert, get_product_from_open_facts, notifications_enabled
from email_scheduler import calculate_next_run
from ocr import extract_text_from_image, extract_expiry_date_from_text
from config import GEMINI_API_KEY
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain


@router.post("/signup")
async def signup(user: UserCreate):
    if users_collection.find_one({"username": user.username}): raise HTTPException(status_code=400, detail="Username already exists")
    if users_collection.find_one({"email": user.email}): raise HTTPException(status_code=400, detail="Email already exists")
    # Set default notification_time if not provided
    notification_time = user.notification_time if user.notification_time else {"hour": 6, "minute": 0}
    
    # Initialize next_notification_at for the new user
    next_run = calculate_next_run(notification_time.get("hour", 6), notification_time.get("minute", 0))
    
    doc = {
        "username": user.username, 
        "email": user.email, 
        "password": hash_password(user.password), 
        "created_at": datetime.utcnow(), 
        "notification_time": notification_time,
        "next_notification_at": next_run
    }
    result = users_collection.insert_one(doc)
    return {"access_token": create_access_token(data={"sub": str(result.inserted_id)}), "token_type": "bearer", "user": {"id": str(result.inserted_id), "username": user.username, "email": user.email, "notification_time": notification_time, "next_notification_at": next_run}}


from pymongo.errors import ExecutionTimeout

@router.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    try:
        user = users_collection.find_one({"username": username}, max_time_ms=2000)  # 2 seconds timeout
    except ExecutionTimeout:
        raise HTTPException(status_code=504, detail="Database timeout. Please try again later.")
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "access_token": create_access_token(data={"sub": str(user["_id"])}),
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]), 
            "username": user["username"], 
            "email": user["email"],
            "notification_time": user.get("notification_time", {"hour": 6, "minute": 0})
        }
    }


@router.get("/users/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    notif = current_user.get("notification_time", {"hour": 6, "minute": 0})
    print(f"[Backend] get_current_user_info for {current_user['username']} - notification_time: {notif}")
    return {
        "id": str(current_user["_id"]), 
        "username": current_user["username"], 
        "email": current_user["email"],
        "notification_time": notif
    }


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        image_bytes = await file.read()
        text = extract_text_from_image(image_bytes)
        expiry_date = extract_expiry_date_from_text(text)
        
        # New: Extract product name and category from text
        from utils import extract_product_info, categorize_product
        info = extract_product_info(text)
        product_name = info.get("product_name")
        category = categorize_product(product_name) if product_name else "Other"
        
        import base64
        image_url = f"data:image/png;base64,{base64.b64encode(image_bytes).decode()}"
    except Exception as e:
        print(f"OCR error: {e}"); return {"image_url": None, "expiry_date": None, "extracted_text": "", "product_name": None, "category": "Other"}
    return {"image_url": image_url, "expiry_date": expiry_date, "extracted_text": text, "product_name": product_name, "category": category}


@router.post("/categorize-product")
async def categorize_product_route(data: dict = Body(...)):
    product_name = data.get("product_name")
    if not product_name:
        return {"category": "Other"}
    from utils import categorize_product
    category = categorize_product(product_name)
    return {"category": category}


@router.post("/add-item")
async def add_item(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    doc = {
        "user_id": str(current_user["_id"]),
        "product_name": product.product_name,
        "expiry_date": product.expiry_date,
        "category": product.category,
        "image_url": product.image_url,
        "barcode": product.barcode,
        "status": get_product_status(product.expiry_date),
        "created_at": datetime.utcnow()
    }
    doc["_id"] = str(products_collection.insert_one(doc).inserted_id)
    return doc


@router.post("/batch-delete")
async def batch_delete(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    item_ids = data.get("ids", [])
    if not item_ids:
        return {"message": "No items to delete"}
    object_ids = [ObjectId(id) for id in item_ids]
    result = products_collection.delete_many({"_id": {"$in": object_ids}, "user_id": str(current_user["_id"])})
    return {"message": f"Successfully deleted {result.deleted_count} items"}


@router.post("/batch-status")
async def batch_status(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    item_ids = data.get("ids", [])
    new_status = data.get("status")
    if not item_ids or not new_status:
        return {"message": "Invalid data provided"}
    object_ids = [ObjectId(id) for id in item_ids]
    result = products_collection.update_many(
        {"_id": {"$in": object_ids}, "user_id": str(current_user["_id"])},
        {"$set": {"status": new_status}}
    )
    return {"message": f"Successfully updated {result.modified_count} items to '{new_status}'"}


@router.get("/get-items")
async def get_items(current_user: dict = Depends(get_current_user)):
    products = list(products_collection.find({"user_id": str(current_user["_id"])}))
    for p in products: p["_id"] = str(p["_id"]); p["status"] = get_product_status(p["expiry_date"])
    products.sort(key=lambda p: datetime.strptime(p["expiry_date"], "%d/%m/%Y") if "/" in p["expiry_date"] else datetime.max)
    return products


@router.delete("/delete-item/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = products_collection.delete_one({"_id": ObjectId(item_id), "user_id": str(current_user["_id"])})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}


@router.get("/statistics")
async def get_statistics(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    products = list(products_collection.find({"user_id": user_id}))
    today = datetime.now().date()
    
    total, expiring, expired = len(products), 0, 0
    status_breakdown = {"safe": 0, "near": 0, "expired": 0}
    category_breakdown = {}
    monthly_expiry = {} # Next 6 months
    
    # Initialize monthly_expiry for next 6 months
    for i in range(6):
        month_date = (today + timedelta(days=i*30)).strftime("%b %Y")
        monthly_expiry[month_date] = 0

    for p in products:
        try:
            expiry_dt = datetime.strptime(p["expiry_date"], '%d/%m/%Y')
            expiry = expiry_dt.date()
        except: continue
        
        # Status & Basic Stats
        status = get_product_status(p["expiry_date"])
        status_breakdown[status] += 1
        
        if expiry < today:
            expired += 1
        elif expiry <= today + timedelta(days=7):
            expiring += 1
            
        # Category Breakdown
        cat = p.get("category", "Other")
        category_breakdown[cat] = category_breakdown.get(cat, 0) + 1
        
        # Monthly Trend (if in next 6 months)
        month_key = expiry_dt.strftime("%b %Y")
        if month_key in monthly_expiry:
            monthly_expiry[month_key] += 1

    health_score = round((status_breakdown["safe"] / total * 100), 1) if total > 0 else 100
    
    return {
        "total_items": total,
        "expiring_this_week": expiring,
        "expired_items": expired,
        "status_breakdown": status_breakdown,
        "category_breakdown": category_breakdown,
        "monthly_expiry": monthly_expiry,
        "health_score": health_score
    }


@router.post("/send-expiry-alerts")
async def send_expiry_alerts(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    products = list(products_collection.find({"user_id": user_id}))
    today = datetime.now().date()
    # Reverting to 3 days as per user's specific logic
    alert_products = [p for p in products if (lambda d: (datetime.strptime(d, '%d/%m/%Y').date() - today).days <= 3 if '/' in d else False)(p["expiry_date"])]
    if alert_products:
        threading.Thread(target=lambda: send_email_alert(current_user["email"], alert_products)).start()
        return {"message": f"Expiry alerts sent for {len(alert_products)} products", "products_count": len(alert_products)}
    return {"message": "No products require alerts at this time"}


@router.get("/product-by-barcode/{barcode}")
async def get_product_by_barcode(barcode: str, current_user: dict = Depends(get_current_user)):
    p = products_collection.find_one({"user_id": str(current_user["_id"]), "barcode": barcode})
    if p: return {"product_name": p["product_name"], "barcode": barcode, "source": "user_inventory", "category": p.get("category", "Other")}
    
    from utils import get_product_from_open_facts, categorize_product
    ofp = get_product_from_open_facts(barcode)
    if ofp: 
        ofp["category"] = categorize_product(ofp["product_name"])
        return ofp
        
    raise HTTPException(status_code=404, detail="Product not found")


@router.post("/parse-voice")
async def parse_voice(data: dict = Body(...)):
    transcript = data.get('transcript', '').strip()
    if not transcript:
        return {"error": "Empty transcript received."}

    def strip_markdown_fences(text: str) -> str:
        """Remove ```json ... ``` or ``` ... ``` wrappers Gemini sometimes adds."""
        text = text.strip()
        # Remove opening fence like ```json or ```
        text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
        # Remove closing fence
        text = re.sub(r'\s*```$', '', text)
        return text.strip()

    # ── Pre-process dates ──────────────────────────────────────────────
    from utils import categorize_product
    today_dt = datetime.now()
    today_str = today_dt.strftime('%d/%m/%Y')
    tomorrow_str = (today_dt + timedelta(days=1)).strftime('%d/%m/%Y')
    days_to_monday = (7 - today_dt.weekday()) % 7 or 7
    next_monday_str = (today_dt + timedelta(days=days_to_monday)).strftime('%d/%m/%Y')

    VOICE_PROMPT = """You extract product info from a spoken sentence. Return ONLY raw JSON, no markdown.

Rules:
- "product_name": the item noun only (1-3 words). Remove verbs like will/expire/going to/expires/expiring.
- "expiry_date": as DD/MM/YYYY. Today = {today}. "tomorrow" = {tomorrow}. Relative dates use today as base.
- Do NOT include category in your response.

Examples:
- "milk will expire tomorrow" -> {{"product_name": "Milk", "expiry_date": "{tomorrow}"}}
- "milk expires tomorrow" -> {{"product_name": "Milk", "expiry_date": "{tomorrow}"}}
- "bread best before 15th March 2025" -> {{"product_name": "Bread", "expiry_date": "15/03/2025"}}
- "paracetamol use by next Monday" -> {{"product_name": "Paracetamol", "expiry_date": "{next_monday}"}}
- "orange juice expires in 3 months" -> {{"product_name": "Orange Juice", "expiry_date": null}}

Sentence: '{sentence}'"""

    try:
        if GEMINI_API_KEY:
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=GEMINI_API_KEY,
                temperature=0
            )
            prompt = PromptTemplate(
                input_variables=["sentence", "today", "tomorrow", "next_monday"],
                template=VOICE_PROMPT
            )
            chain = prompt | llm
            result = chain.invoke({
                "sentence": transcript,
                "today": today_str,
                "tomorrow": tomorrow_str,
                "next_monday": next_monday_str,
            })
            content = result.content if hasattr(result, 'content') else str(result)
            content = strip_markdown_fences(content)
            try:
                extracted = json.loads(content)

                # ── Clean product_name ────────────────────────────────────────
                name = extracted.get('product_name')
                if name and str(name) not in ('null', 'None', ''):
                    # Belt-and-suspenders: strip any verbs the LLM leaked through
                    filler = re.compile(
                        r'\b(will|would|shall|is|are|going|gone|expire[sd]?|expiring|'
                        r'khatam|ho jayega|kal|tomorrow|use by|best before|today|soon)\b.*',
                        re.IGNORECASE | re.DOTALL
                    )
                    name = filler.sub('', name).strip().title()
                    # Hard cap: 3 words max
                    name = ' '.join(name.split()[:3]) if name else None
                    extracted['product_name'] = name or None
                else:
                    extracted['product_name'] = None

                # ── Normalise expiry date ─────────────────────────────────────
                expiry_raw = extracted.get('expiry_date')
                if expiry_raw and str(expiry_raw) not in ('null', 'None', ''):
                    parsed_date = dateparser.parse(
                        str(expiry_raw),
                        settings={"PREFER_DAY_OF_MONTH": "last", "DATE_ORDER": "DMY",
                                  "RELATIVE_BASE": today_dt}
                    )
                    extracted['expiry_date'] = parsed_date.strftime('%d/%m/%Y') if parsed_date else None
                else:
                    extracted['expiry_date'] = None

                # ── Category via dedicated categorize_product() ───────────────
                # This is purpose-built and far more reliable than asking the
                # general voice-parse LLM to also guess category.
                if extracted.get('product_name'):
                    extracted['category'] = categorize_product(extracted['product_name'])
                else:
                    extracted['category'] = 'Other'

                print(f"[parse-voice] Final result: {extracted}")
                return extracted

            except Exception as parse_error:
                print(f"[parse-voice] JSON parse error. Raw: {content!r}. Error: {parse_error}")
                return {"error": "AI returned malformed response. Please try again."}
        else:
            return {"error": "Gemini API key not configured on server."}


    except Exception as e:
        print(f"[parse-voice] LLM call failed: {e}. Falling back to regex.")

        # ── Regex fallback ────────────────────────────────────────────────────
        expiry_date, product_name = None, None

        # Extended date patterns: ordinal, month-year, numeric, relative
        date_patterns = [
            r'\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}',
            r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}',
            r'\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}',
            r'(?:in\s+)?\d+\s+months?',
            r'(?:tomorrow|day after tomorrow|next\s+\w+)',
        ]
        for pat in date_patterns:
            m = re.search(pat, transcript, re.IGNORECASE)
            if m:
                expiry_date = m.group(0)
                break

        # Extract product name with smarter filtering
        # Try to find common verbs/expire markers
        markers = r'(?:is\s+)?(?:going\s+to\s+)?(?:expires?|expiring|expire|khatam|ho\s+jayega|best\s+before|use\s+by|will|expir)'
        prod_match = re.search(r'(?:(?:add|log|record|put|put\s+the)\s+)?(.*?)\s+' + markers, transcript, re.IGNORECASE)
        
        if prod_match:
            product_name = prod_match.group(1).strip()
            # Clean up leading 'the', 'a', 'an'
            product_name = re.sub(r'^(?:the|a|an)\s+', '', product_name, flags=re.IGNORECASE)
            # Clean up trailing filler verbs
            product_name = re.sub(r'\b(will|is|are|going|gone|shall|expires?|expiring)\b.*', '', product_name, flags=re.IGNORECASE | re.DOTALL).strip().title()
        
        if not product_name:
            # Last-ditch: first word if nothing else worked
            words = transcript.split()
            if words: product_name = words[0].title()

        # Parse and normalise the extracted date string
        if expiry_date:
            parsed = dateparser.parse(
                expiry_date,
                settings={"PREFER_DAY_OF_MONTH": "last", "DATE_ORDER": "DMY"}
            )
            expiry_date = parsed.strftime('%d/%m/%Y') if parsed else None

        if not product_name and not expiry_date:
            return {"error": "Could not understand the spoken input. Please try speaking clearly with product name and date.", "transcript": transcript}

        from utils import categorize_product
        category = categorize_product(product_name) if product_name else "Other"
        return {"product_name": product_name, "expiry_date": expiry_date, "category": category}