import re, requests, sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from datetime import datetime
from config import EMAIL_USER, BREVO_API_KEY

def extract_product_info(text: str) -> dict:
    result = {"product_name": None, "expiry_date": None, "best_before_months": None}
    best_before_patterns = [
        r'(?:Best Before|Best before|BB|BBE)\s*(?:date)?\s*[:\-]?\s*(\d+)\s*(?:months?|mon|m)',
        r'(\d+)\s*(?:months?|mon|m)\s*(?:Best Before|Best before|BB|BBE)',
        r'(?:Use within|Use by|Consume within)\s*(\d+)\s*(?:months?|mon|m)',
    ]
    for pattern in best_before_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            result["best_before_months"] = matches[0]
            break
    expiry_patterns = [
        r'(?:EXP|EXPIRY|EXPIRES|EXPIRE|Best Before|Use By)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
        r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})',
        r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2})',
    ]
    for pattern in expiry_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            date_str = matches[0]
            try:
                date_formats = ['%d/%m/%Y', '%d/%m/%y', '%d-%m-%Y', '%d-%m-%y', '%m/%d/%Y']
                for fmt in date_formats:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        result["expiry_date"] = parsed_date.strftime('%d/%m/%Y')
                        break
                    except ValueError:
                        continue
                if result["expiry_date"]:
                    break
            except:
                continue
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if len(line) > 2 and len(line) < 60:
            if not re.search(r'\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}', line):
                skip_words = ['exp', 'expiry', 'expires', 'best', 'before', 'use', 'by']
                if not any(word in line.lower() for word in skip_words) and not line.isdigit():
                    result["product_name"] = line
                    break
    return result

def get_product_status(expiry_date: str) -> str:
    today = datetime.now().date()
    try:
        expiry = datetime.strptime(expiry_date, '%d/%m/%Y').date()
    except ValueError:
        return 'safe'
    days_diff = (expiry - today).days
    if days_diff < 0:
        return 'expired'
    elif days_diff <= 3:
        return 'near'
    else:
        return 'safe'

