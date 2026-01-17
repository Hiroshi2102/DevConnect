import requests
import json
import time

API_URL = "http://localhost:5000/api"

def test_daily_challenge():
    print("\nTesting Daily Coding Challenge...")
    
    try:
        # Login to get token
        login_res = requests.post(f"{API_URL}/auth/login", json={"email": "test@example.com", "password": "password123"})
        if login_res.status_code != 200:
             # Try creating a user if login fails
            requests.post(f"{API_URL}/auth/signup", json={"email": "test@example.com", "password": "password123", "name": "Test User", "username": "testuser"})
            login_res = requests.post(f"{API_URL}/auth/login", json={"email": "test@example.com", "password": "password123"})
            
        token = login_res.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Get Daily Challenge
        res = requests.get(f"{API_URL}/challenges/daily", headers=headers)
        if res.status_code == 200:
            challenge = res.json()
            print(f"✅ Get Challenge: Success (ID: {challenge['id']}, Title: {challenge['title']})")
            
            # 2. Submit Correct Solution
            # The mock challenge is "Reverse a String"
            # Correct code:
            correct_code = """
def reverse_string(s):
    return s[::-1]
"""
            submit_res = requests.post(
                f"{API_URL}/challenges/{challenge['id']}/submit", 
                json={"code": correct_code},
                headers=headers
            )
            
            if submit_res.status_code == 200:
                result = submit_res.json()
                if result["success"]:
                    print(f"✅ Submit Correct Solution: Success (+{result['points']} points)")
                else:
                    print(f"❌ Submit Correct Solution: Failed ({result['message']})")
            else:
                print(f"❌ Submit Correct Solution: Error ({submit_res.status_code})")
                
            # 3. Submit Incorrect Solution with a NEW user (to avoid "already solved" message)
            print("\nTesting Incorrect Solution with new user...")
            requests.post(f"{API_URL}/auth/signup", json={"email": "test2@example.com", "password": "password123", "name": "Test User 2", "username": "testuser2"})
            login_res2 = requests.post(f"{API_URL}/auth/login", json={"email": "test2@example.com", "password": "password123"})
            token2 = login_res2.json().get("token")
            headers2 = {"Authorization": f"Bearer {token2}"}

            incorrect_code = """
def reverse_string(s):
    return s # Wrong
"""
            submit_res_wrong = requests.post(
                f"{API_URL}/challenges/{challenge['id']}/submit", 
                json={"code": incorrect_code},
                headers=headers2
            )
             
            if submit_res_wrong.status_code == 200:
                result = submit_res_wrong.json()
                if not result["success"]:
                    print(f"✅ Submit Incorrect Solution: Success (Correctly identified as failed: {result['message']})")
                else:
                    print(f"❌ Submit Incorrect Solution: Failed (Incorrectly marked as success: {result['message']})")
            
        else:
            print(f"❌ Get Challenge: Failed ({res.status_code})")
            
    except Exception as e:
        print(f"❌ Daily Challenge Test: Error ({e})")

if __name__ == "__main__":
    test_daily_challenge()
