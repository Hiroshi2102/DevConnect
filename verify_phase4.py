import requests
import json
import os

API_URL = "http://localhost:5000/api"

# 1. Test Smart Question Enhancement
def test_enhance_question():
    print("\nTesting Smart Question Enhancement...")
    # Mocking the AI response or assuming the server handles it
    # Note: This requires GROQ_API_KEY to be set in the server environment
    
    # We can't easily mock the external API call from here without a key, 
    # but we can check if the endpoint exists and returns 401/503 or success.
    
    payload = {
        "title": "help react",
        "description": "code not working"
    }
    
    try:
        # We need a token for this endpoint? The code says: user_id: str = Depends(get_current_user)
        # So we need to login first.
        
        # Login
        login_res = requests.post(f"{API_URL}/auth/login", json={"email": "test@example.com", "password": "password123"})
        if login_res.status_code != 200:
            # Try creating a user if login fails
            requests.post(f"{API_URL}/auth/signup", json={"email": "test@example.com", "password": "password123", "name": "Test User", "username": "testuser"})
            login_res = requests.post(f"{API_URL}/auth/login", json={"email": "test@example.com", "password": "password123"})
            
        token = login_res.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{API_URL}/ai/enhance-question", json=payload, headers=headers)
        
        if response.status_code == 200:
            print("✅ Enhance Question Endpoint: Success")
            print("Response:", response.json())
        elif response.status_code == 503:
            print("⚠️ Enhance Question Endpoint: Service Unavailable (Likely missing API Key)")
        else:
            print(f"❌ Enhance Question Endpoint: Failed ({response.status_code})")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Enhance Question Endpoint: Error ({e})")

# 2. Test Profile View Counter
def test_profile_view_count():
    print("\nTesting Profile View Counter...")
    username = "testuser"
    
    try:
        # Get initial views
        res1 = requests.get(f"{API_URL}/users/{username}")
        if res1.status_code != 200:
             print(f"❌ Failed to get user {username}")
             return

        views_initial = res1.json().get("profileViews", 0)
        print(f"Initial Views: {views_initial}")
        
        # Request again to increment
        res2 = requests.get(f"{API_URL}/users/{username}")
        views_after = res2.json().get("profileViews", 0)
        print(f"Views After: {views_after}")
        
        if views_after > views_initial:
            print("✅ Profile View Counter: Success (Incremented)")
        else:
            print("❌ Profile View Counter: Failed (Did not increment)")
            
    except Exception as e:
        print(f"❌ Profile View Counter: Error ({e})")

if __name__ == "__main__":
    test_enhance_question()
    test_profile_view_count()
