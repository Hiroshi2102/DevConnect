import requests
import json
import os

API_URL = "http://localhost:5000/api"

def test_enhance():
    print("\nTesting Enhance Question...")
    
    try:
        # Login
        login_res = requests.post(f"{API_URL}/auth/login", json={"email": "test@example.com", "password": "password123"})
        token = login_res.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test Enhance
        payload = {
            "title": "help code broken",
            "description": "my python code is not working it says error"
        }
        
        res = requests.post(f"{API_URL}/ai/enhance-question", json=payload, headers=headers)
        
        if res.status_code == 200:
            data = res.json()
            print("✅ Enhance Question: Success")
            print(f"New Title: {data.get('title')}")
            print(f"New Description: {data.get('description')[:50]}...")
        else:
            print(f"❌ Enhance Question: Failed ({res.status_code})")
            print(res.text)
            
    except Exception as e:
        print(f"❌ Enhance Test: Error ({e})")

if __name__ == "__main__":
    test_enhance()
