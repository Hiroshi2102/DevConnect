import requests
import json
import uuid
import random

API_URL = "http://localhost:5000/api"

USERS = [
    {"name": "Alice Dev", "username": "alicedev", "email": "alice@example.com", "password": "password123"},
    {"name": "Bob Coder", "username": "bobcoder", "email": "bob@example.com", "password": "password123"},
    {"name": "Charlie JS", "username": "charliejs", "email": "charlie@example.com", "password": "password123"},
    {"name": "Diana Py", "username": "dianapy", "email": "diana@example.com", "password": "password123"},
    {"name": "Evan Go", "username": "evango", "email": "evan@example.com", "password": "password123"}
]

QUESTIONS = [
    {
        "title": "How to center a div in CSS?",
        "description": "I've been trying to center a div horizontally and vertically for hours. Flexbox seems complicated. Any easy ways?",
        "tags": ["css", "html", "web-dev"]
    },
    {
        "title": "Python list comprehension vs map()",
        "description": "Which one is faster and more pythonic? I see people using both but list comprehensions look cleaner.",
        "tags": ["python", "performance", "best-practices"]
    },
    {
        "title": "Understanding React useEffect dependency array",
        "description": "My useEffect is running in an infinite loop. What exactly should go into the dependency array?",
        "tags": ["react", "javascript", "hooks"]
    },
    {
        "title": "Docker container exits immediately",
        "description": "I'm trying to run a simple node app in docker but the container stops right after starting. Logs show nothing.",
        "tags": ["docker", "devops", "nodejs"]
    },
    {
        "title": "SQL Injection prevention in Node.js",
        "description": "What is the best library or method to prevent SQL injection when using raw SQL queries in Node?",
        "tags": ["security", "nodejs", "sql"]
    }
]

def seed_questions():
    print("\nSeeding Questions...")
    
    for i, user_data in enumerate(USERS):
        # 1. Signup (or login if exists)
        # Try signup first
        print(f"\nProcessing User: {user_data['username']}")
        
        # Add random suffix to avoid collisions if re-running script multiple times
        # Actually, user wants "new users", so let's append a random ID to username/email
        # to ensure they are always new.
        rand_id = str(uuid.uuid4())[:4]
        user_data["username"] += f"_{rand_id}"
        user_data["email"] = f"{rand_id}_{user_data['email']}"
        
        try:
            res = requests.post(f"{API_URL}/auth/signup", json=user_data)
            if res.status_code == 200:
                print("  Signup: Success")
                token = res.json()["token"]
            else:
                print(f"  Signup Failed: {res.status_code} - {res.text}")
                continue
                
            # 2. Post Question
            question_data = QUESTIONS[i]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Need to give user points first?
            # "Not enough points to ask a question (requires 1 point)"
            # Signup gives 0 points usually? Wait, let's check server.py
            # "points": 0, "rank": "Beginner"
            # But daily login gives 10 points.
            # Signup response includes dailyReward?
            # Let's check if signup awards initial points or if we need to "login" again.
            # Wait, login logic awards points. Signup creates user.
            # Does signup call login logic? No, it returns token directly.
            # But wait, `create_question` checks `user.get("points", 0) < 1`.
            # New users have 0 points.
            # So they CANNOT ask questions immediately.
            # We need to give them points.
            # We can use the daily login bonus by logging them in?
            # Or we can just assume the "daily login" logic runs on signup?
            # Checking server.py: signup does NOT call update_user_points or award daily login.
            # So we must LOGIN after signup to get the 10 points.
            
            print("  Logging in to get daily points...")
            login_payload = {"email": user_data["email"], "password": user_data["password"]}
            login_res = requests.post(f"{API_URL}/auth/login", json=login_payload)
            if login_res.status_code == 200:
                print("  Login: Success (Points awarded)")
                # Token from login is also valid
                token = login_res.json()["token"]
            else:
                print(f"  Login Failed: {login_res.status_code}")
                
            print(f"  Posting Question: {question_data['title']}")
            q_res = requests.post(f"{API_URL}/questions", json=question_data, headers=headers)
            
            if q_res.status_code == 200:
                print("  Question Posted: Success")
            else:
                print(f"  Question Post Failed: {q_res.status_code} - {q_res.text}")
                
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    seed_questions()
