import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from email_service import send_email

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def test():
    email = os.getenv("MAIL_USERNAME")
    if not email:
        print("❌ MAIL_USERNAME not found in .env")
        return

    print(f"Attempting to send test email to {email}...")
    
    success = await send_email(
        subject="DevConnect Email Test",
        recipients=[email],
        body="<h1>It Works!</h1><p>Your email configuration for DevConnect is correct.</p>"
    )
    
    if success:
        print("✅ Email sent successfully!")
    else:
        print("❌ Failed to send email. Check your credentials.")

if __name__ == "__main__":
    asyncio.run(test())
