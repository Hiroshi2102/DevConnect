import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def update_admin():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'devconnect')]
    
    admin_email = "admin@devconnect.com"
    result = await db.users.update_one(
        {"email": admin_email},
        {"$set": {"skills": [], "interests": []}}
    )
    print(f"Matched: {result.matched_count}, Modified: {result.modified_count}")
    client.close()

if __name__ == "__main__":
    asyncio.run(update_admin())
