import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "devconnect")

async def seed_tags():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Seeding posts with tags...")
    
    # Create a dummy user if not exists
    user = await db.users.find_one({"username": "tag_tester"})
    if not user:
        user_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": user_id,
            "username": "tag_tester",
            "email": "tag@test.com",
            "name": "Tag Tester",
            "passwordHash": "dummy",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "followingTags": []
        })
        print(f"Created user: tag_tester ({user_id})")
    else:
        user_id = user["id"]
        print(f"Using user: tag_tester ({user_id})")

    tags_to_seed = ["react", "javascript", "python", "webdev", "ai", "mongodb", "nodejs"]
    
    for i, tag in enumerate(tags_to_seed):
        # Create 3 posts for each tag
        for j in range(3):
            post = {
                "id": str(uuid.uuid4()),
                "title": f"Post about {tag} #{j+1}",
                "content": f"This is a test post about {tag}. It is very interesting.",
                "excerpt": f"Learn more about {tag}...",
                "authorId": user_id,
                "authorName": "Tag Tester",
                "tags": [tag, "tech"],
                "category": "Technology",
                "coverImage": f"https://source.unsplash.com/random/800x600?{tag}",
                "likes": [],
                "bookmarks": [],
                "views": 0,
                "published": True,
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }
            await db.posts.insert_one(post)
            print(f"Created post: {post['title']}")

    print("Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_tags())
