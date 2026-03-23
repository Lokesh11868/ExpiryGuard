from pymongo import MongoClient
from config import MONGODB_URL

client = MongoClient(MONGODB_URL)
db = client.expiryguard
users_collection = db.users
products_collection = db.products
