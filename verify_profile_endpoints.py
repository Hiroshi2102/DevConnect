import asyncio
import httpx

BASE_URL = "http://localhost:5000/api"

async def verify_user_content():
    async with httpx.AsyncClient() as client:
        # 1. Login to get a valid user (or just pick a known username)
        # For simplicity, let's assume 'hiroshi21' exists or we can use the user we created in previous tests
        # Let's try to fetch for a user we know exists or create one.
        # Actually, let's just list users and pick one.
        
        print("Fetching users...")
        resp = await client.get(f"{BASE_URL}/leaderboard")
        if resp.status_code != 200:
            print("Failed to fetch users")
            return
        
        users = resp.json()
        if not users:
            print("No users found")
            return
            
        username = users[0]["username"]
        print(f"Testing for user: {username}")
        
        # 2. Fetch User Posts
        print(f"\nFetching posts for {username}...")
        resp = await client.get(f"{BASE_URL}/users/{username}/posts")
        if resp.status_code == 200:
            posts = resp.json()
            print(f"Success! Found {len(posts)} posts.")
        else:
            print(f"Failed: {resp.status_code} - {resp.text}")

        # 3. Fetch User Questions
        print(f"\nFetching questions for {username}...")
        resp = await client.get(f"{BASE_URL}/users/{username}/questions")
        if resp.status_code == 200:
            questions = resp.json()
            print(f"Success! Found {len(questions)} questions.")
        else:
            print(f"Failed: {resp.status_code} - {resp.text}")

        # 4. Fetch User Answers
        print(f"\nFetching answers for {username}...")
        resp = await client.get(f"{BASE_URL}/users/{username}/answers")
        if resp.status_code == 200:
            answers = resp.json()
            print(f"Success! Found {len(answers)} answers.")
        else:
            print(f"Failed: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    asyncio.run(verify_user_content())
