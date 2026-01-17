import requests
import json
import uuid

API_URL = "http://localhost:5000/api"

def test_login():
    print("\nTesting Login...")
    
    # 1. Signup first
    random_id = str(uuid.uuid4())[:8]
    email = f"login_test_{random_id}@example.com"
    password = "password123"
    username = f"logintest_{random_id}"
    
    signup_payload = {
        "email": email,
        "password": password,
        "name": f"Login Test {random_id}",
        "username": username
    }
    
    try:
        print(f"Creating user {username}...")
        signup_res = requests.post(f"{API_URL}/auth/signup", json=signup_payload)
        if signup_res.status_code != 200:
            print(f"❌ Setup failed: Signup error ({signup_res.status_code})")
            print(signup_res.text)
            return

        # 2. Test Login
        print("Logging in...")
        login_payload = {
            "email": email,
            "password": password
        }
        
        login_res = requests.post(f"{API_URL}/auth/login", json=login_payload)
        
        if login_res.status_code == 200:
            data = login_res.json()
            print("✅ Login: Success")
            if "token" in data and "user" in data:
                 print("Structure check: OK")
            else:
                 print("Structure check: FAILED")
                 print(data.keys())
        else:
            print(f"❌ Login: Failed ({login_res.status_code})")
            print(login_res.text)
            
    except Exception as e:
        print(f"❌ Login Test: Error ({e})")

if __name__ == "__main__":
    test_login()
