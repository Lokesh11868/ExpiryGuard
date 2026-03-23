import requests
import os, re, calendar, dateparser

OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "")

# Uses OCR.space API to extract text from image bytes

def extract_text_from_image(image_bytes):
    api_url = "https://api.ocr.space/parse/image"
    headers = {
        'apikey': OCR_SPACE_API_KEY
    }
    files = {
        'file': ('image.png', image_bytes)
    }
    data = {
        'language': 'eng',
        'isOverlayRequired': False,
        'OCREngine': 2
    }
    response = requests.post(api_url, headers=headers, files=files, data=data)
    try:
        result = response.json()
    except Exception:
        raise Exception("OCR.space did not return valid JSON. Check your API key and request. Response was: {}".format(response.text))
    if not isinstance(result, dict):
        raise Exception(f"OCR.space returned non-JSON response: {result}")
    if result.get('IsErroredOnProcessing'):
        raise Exception(str(result.get('ErrorMessage', 'OCR.space processing error')))
    parsed_results = result.get('ParsedResults')
    if parsed_results and len(parsed_results) > 0:
        return parsed_results[0].get('ParsedText', '')
    return ''

def extract_expiry_date_from_text(text):
    expiry_patterns = [
        r'(?:EXP|EXPIRY|EXPIRES|EXPIRE|Best Before|Use By)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
        r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})',
        r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2})',
        r'(\d{1,2}[\/\-\.]\d{4})',
        r'(\d{1,2}[\/\-\.]\d{2})',
        r'(\d{4})',
    ]
    for pattern in expiry_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for date_str in matches:
            if re.match(r'^(\d{1,2}[\/\-\.]\d{4})$', date_str):
                try:
                    month, year = re.split(r'[\/\-\.]', date_str)
                    month = int(month)
                    year = int(year)
                    if 1 <= month <= 12 and 2000 <= year <= 2100:
                        last_day = calendar.monthrange(year, month)[1]
                        return f"{last_day:02d}/{month:02d}/{year}"
                except: continue
            elif re.match(r'^(\d{1,2}[\/\-\.]\d{2})$', date_str):
                try:
                    month, year = re.split(r'[\/\-\.]', date_str)
                    month = int(month)
                    year = int(year)
                    year += 2000 if year < 100 else 0
                    if 1 <= month <= 12 and 2000 <= year <= 2100:
                        last_day = calendar.monthrange(year, month)[1]
                        return f"{last_day:02d}/{month:02d}/{year}"
                except: continue
            elif re.match(r'^(\d{4})$', date_str):
                try:
                    year = int(date_str)
                    if 2000 <= year <= 2100:
                        return f"31/12/{year}"
                except: continue
            try:
                parsed = dateparser.parse(date_str, settings={'DATE_ORDER': 'DMY'})
                if parsed:
                    return parsed.strftime('%d/%m/%Y')
            except: continue
    return None