def local_log(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_line = f"[{timestamp}] [EmailService] {message}\n"
    print(log_line.strip())
    try:
        with open("scheduler_logs.txt", "a") as f:
            f.write(log_line)
    except:
        pass

def send_email_alert(user_email: str, products: list):
    local_log(f"Starting alert for {user_email} (Products: {len(products)})")
    if not BREVO_API_KEY:
        local_log("ERROR: BREVO_API_KEY not found in configuration.")
        return False
    
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
    
    try:
        time_mark = datetime.now().strftime('%H:%M:%S')
        subject = f"ExpiryGuard Update [{time_mark}] - Product Expiry Alert"

        # Separate products into Expired and Near Expiry
        expired_products_html = []
        near_expiry_products_html = []
        expired_products_text = []
        near_expiry_products_text = []
        today = datetime.now().date()

        for product in products:
            try:
                expiry_date = datetime.strptime(product['expiry_date'], '%d/%m/%Y').date()
                days_diff = (expiry_date - today).days
                name = product['product_name']
                if days_diff < 0:
                    expired_products_html.append(f"<li><strong>{name}</strong> (Expired)</li>")
                    expired_products_text.append(f"- {name} (Expired)")
                else:
                    near_expiry_products_html.append(f"<li><strong>{name}</strong> (Expires in {days_diff} days)</li>")
                    near_expiry_products_text.append(f"- {name} (Expires in {days_diff} days)")
            except (ValueError, KeyError):
                continue

        # Build Plain Text Body
        text_body = "The following products in your inventory need attention:\n\n"
        if expired_products_text:
            text_body += "EXPIRED PRODUCTS:\n" + "\n".join(expired_products_text) + "\n\n"
            text_body += "Waste Reduction Tip: Please remove these expired items.\n\n"
        if near_expiry_products_text:
            text_body += "NEAR EXPIRY:\n" + "\n".join(near_expiry_products_text) + "\n\n"
            text_body += "Recommendation: Please try to consume these items soon!\n\n"
        text_body += f"View your dashboard at: {FRONTEND_URL}\n"

        # Build HTML Body
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; border: 1px solid #ddd;">
                <h2 style="color: #d9534f;">ExpiryGuard Alert</h2>
                <p>The following products in your inventory need attention:</p>
        """

        if expired_products_html:
            html_body += f"""
                <h3 style="color: #d9534f;">Expired Products</h3>
                <ul>{"".join(expired_products_html)}</ul>
                <p style="color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 5px; border: 1px solid #ffeeba;">
                    <strong>Waste Reduction Tip:</strong> Please remove these expired items if they are no longer safe for consumption to keep your inventory clean.
                </p>
            """

        if near_expiry_products_html:
            html_body += f"""
                <h3 style="color: #0c5460;">Near Expiry</h3>
                <ul>{"".join(near_expiry_products_html)}</ul>
                <p style="color: #155724; background-color: #d4edda; padding: 10px; border-radius: 5px; border: 1px solid #c3e6cb;">
                    <strong>Recommendation:</strong> Please try to consume these items soon to prevent waste!
                </p>
            """

        html_body += f"""
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p>Check your full inventory and manage items on our website:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="{FRONTEND_URL}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Go to ExpiryGuard Dashboard</a>
                </div>
                <p style="font-size: 0.8em; color: #777;">Thank you for using ExpiryGuard to reduce food waste!</p>
            </div>
        </body>
        </html>
        """

        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": user_email}],
            sender={"email": EMAIL_USER, "name": "ExpiryGuard"},
            subject=subject,
            html_content=html_body,
            text_content=text_body
        )
        
        local_log("Sending email via Brevo API...")
        api_response = api_instance.send_transac_email(send_smtp_email)
        local_log(f"Brevo Response: {api_response}")
        local_log("Alert sent successfully via Brevo!")
        return True
    except ApiException as e:
        local_log(f"Brevo email sending failed: {e}")
        return False
    except Exception as e:
        local_log(f"An unexpected error occurred: {e}")
        return False

def get_product_from_open_facts(barcode):
    try:
        food_url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        food_response = requests.get(food_url, timeout=5)
        if food_response.status_code == 200:
            food_data = food_response.json()
            if food_data.get("status") == 1 and food_data.get("product"):
                product = food_data["product"]
                product_name = product.get("product_name", "")
                if product_name:
                    return {
                        "product_name": product_name,
                        "barcode": barcode,
                        "source": "openfoodfacts"
                    }
        beauty_url = f"https://world.openbeautyfacts.org/api/v0/product/{barcode}.json"
        beauty_response = requests.get(beauty_url, timeout=5)
        if beauty_response.status_code == 200:
            beauty_data = beauty_response.json()
            if beauty_data.get("status") == 1 and beauty_data.get("product"):
                product = beauty_data["product"]
                product_name = product.get("product_name", "")
                if product_name:
                    return {
                        "product_name": product_name,
                        "barcode": barcode,
                        "source": "openbeautyfacts"
                    }
    except Exception as e:
        print(f"API error: {e}")
    return None
def categorize_product(product_name: str) -> str:
    from config import GEMINI_API_KEY
    if not GEMINI_API_KEY or not product_name:
        return "Other"
    # Local dictionary for common items to ensure 100% accuracy and save API calls
    common_mapping = {
        "Dairy": ["milk", "curd", "yogurt", "paneer", "cheese", "butter", "cream", "dahi"],
        "Bakery": ["bread", "roti", "bun", "cake", "cookie", "biscuit", "pav"],
        "Meat": ["chicken", "mutton", "fish", "egg", "meat", "beef", "pork"],
        "Medicine": ["tablet", "syrup", "capsule", "medicine", "pill", "paracetamol"],
        "Drinks": ["water", "juice", "soda", "coke", "pepsi", "tea", "coffee", "beer", "wine"],
        "Vegetables": ["potato", "onion", "tomato", "carrot", "chilli", "ginger", "garlic"],
        "Fruits": ["apple", "banana", "orange", "mango", "grapes", "berry"],
        "Snacks": ["chips", "kurkure", "lays", "maggi", "noodles", "chocolate", "candy"]
    }
    
    clean_name = product_name.lower().strip()
    for cat, items in common_mapping.items():
        if any(item in clean_name for item in items):
            return cat

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=GEMINI_API_KEY, temperature=0)
        categories = "Dairy, Bakery, Meat, Medicine, Drinks, Vegetables, Fruits, Snacks, Other"
        prompt = f"Categorize this product name: '{product_name}'. Valid categories are: {categories}. Respond ONLY with the category name."
        result = llm.invoke(prompt)
        content = result.content.strip() if hasattr(result, 'content') else str(result).strip()
        # Clean up in case Gemini adds extra text
        for cat in categories.split(", "):
            if cat.lower() in content.lower():
                return cat
        return "Other"
    except Exception as e:
        print(f"Categorization error: {e}")
        return "Other"

def notifications_enabled(user_id=None) -> bool:
    """Check if notifications are enabled. 
    If user_id is provided, check the specific user's setting in the database.
    Otherwise, this is a legacy check and we'll default to True for the poller
    to filter by individual user settings."""
    from db import users_collection
    from bson import ObjectId
    if user_id:
        user = users_collection.find_one({"_id": ObjectId(user_id) if isinstance(user_id, str) else user_id})
        return user.get("notifications_enabled", True) if user else False
    return True
    return True
