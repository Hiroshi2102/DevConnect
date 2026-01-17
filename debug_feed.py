import requests
import json

API_URL = "http://localhost:5000/api"

def debug_feed():
    print("\nDebugging Feed Endpoint...")
    
    try:
        # Login
        login_res = requests.post(f"{API_URL}/auth/login", json={"email": "test@example.com", "password": "password123"})
        if login_res.status_code != 200:
             # Try creating a user if login fails
            requests.post(f"{API_URL}/auth/signup", json={"email": "test@example.com", "password": "password123", "name": "Test User", "username": "testuser"})
            login_res = requests.post(f"{API_URL}/auth/login", json={"email": "test@example.com", "password": "password123"})
            
        token = login_res.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get Feed
        res = requests.get(f"{API_URL}/posts/feed?limit=20", headers=headers)
        
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            print(f"Response Type: {type(data)}")
            if isinstance(data, list):
                print(f"Item Count: {len(data)}")
                if len(data) > 0:
                    print("First Item Keys:", data[0].keys())
                    print("First Item Tags:", data[0].get('tags'))
            else:
                print("Response is NOT a list:", data)
        else:
            print("Error Response:", res.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_feed()
