import requests
import json
import uuid

API_URL = "http://localhost:5000/api"

def test_signup():
    print("\nTesting Signup...")
    
    # Generate random user to avoid conflict
    random_id = str(uuid.uuid4())[:8]
    payload = {
        "email": f"test_{random_id}@example.com",
        "password": "password123",
        "name": f"Test User {random_id}",
        "username": f"testuser_{random_id}"
    }
    
    try:
        res = requests.post(f"{API_URL}/auth/signup", json=payload)
        
        if res.status_code == 200:
            print("✅ Signup: Success")
            print(res.json())
        else:
            print(f"❌ Signup: Failed ({res.status_code})")
            print(res.text)
            
    except Exception as e:
        print(f"❌ Signup Test: Error ({e})")

if __name__ == "__main__":
    test_signup()
