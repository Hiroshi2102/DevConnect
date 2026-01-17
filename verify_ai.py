import requests
import json
import os

API_URL = "http://localhost:5000/api"

def test_ai_chat():
    print("\nTesting AI Chat...")
    
    try:
        # Login
        login_res = requests.post(f"{API_URL}/auth/login", json={"email": "test@example.com", "password": "password123"})
        if login_res.status_code != 200:
             # Try creating a user if login fails
            requests.post(f"{API_URL}/auth/signup", json={"email": "test@example.com", "password": "password123", "name": "Test User", "username": "testuser"})
            login_res = requests.post(f"{API_URL}/auth/login", json={"email": "test@example.com", "password": "password123"})
            
        token = login_res.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test Chat
        payload = {
            "message": "Hello, are you working?",
            "context": "Testing AI chat"
        }
        
        res = requests.post(f"{API_URL}/ai/chat", json=payload, headers=headers)
        
        if res.status_code == 200:
            print("✅ AI Chat: Success")
            print("Response:", res.json().get("response"))
        else:
            print(f"❌ AI Chat: Failed ({res.status_code})")
            print(res.text)
            
    except Exception as e:
        print(f"❌ AI Chat Test: Error ({e})")

if __name__ == "__main__":
    test_ai_chat()
