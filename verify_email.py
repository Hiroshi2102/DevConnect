import asyncio
import os
from dotenv import load_dotenv
from backend.email_service import send_email

# Load env vars
load_dotenv("backend/.env")

async def test_email():
    print("Testing email sending...")
    email = os.getenv("MAIL_USERNAME")
    if not email:
        print("❌ No MAIL_USERNAME found in .env")
        return

    print(f"Sending test email to {email}...")
    
    subject = "DevConnect Email Test"
    body = "<h1>It works!</h1><p>This is a test email from DevConnect verification script.</p>"
    
    success = await send_email(subject, [email], body)
    
    if success:
        print("✅ Email sent successfully!")
    else:
        print("❌ Failed to send email.")

if __name__ == "__main__":
    asyncio.run(test_email())
