import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:5000/api"

async def test_questions_api():
    async with httpx.AsyncClient() as client:
        # 1. Login to get token
        print("Logging in...")
        try:
            resp = await client.post(f"{BASE_URL}/auth/login", json={
                "email": "alice@example.com",
                "password": "password123"
            })
            if resp.status_code != 200:
                print(f"Login failed: {resp.text}")
                return
            data = resp.json()
            token = data["token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("Login successful!")
        except Exception as e:
            print(f"Connection failed: {e}")
            return

        # 2. Get Questions
        print("\nFetching questions...")
        resp = await client.get(f"{BASE_URL}/questions", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to fetch questions: {resp.text}")
            return
        questions = resp.json()
        print(f"Fetched {len(questions)} questions.")
        if not questions:
            print("No questions found to test details.")
            return
        question_id = questions[0]["id"]

        # 3. Get Question Details
        print(f"\nFetching details for question {question_id}...")
        resp = await client.get(f"{BASE_URL}/questions/{question_id}", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to fetch question details: {resp.text}")
        else:
            q_detail = resp.json()
            print(f"Question Title: {q_detail['title']}")

        # 4. Upvote Question
        print(f"\nUpvoting question {question_id}...")
        resp = await client.post(f"{BASE_URL}/questions/{question_id}/upvote", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to upvote: {resp.text}")
        else:
            data = resp.json()
            print(f"Upvote successful! New upvote count: {len(data.get('upvotes', []))}")

        # 5. Post Answer
        print("\nPosting an answer...")
        answer_content = "This is a test answer from the verification script."
        resp = await client.post(f"{BASE_URL}/answers", headers=headers, json={
            "questionId": question_id,
            "content": answer_content
        })
        if resp.status_code != 200:
            print(f"Failed to post answer: {resp.text}")
            return
        answer = resp.json()
        answer_id = answer["id"]
        print(f"Answer posted! ID: {answer_id}")

        # 6. Get Answers
        print(f"\nFetching answers for question {question_id}...")
        resp = await client.get(f"{BASE_URL}/questions/{question_id}/answers", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to fetch answers: {resp.text}")
        else:
            answers = resp.json()
            print(f"Fetched {len(answers)} answers.")

        # 7. Upvote Answer
        print(f"\nUpvoting answer {answer_id}...")
        resp = await client.post(f"{BASE_URL}/answers/{answer_id}/upvote", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to upvote answer: {resp.text}")
        else:
            print("Answer upvote successful!")

        # 8. Create Comment
        print("\nCreating a comment on the answer...")
        comment_content = "This is a test comment."
        resp = await client.post(f"{BASE_URL}/comments", headers=headers, json={
            "content": comment_content,
            "answerId": answer_id
        })
        if resp.status_code != 200:
            print(f"Failed to create comment: {resp.text}")
            return
        comment = resp.json()
        comment_id = comment["id"]
        print(f"Comment created! ID: {comment_id}")

        # 9. Create Nested Reply
        print("\nCreating a nested reply...")
        reply_content = "This is a nested reply."
        resp = await client.post(f"{BASE_URL}/comments", headers=headers, json={
            "content": reply_content,
            "answerId": answer_id,
            "parentId": comment_id
        })
        if resp.status_code != 200:
            print(f"Failed to create reply: {resp.text}")
        else:
            reply = resp.json()
            print(f"Reply created! ID: {reply['id']}")

        # 10. Fetch Comments
        print(f"\nFetching comments for answer {answer_id}...")
        resp = await client.get(f"{BASE_URL}/answers/{answer_id}/comments", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to fetch comments: {resp.text}")
        else:
            comments = resp.json()
            print(f"Fetched {len(comments)} comments.")
            # Verify nesting structure (flat list returned, frontend handles nesting)
            parent_comment = next((c for c in comments if c["id"] == comment_id), None)
            nested_reply = next((c for c in comments if c["parentId"] == comment_id), None)
            
            if parent_comment and nested_reply:
                print("Verified: Parent comment and nested reply found.")
            else:
                print("Verification Failed: Could not find parent or nested reply.")

        print("\nVerification complete!")

if __name__ == "__main__":
    asyncio.run(test_questions_api())
