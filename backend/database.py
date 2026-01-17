import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
# Assuming .env is in the same directory as this file (backend)
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "devconnect")

if not MONGO_URL:
    print("Warning: MONGO_URL not found in environment variables")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
