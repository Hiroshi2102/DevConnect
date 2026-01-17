import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
import bcrypt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "devconnect")

async def seed_questions():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Seeding users and questions...")
    
    # Define 5 new users
    users_data = [
        {
            "username": "alice_dev",
            "email": "alice@example.com",
            "name": "Alice Developer",
            "bio": "Full stack developer loving React and Node.js",
            "skills": ["React", "Node.js", "MongoDB"],
            "role": "user"
        },
        {
            "username": "bob_coder",
            "email": "bob@example.com",
            "name": "Bob Coder",
            "bio": "Python enthusiast and AI hobbyist",
            "skills": ["Python", "Django", "TensorFlow"],
            "role": "user"
        },
        {
            "username": "charlie_ops",
            "email": "charlie@example.com",
            "name": "Charlie Ops",
            "bio": "DevOps engineer, automating everything",
            "skills": ["Docker", "Kubernetes", "AWS"],
            "role": "user"
        },
        {
            "username": "diana_design",
            "email": "diana@example.com",
            "name": "Diana Designer",
            "bio": "UI/UX designer with a passion for accessibility",
            "skills": ["Figma", "CSS", "HTML"],
            "role": "user"
        },
        {
            "username": "ethan_security",
            "email": "ethan@example.com",
            "name": "Ethan Security",
            "bio": "Cybersecurity analyst and ethical hacker",
            "skills": ["Penetration Testing", "Network Security", "Cryptography"],
            "role": "user"
        }
    ]

    created_users = []

    for user_data in users_data:
        existing_user = await db.users.find_one({"email": user_data["email"]})
        if not existing_user:
            user_id = str(uuid.uuid4())
            hashed_password = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            new_user = {
                "id": user_id,
                "username": user_data["username"],
                "email": user_data["email"],
                "name": user_data["name"],
                "passwordHash": hashed_password,
                "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_data['username']}",
                "bio": user_data["bio"],
                "location": "Internet",
                "githubUrl": "",
                "linkedinUrl": "",
                "websiteUrl": "",
                "skills": user_data["skills"],
                "interests": [],
                "points": 100,
                "rank": "Beginner",
                "role": user_data["role"],
                "settings": {
                    "notifications": {"email": True, "push": True},
                    "privacy": {"profileVisible": True}
                },
                "lastLogin": datetime.now(timezone.utc).isoformat(),
                "streak": 0,
                "emailSettings": {"streakReminder": True, "newContent": True},
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            created_users.append(new_user)
            print(f"Created user: {user_data['username']}")
        else:
            created_users.append(existing_user)
            print(f"User already exists: {user_data['username']}")

    # Define questions for each user
    questions_data = [
        {
            "user_index": 0, # Alice
            "title": "Best practices for React state management in 2025?",
            "description": "I'm starting a new large-scale React application. Should I stick with Redux Toolkit, or are there better alternatives like Zustand or Jotai gaining more traction for enterprise apps?",
            "tags": ["react", "state-management", "javascript"]
        },
        {
            "user_index": 1, # Bob
            "title": "How to optimize Python code for data processing?",
            "description": "I have a script processing large CSV files that is running slow. What are some common techniques or libraries (like Pandas vs Polars) to speed up data manipulation in Python?",
            "tags": ["python", "performance", "data-science"]
        },
        {
            "user_index": 2, # Charlie
            "title": "Docker networking between containers not working",
            "description": "I have a frontend and backend container in the same docker-compose file, but the frontend can't reach the backend using the service name. What am I missing in the network configuration?",
            "tags": ["docker", "devops", "networking"]
        },
        {
            "user_index": 3, # Diana
            "title": "Accessible color contrast tools for designers",
            "description": "Can anyone recommend good tools or plugins for Figma that help ensure color combinations meet WCAG AA/AAA standards automatically?",
            "tags": ["design", "accessibility", "figma"]
        },
        {
            "user_index": 4, # Ethan
            "title": "Securing a REST API with JWT",
            "description": "What are the security best practices for storing JWTs on the client-side? HttpOnly cookies vs LocalStorage? And how to handle token rotation securely?",
            "tags": ["security", "jwt", "api"]
        }
    ]

    for q_data in questions_data:
        user = created_users[q_data["user_index"]]
        
        # Check if question already exists (simple check by title)
        existing_question = await db.questions.find_one({"title": q_data["title"], "userId": user["id"]})
        
        if not existing_question:
            question_id = str(uuid.uuid4())
            new_question = {
                "id": question_id,
                "userId": user["id"],
                "title": q_data["title"],
                "description": q_data["description"],
                "tags": q_data["tags"],
                "status": "open",
                "views": 0,
                "upvotes": [],
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }
            await db.questions.insert_one(new_question)
            print(f"Created question: '{q_data['title']}' by {user['username']}")
            
            # Also give the user the 'curious_mind' trophy progress if applicable (simplified, not running full logic here)
        else:
            print(f"Question already exists: '{q_data['title']}'")

    print("Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_questions())
