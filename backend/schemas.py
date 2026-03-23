from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    notification_time: Optional[dict] = None  # {'hour': int, 'minute': int}

class ProductCreate(BaseModel):
    product_name: str
    expiry_date: str
    category: Optional[str] = "Other"
    image_url: Optional[str] = None
    barcode: Optional[str] = None
