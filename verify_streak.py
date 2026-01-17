import requests
import json
import uuid
from datetime import datetime, timedelta, timezone

API_URL = "http://localhost:5000/api"

# Helper to manually update user in DB (simulating time travel)
# We'll use a direct DB connection or a special test endpoint if available.
# Since we don't have a test endpoint, we'll rely on the fact that we can't easily "time travel" the server.
# BUT, we can create a user, set their lastLogin/streak manually via a backdoor or just observe the current behavior.
# Actually, we can't easily mock the server time from outside.
# So we will check if the 'submit_challenge' endpoint returns any streak info or updates the user.

# Alternative: We can check the code. We already know it doesn't update.
# But to "prove" it, we can try to submit a challenge and see if the user's streak field changes at all (it shouldn't if it's 1).
# Wait, if I create a new user, streak is 1. If I submit a challenge, it stays 1.
# If I could "hack" the DB to set lastLogin to yesterday, then submit, it should become 2.

# Let's try to use the admin endpoint or just assume the failure based on code review.
# The user wants me to "check". Code review is a valid check.
# But I can write a script that attempts to submit and checks the user profile afterwards.

def test_streak_logic():
    print("\nTesting Streak Logic...")
    
    # 1. Signup
    random_id = str(uuid.uuid4())[:8]
    username = f"streak_test_{random_id}"
    payload = {
        "email": f"streak_{random_id}@example.com",
        "password": "password123",
        "name": "Streak Test",
        "username": username
    }
    
    res = requests.post(f"{API_URL}/auth/signup", json=payload)
    if res.status_code != 200:
        print("Signup failed")
        return
        
    token = res.json()["token"]
    user_id = res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"User created. Initial Streak: {res.json()['user']['streak']}")
    
    # 2. Get Daily Challenge
    res = requests.get(f"{API_URL}/challenges/daily", headers=headers)
    challenge_id = res.json()["id"]
    
    # 3. Submit Challenge
    print("Submitting challenge...")
    submit_payload = {"code": "def reverse_string(s): return s[::-1]"}
    res = requests.post(f"{API_URL}/challenges/{challenge_id}/submit", json=submit_payload, headers=headers)
    
    if res.status_code == 200:
        print("Challenge submitted successfully.")
        data = res.json()
        if "streak" in data:
            print(f"✅ Success: Submission response contains streak info: {data['streak']}")
        else:
            print("❌ Failure: Submission response MISSING streak info")
    else:
        print(f"Submission failed: {res.text}")
        
    # 4. Check User Profile for Streak Update
    # Since we are on the same day, streak should remain 1.
    # But we want to verify if the CODE even attempts to touch the streak.
    # We can't easily simulate "tomorrow" without DB access.
    
    res = requests.get(f"{API_URL}/auth/me", headers=headers)
    print(f"Current Streak: {res.json()['streak']}")
    
    print("\n⚠️  LIMITATION: Cannot verify 'tomorrow' scenario without mocking server time or DB access.")
    print("Based on code review: Streak is ONLY updated on /auth/login.")
    print("Conclusion: Solving a challenge DOES NOT currently update the streak.")

if __name__ == "__main__":
    test_streak_logic()
