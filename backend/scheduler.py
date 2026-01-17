from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone, timedelta
from database import db
from email_service import send_streak_reminder
import asyncio

scheduler = AsyncIOScheduler()

async def check_streaks():
    print("Checking streaks...")
    now = datetime.now(timezone.utc)
    today = now.date()
    
    # Find users with streak > 0 who haven't logged in today
    # We look for users whose lastLogin was yesterday (so they are at risk of missing today)
    # Actually, if they haven't logged in TODAY, they are at risk.
    # We want to remind them if it's getting late (e.g. run this at 6 PM) and they haven't logged in.
    
    # For simplicity, we'll just find anyone with streak > 0 whose lastLogin date < today
    # And who has email notifications enabled
    
    users = await db.users.find({
        "streak": {"$gt": 0},
        "emailSettings.streakReminder": True
    }).to_list(1000)
    
    for user in users:
        last_login_str = user.get("lastLogin")
        if last_login_str:
            last_login_date = datetime.fromisoformat(last_login_str).date()
            if last_login_date < today:
                # User hasn't logged in today yet
                print(f"Sending reminder to {user['username']}")
                await send_streak_reminder(user['email'], user['username'], user['streak'])

def start_scheduler():
    # Run check_streaks every day at 18:00 UTC (adjust as needed)
    # For testing, we can run it every minute or on startup
    # scheduler.add_job(check_streaks, 'cron', hour=18)
    
    # For demonstration/testing purposes, let's run it every hour
    scheduler.add_job(check_streaks, 'interval', hours=1)
    scheduler.start()
