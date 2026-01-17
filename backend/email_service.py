import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from typing import List
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "your_email@gmail.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "your_app_password"),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@devconnect.com"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_email(subject: str, recipients: List[EmailStr], body: str):
    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=body,
        subtype=MessageType.html
    )
    
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

async def send_streak_reminder(email: str, username: str, streak: int):
    subject = f"🔥 Don't lose your {streak} day streak on DevConnect!"
    body = f"""
    <html>
        <body>
            <h2>Hi {username},</h2>
            <p>You're on a <b>{streak} day streak</b>! Log in today to keep it going and earn bonus points.</p>
            <p>Don't break the chain! 🔗</p>
            <br>
            <a href="http://localhost:3000/login" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
        </body>
    </html>
    """
    await send_email(subject, [email], body)

async def send_new_content_notification(email: str, username: str, post_title: str, tags: List[str], post_id: str):
    subject = f"New post in #{tags[0]}: {post_title}"
    body = f"""
    <html>
        <body>
            <h2>Hi {username},</h2>
            <p>A new post matching your interests has been published:</p>
            <h3>{post_title}</h3>
            <p>Tags: {', '.join(['#'+t for t in tags])}</p>
            <br>
            <a href="http://localhost:3000/posts/{post_id}" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Read Post</a>
        </body>
    </html>
    """
    await send_email(subject, [email], body)

async def send_welcome_email(email: str, username: str):
    subject = "Welcome to DevConnect! 🚀"
    body = f"""
    <html>
        <body>
            <h2>Welcome to DevConnect, {username}!</h2>
            <p>We're thrilled to have you join our community of developers.</p>
            <p>Here are a few things you can do to get started:</p>
            <ul>
                <li><a href="http://localhost:3000/profile/edit">Complete your profile</a></li>
                <li><a href="http://localhost:3000/feed">Explore the feed</a></li>
                <li><a href="http://localhost:3000/create/post">Share your knowledge</a></li>
            </ul>
            <p>Happy coding!</p>
            <p>The DevConnect Team</p>
        </body>
    </html>
    """
    await send_email(subject, [email], body)

async def send_new_follower_email(email: str, username: str, follower_name: str):
    subject = f"{follower_name} started following you on DevConnect"
    body = f"""
    <html>
        <body>
            <h2>Hi {username},</h2>
            <p><b>{follower_name}</b> just started following you!</p>
            <p>Check out their profile to see what they're working on.</p>
            <br>
            <a href="http://localhost:3000/profile/{follower_name}" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Profile</a>
        </body>
    </html>
    """
    await send_email(subject, [email], body)
