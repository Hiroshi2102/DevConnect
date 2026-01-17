from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, WebSocket, WebSocketDisconnect, Query, BackgroundTasks, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import socketio
import httpx
import json

import cloudinary
import cloudinary.uploader
import base64
# Try new google.genai package first, fallback to deprecated google.generativeai
try:
    import google.genai as genai
    GENAI_PACKAGE = "new"
except ImportError:
    genai = None
    GENAI_PACKAGE = None

try:
    from groq import Groq
except ImportError:
    Groq = None
    logging.warning("Groq package not found")

ROOT_DIR = Path(__file__).parent
# from backend.scheduler import start_scheduler # Moved to top
# from backend.email_service import send_new_content_notification # Moved to top

# Load environment variables
load_dotenv(ROOT_DIR / '.env') # Kept original path for consistency

from scheduler import start_scheduler
from email_service import send_new_content_notification, send_welcome_email, send_new_follower_email
from database import db

# Initialize MongoDB
# client and db are now imported from backend.database


# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 72

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', 'democloud'),
    api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET', '')
)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logging.info("Application startup - MongoDB connected")
    await seed_admin_user()
    start_scheduler() # Initialize scheduler
    yield
    # Shutdown
    logging.info("Application shutdown - closing MongoDB connection")
    client.close()

async def seed_admin_user():
    admin_email = "admin@devconnect.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    
    if not existing_admin:
        hashed_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "username": "admin",
            "name": "Admin User",
            "passwordHash": hashed_password.decode('utf-8'),
            "role": "admin",
            "points": 9999,
            "rank": "Admin",
            "skills": [],
            "interests": [],
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logging.info("Admin user created successfully")
    else:
        # Ensure role is admin
        if existing_admin.get("role") != "admin":
            await db.users.update_one({"email": admin_email}, {"$set": {"role": "admin"}})
            logging.info("Updated existing admin user role")

# Create FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Mount uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

socket_app = socketio.ASGIApp(sio, app)

# Store active connections
active_connections: Dict[str, str] = {}  # user_id: sid

# ====================
# Models
# ====================

class UserBase(BaseModel):
    email: EmailStr
    username: str
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    name: str
    avatar: Optional[str] = None
    bio: Optional[str] = ""
    location: Optional[str] = ""
    githubUrl: Optional[str] = ""
    linkedinUrl: Optional[str] = ""
    websiteUrl: Optional[str] = ""
    skills: List[str] = []
    interests: List[str] = []
    followers: List[str] = []
    followers: List[str] = []
    following: List[str] = []
    followingTags: List[str] = []
    points: int = 0
    rank: str = "Beginner"
    role: str = "user"
    settings: Optional[Dict[str, Any]] = None
    lastLogin: Optional[str] = None
    streak: int = 0
    emailSettings: Optional[Dict[str, bool]] = None
    badges: List[str] = []
    createdAt: str
    updatedAt: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    githubUrl: Optional[str] = None
    linkedinUrl: Optional[str] = None
    websiteUrl: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    followingTags: Optional[List[str]] = None

class PostBase(BaseModel):
    title: str
    content: str
    excerpt: Optional[str] = None
    coverImage: Optional[str] = None
    category: str
    tags: List[str] = []

class PostCreate(PostBase):
    published: Optional[bool] = True

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    authorId: str
    title: str
    content: str
    excerpt: Optional[str]
    coverImage: Optional[str] = None
    category: str
    tags: List[str] = []
    likes: List[str] = []
    bookmarks: List[str] = []
    views: int = 0
    commentsCount: int = 0
    published: bool = True
    createdAt: str
    updatedAt: str

class Challenge(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    points: int
    testCases: List[Dict[str, str]]
    starterCode: str
    date: str
    solvedBy: List[str] = []

class Solution(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    challengeId: str
    userId: str
    username: str
    code: str
    language: str
    votes: List[str] = []
    createdAt: str

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    authorId: str
    authorName: str
    techStack: List[str]
    status: str = "open"
    members: List[str] = []
    roles: Dict[str, str] = {}
    tasks: List[Dict[str, Any]] = []
    files: List[Dict[str, Any]] = []
    createdAt: str
    updatedAt: str

class ProjectCreate(BaseModel):
    title: str
    description: str
    techStack: List[str]
    status: str = "open"

class TutorialStep(BaseModel):
    id: str
    title: str
    content: str
    code: str = ""
    test: str = ""
    quiz: Optional[Dict[str, Any]] = None

class Tutorial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    steps: List[TutorialStep]
    category: str
    difficulty: str
    createdAt: str

class QuestionBase(BaseModel):
    title: str
    description: str
    tags: List[str] = []

class QuestionCreate(QuestionBase):
    pass

class Question(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    userId: str
    title: str
    description: str
    tags: List[str]
    status: str = "open"
    tags: List[str]
    status: str = "open"
    views: int = 0
    upvotes: List[str] = []
    createdAt: str
    updatedAt: str

class AnswerBase(BaseModel):
    content: str

class AnswerCreate(AnswerBase):
    questionId: str

class Answer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    questionId: str
    userId: str
    content: str
    isAccepted: bool = False
    pointsAwarded: int = 0
    upvotes: List[str] = []
    createdAt: str
    updatedAt: str

class CommentCreate(BaseModel):
    content: str
    postId: Optional[str] = None
    answerId: Optional[str] = None
    parentId: Optional[str] = None

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    userId: str
    content: str
    postId: Optional[str]
    answerId: Optional[str]
    parentId: Optional[str] = None
    upvotes: List[str] = []
    createdAt: str

class Trophy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    userId: str
    type: str
    title: str
    description: str
    icon: str
    points: int
    earnedAt: str

class ConversationCreate(BaseModel):
    name: Optional[str] = None  # Group name (optional for 1:1 chats)
    participants: List[str]  # User IDs
    isGroup: bool = False
    avatar: Optional[str] = None

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: Optional[str] = None
    participants: List[str]  # User IDs
    admins: List[str] = []  # User IDs with admin rights
    isGroup: bool
    avatar: Optional[str] = None
    createdBy: str
    lastMessage: Optional[Dict[str, Any]] = None
    createdAt: str
    updatedAt: str

class MessageAttachment(BaseModel):
    filename: str
    url: str
    size: int
    type: str  # mime type

class MessageCreate(BaseModel):
    conversationId: Optional[str] = None  # New: conversation-based
    receiverId: Optional[str] = None  # Keep for backward compatibility
    content: str
    projectId: Optional[str] = None
    projectTitle: Optional[str] = None
    attachments: List[MessageAttachment] = []

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    senderId: str
    conversationId: Optional[str] = None  # New field
    receiverId: Optional[str] = None  # Deprecated but kept
    content: str
    projectId: Optional[str] = None
    projectTitle: Optional[str] = None
    attachments: List[Dict[str, Any]] = []
    read: bool = False
    createdAt: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    userId: str
    type: str
    message: str
    link: Optional[str] = None
    read: bool = False
    createdAt: str

class ReportCreate(BaseModel):
    targetId: str
    targetType: str # post, question, answer, comment, user
    reason: str
    description: Optional[str] = None

class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    reporterId: str
    targetId: str
    targetType: str
    reason: str
    description: Optional[str] = None
    status: str = "pending" # pending, resolved, dismissed
    createdAt: str
    updatedAt: str

class Activity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    userId: str
    type: str
    metadata: Dict[str, Any]
    createdAt: str

class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None

class UserSettings(BaseModel):
    notifications: Optional[Dict[str, Any]] = None
    privacy: Optional[Dict[str, Any]] = None

class ChangePassword(BaseModel):
    currentPassword: str
    newPassword: str

class SavedSearchCreate(BaseModel):
    name: str
    query: str  # JSON string of filters

class SavedSearch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    userId: str
    name: str
    query: str
    createdAt: str

# ====================
# Helper Functions
# ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    return decode_jwt_token(token)

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
    if not credentials:
        return None
    try:
        token = credentials.credentials
        return decode_jwt_token(token)
    except Exception:
        return None

async def get_current_admin_user(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return user

RANKS = {
    "Beginner": {"min": 0, "max": 499},
    "Intermediate": {"min": 500, "max": 1999},
    "Pro": {"min": 2000, "max": 4999},
    "Expert": {"min": 5000, "max": 9999},
    "Legend": {"min": 10000, "max": float('inf')}
}

def calculate_rank(points: int) -> str:
    for rank, range_vals in RANKS.items():
        if range_vals["min"] <= points <= range_vals["max"]:
            return rank
    return "Beginner"

async def update_user_points(user_id: str, points_change: int, action_type: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    
    new_points = max(0, user.get("points", 0) + points_change)
    new_rank = calculate_rank(new_points)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"points": new_points, "rank": new_rank, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create activity
    activity = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "type": action_type,
        "metadata": {"points": points_change, "newTotal": new_points, "newRank": new_rank},
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.activities.insert_one(activity)
    
    # Check for trophies
    await check_and_award_trophies(user_id)

TROPHY_DEFINITIONS = {
    "curious_mind": {
        "title": "Curious Mind",
        "description": "Asked 10 questions",
        "icon": "🤔",
        "points": 50
    },
    "mentor": {
        "title": "Mentor",
        "description": "20 helpful answers",
        "icon": "🎓",
        "points": 200
    },
    "rising_dev": {
        "title": "Rising Developer",
        "description": "10 posts with 50+ likes",
        "icon": "⭐",
        "points": 300
    },
    "community_hero": {
        "title": "Community Hero",
        "description": "100 comments posted",
        "icon": "💬",
        "points": 150
    },
    "top_contributor": {
        "title": "Top Contributor",
        "description": "Reached Legend rank",
        "icon": "🏆",
        "points": 1000
    }
}

async def check_and_award_trophies(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    
    existing_trophies = await db.trophies.find({"userId": user_id}).to_list(1000)
    existing_types = {t["type"] for t in existing_trophies}
    
    # Check curious_mind
    if "curious_mind" not in existing_types:
        question_count = await db.questions.count_documents({"userId": user_id})
        if question_count >= 10:
            await award_trophy(user_id, "curious_mind")
    
    # Check mentor
    if "mentor" not in existing_types:
        helpful_count = await db.answers.count_documents({"userId": user_id, "pointsAwarded": 100})
        if helpful_count >= 20:
            await award_trophy(user_id, "mentor")
    
    # Check rising_dev
    if "rising_dev" not in existing_types:
        popular_posts = await db.posts.count_documents({
            "authorId": user_id,
            "$expr": {"$gte": [{"$size": "$likes"}, 50]}
        })
        if popular_posts >= 10:
            await award_trophy(user_id, "rising_dev")
    
    # Check community_hero
    if "community_hero" not in existing_types:
        comment_count = await db.comments.count_documents({"userId": user_id})
        if comment_count >= 100:
            await award_trophy(user_id, "community_hero")
    
    # Check top_contributor
    if "top_contributor" not in existing_types:
        if user.get("rank") == "Legend":
            await award_trophy(user_id, "top_contributor")

async def award_trophy(user_id: str, trophy_type: str):
    trophy_def = TROPHY_DEFINITIONS.get(trophy_type)
    if not trophy_def:
        return
    
    trophy = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "type": trophy_type,
        "title": trophy_def["title"],
        "description": trophy_def["description"],
        "icon": trophy_def["icon"],
        "points": trophy_def["points"],
        "earnedAt": datetime.now(timezone.utc).isoformat()
    }
    await db.trophies.insert_one(trophy)
    
    # Create notification
    notification = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "type": "trophy_earned",
        "message": f"🎉 You earned the {trophy_def['title']} trophy!",
        "link": f"/profile/{user_id}",
        "read": False,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Emit socket event
    if user_id in active_connections:
        await sio.emit('new_notification', notification, room=active_connections[user_id])

async def check_and_award_badges(user_id: str, action: str):
    """
    Check if user qualifies for any badges based on the action.
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        return

    current_badges = user.get("badges", [])
    new_badges = []

    if action == "create_post":
        # Check for first_post
        if "first_post" not in current_badges:
            post_count = await db.posts.count_documents({"authorId": user_id})
            if post_count >= 1:
                new_badges.append("first_post")

    elif action == "like_received":
        # Check for popular_writer
        if "popular_writer" not in current_badges:
            # Aggregate total likes
            pipeline = [
                {"$match": {"authorId": user_id}},
                {"$project": {"likesCount": {"$size": "$likes"}}},
                {"$group": {"_id": None, "totalLikes": {"$sum": "$likesCount"}}}
            ]
            result = await db.posts.aggregate(pipeline).to_list(1)
            total_likes = result[0]["totalLikes"] if result else 0
            
            if total_likes >= 100:
                new_badges.append("popular_writer")

    elif action == "create_answer":
        # Check for helper
        if "helper" not in current_badges:
            # This is tricky as we don't have an answers collection, answers are embedded in questions
            # We can count questions where answers.authorId == user_id
            pipeline = [
                {"$match": {"answers.authorId": user_id}},
                {"$count": "answerCount"}
            ]
            result = await db.questions.aggregate(pipeline).to_list(1)
            answer_count = result[0]["answerCount"] if result else 0
            
            if answer_count >= 10:
                new_badges.append("helper")
                
    elif action == "login":
        # Check for streak_master
        if "streak_master" not in current_badges:
            if user.get("streak", 0) >= 7:
                new_badges.append("streak_master")

    if new_badges:
        await db.users.update_one(
            {"id": user_id},
            {"$addToSet": {"badges": {"$each": new_badges}}}
        )
        # Ideally notify user here via socket or notification system

# ====================
# Helper Functions - User
# ====================

async def update_user_streak(user_id: str, user_data: Dict[str, Any] = None) -> Dict[str, Any]:
    if not user_data:
        user_data = await db.users.find_one({"id": user_id})
        
    now = datetime.now(timezone.utc)
    today = now.date()
    last_login_str = user_data.get("lastLogin")
    streak = user_data.get("streak", 0)
    points_awarded = 0
    
    if last_login_str:
        last_login_date = datetime.fromisoformat(last_login_str).date()
        delta = (today - last_login_date).days
        
        if delta == 1:
            # Consecutive day
            streak += 1
            points_awarded = 10 + (streak * 2)
            await update_user_points(user_id, points_awarded, "daily_streak")
        elif delta > 1:
            # Streak broken
            streak = 1
            points_awarded = 10
            await update_user_points(user_id, points_awarded, "daily_login")
        # If delta == 0, same day, do nothing
    else:
        # First time (or migration)
        streak = 1
        points_awarded = 10
        await update_user_points(user_id, points_awarded, "daily_login")
        
    # Check for badges
    await check_and_award_badges(user_id, "streak")
        
    # Update user stats
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "lastLogin": now.isoformat(),
                "streak": streak
            }
        }
    )
    
    return {
        "streak": streak,
        "points_awarded": points_awarded
    }

# ====================
# Routes - Authentication
# ====================

class AuthResponse(BaseModel):
    token: str
    user: User
    dailyReward: Optional[Dict[str, Any]] = None

@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(user_data: UserCreate, background_tasks: BackgroundTasks):
    # Check if user exists
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": user_data.username}):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "username": user_data.username,
        "name": user_data.name,
        "passwordHash": hashed_password,
        "avatar": None,
        "bio": None,
        "location": None,
        "githubUrl": None,
        "linkedinUrl": None,
        "websiteUrl": None,
        "skills": [],
        "interests": [],
        "points": 0,
        "rank": "Beginner",
        "role": "user",
        "settings": {
            "notifications": {
                "email": True,
                "push": True,
                "weeklyDigest": False
            },
            "privacy": {
                "profileVisible": True,
                "showActivity": True,
                "showEmail": False
            }
        },
        "lastLogin": datetime.now(timezone.utc).isoformat(),
        "streak": 1,
        "emailSettings": {"streakReminder": True, "newContent": True},
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    token = create_jwt_token(user["id"])
    
    # Send welcome email
    background_tasks.add_task(send_welcome_email, user["email"], user["username"])
    
    user_copy = user.copy()
    del user_copy["passwordHash"]
    del user_copy["_id"]
    
    return {"token": token, "user": user_copy}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["id"])
    
    # Daily Streak Logic
    now = datetime.now(timezone.utc) # Keep now definition for user_copy update
    streak_info = await update_user_streak(user["id"], user)
    streak = streak_info["streak"]
    points_awarded = streak_info["points_awarded"]
    
    # Check for badges
    await check_and_award_badges(user["id"], "login")
        
    # Update user stats (this part is now handled by update_user_streak, but we need to update user_copy)
    # The original code had a db.users.update_one here, which update_user_streak should now handle.
    # We only need to ensure user_copy reflects the latest state.
    
    user_copy = user.copy()
    user_copy["streak"] = streak
    user_copy["lastLogin"] = now.isoformat()
    del user_copy["passwordHash"]
    del user_copy["_id"]
    
    return {
        "token": token, 
        "user": user_copy,
        "dailyReward": {
            "awarded": points_awarded > 0,
            "points": points_awarded,
            "streak": streak
        }
    }

@api_router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "passwordHash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ====================
# Routes - Users
# ====================

@api_router.get("/users/{username}")
async def get_user_profile(username: str, request: Request):
    user = await db.users.find_one({"username": username}, {"_id": 0, "passwordHash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if viewer is the profile owner
    viewer_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            viewer_id = decode_jwt_token(token)
        except:
            pass
            
    # Only increment views if viewer is not the owner
    if viewer_id != user["id"]:
        await db.users.update_one({"username": username}, {"$inc": {"profileViews": 1}})
        # Update the returned user object to reflect the increment (optimistic)
        user['profileViews'] = user.get('profileViews', 0) + 1
    
    return user

@api_router.get("/users/id/{user_id}")
async def get_user_by_id(user_id: str):
    """Get public user information by ID (for messaging, etc.)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return public profile information
    return {
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "bio": user.get("bio", ""),
        "avatar": user.get("avatar"),
        "reputation": user.get("reputation", 0),
        "createdAt": user.get("createdAt")
    }

@api_router.put("/users/me")
async def update_user(update_data: UserUpdate, user_id: str = Depends(get_current_user)):
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_dict})
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "passwordHash": 0})
    return user

@api_router.post("/users/avatar")
async def upload_avatar(avatar: str, user_id: str = Depends(get_current_user)):
    try:
        # avatar is base64 encoded
        result = cloudinary.uploader.upload(
            avatar,
            folder="devconnect/avatars",
            public_id=user_id,
            overwrite=True
        )
        avatar_url = result["secure_url"]
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"avatar": avatar_url, "updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"avatar": avatar_url}
    except Exception as e:
        # Fallback: use local storage or default
        return {"avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}"}

@api_router.get("/users/{username}/posts", response_model=List[Post])
async def get_user_posts(username: str):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    posts = await db.posts.find({"authorId": user["id"], "published": True}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return posts

@api_router.get("/users/{username}/questions", response_model=List[Question])
async def get_user_questions(username: str):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    questions = await db.questions.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return questions

@api_router.get("/users/{username}/answers", response_model=List[Answer])
async def get_user_answers(username: str):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    answers = await db.answers.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return answers

@api_router.get("/users/{username}/stats")
async def get_user_stats(username: str):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = user["id"]
    posts_count = await db.posts.count_documents({"authorId": user_id})
    questions_count = await db.questions.count_documents({"userId": user_id})
    answers_count = await db.answers.count_documents({"userId": user_id})
    trophies_count = await db.trophies.count_documents({"userId": user_id})
    
    return {
        "posts": posts_count,
        "questions": questions_count,
        "answers": answers_count,
        "trophies": trophies_count,
        "followers": len(user.get("followers", [])),
        "following": len(user.get("following", []))
    }

@api_router.post("/users/{target_user_id}/follow")
async def follow_user(target_user_id: str, background_tasks: BackgroundTasks, current_user_id: str = Depends(get_current_user)):
    if target_user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
    target_user = await db.users.find_one({"id": target_user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Add to following of current user
    await db.users.update_one(
        {"id": current_user_id},
        {"$addToSet": {"following": target_user_id}}
    )
    
    # Add to followers of target user
    await db.users.update_one(
        {"id": target_user_id},
        {"$addToSet": {"followers": current_user_id}}
    )
    
    # Create notification
    notification = {
        "id": str(uuid.uuid4()),
        "userId": target_user_id,
        "type": "new_follower",
        "message": "You have a new follower!",
        "link": f"/profile/{current_user_id}",
        "read": False,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Emit via socket
    if target_user_id in active_connections:
        await sio.emit('new_notification', notification, room=active_connections[target_user_id])
    
    # Send email notification
    current_user = await db.users.find_one({"id": current_user_id})
    if current_user:
        background_tasks.add_task(send_new_follower_email, target_user["email"], target_user["username"], current_user["name"])
    
    return {"message": "Followed successfully"}

@api_router.delete("/users/{target_user_id}/follow")
async def unfollow_user(target_user_id: str, current_user_id: str = Depends(get_current_user)):
    # Remove from following of current user
    await db.users.update_one(
        {"id": current_user_id},
        {"$pull": {"following": target_user_id}}
    )
    
    # Remove from followers of target user
    await db.users.update_one(
        {"id": target_user_id},
        {"$pull": {"followers": current_user_id}}
    )
    
    return {"message": "Unfollowed successfully"}
    # The following block was duplicated and seems to be an error in the original document.
    # I'm commenting it out as it's not part of the requested change and is redundant.
    # if not user:
    #     raise HTTPException(status_code=404, detail="User not found")
    
    # posts_count = await db.posts.count_documents({"authorId": user["id"]})
    # questions_count = await db.questions.count_documents({"userId": user["id"]})
    # answers_count = await db.answers.count_documents({"userId": user["id"]})
    # trophies_count = await db.trophies.count_documents({"userId": user["id"]})
    
    # return {
    #     "posts": posts_count,
    #     "questions": questions_count,
    #     "answers": answers_count,
    #     "trophies": trophies_count
    # }

@api_router.get("/users/{username}/trophies", response_model=List[Trophy])
async def get_user_trophies(username: str):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    trophies = await db.trophies.find({"userId": user["id"]}, {"_id": 0}).to_list(1000)
    return trophies

@api_router.get("/users/{username}/github/repos")
async def get_github_repos(username: str):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    github_url = user.get("githubUrl")
    if not github_url:
        return []
        
    # Extract username from URL (e.g., https://github.com/shadow-monarch -> shadow-monarch)
    # Handle various formats: https://github.com/user, http://github.com/user, github.com/user, user
    github_username = github_url.rstrip("/").split("/")[-1]
    
    if not github_username:
        return []

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/users/{github_username}/repos?sort=updated&per_page=6",
                headers={"User-Agent": "DevConnect-App"}
            )
            
            if response.status_code == 200:
                repos = response.json()
                return [
                    {
                        "name": repo["name"],
                        "description": repo["description"],
                        "language": repo["language"],
                        "stars": repo["stargazers_count"],
                        "url": repo["html_url"],
                        "updatedAt": repo["updated_at"]
                    }
                    for repo in repos
                ]
            else:
                logging.error(f"GitHub API error: {response.status_code} - {response.text}")
                return []
    except Exception as e:
        logging.error(f"Failed to fetch GitHub repos: {str(e)}")
        return []

@api_router.get("/users/me/settings")
async def get_user_settings(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return default settings if none exist
    default_settings = {
        "notifications": {
            "email": True,
            "push": True,
            "weeklyDigest": False
        },
        "privacy": {
            "profileVisible": True,
            "showActivity": True,
            "showEmail": False
        }
    }
    
    return user.get("settings", default_settings)

@api_router.put("/users/me/settings")
async def update_user_settings(settings_data: UserSettings, user_id: str = Depends(get_current_user)):
    settings_dict = settings_data.model_dump(exclude_unset=True)
    if not settings_dict:
        raise HTTPException(status_code=400, detail="No settings to update")
    
    # Merge with existing settings
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_settings = user.get("settings", {})
    
    # Update only provided fields
    if settings_dict.get("notifications"):
        if "notifications" not in current_settings:
            current_settings["notifications"] = {}
        current_settings["notifications"].update(settings_dict["notifications"])
    
    if settings_dict.get("privacy"):
        if "privacy" not in current_settings:
            current_settings["privacy"] = {}
        current_settings["privacy"].update(settings_dict["privacy"])
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"settings": current_settings, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    
    return current_settings

@api_router.post("/users/me/change-password")
async def change_password(password_data: ChangePassword, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(password_data.currentPassword, user["passwordHash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    new_password_hash = hash_password(password_data.newPassword)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"passwordHash": new_password_hash, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Password changed successfully"}

class DeleteAccount(BaseModel):
    password: str
    confirmation: str  # User must type "DELETE" to confirm

@api_router.post("/users/me/delete-account")
async def delete_account(delete_data: DeleteAccount, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify password
    if not verify_password(delete_data.password, user["passwordHash"]):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    
    # Verify confirmation text
    if delete_data.confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Please type DELETE to confirm")
    
    # Delete all user-related data
    await db.posts.delete_many({"authorId": user_id})
    await db.questions.delete_many({"userId": user_id})
    await db.answers.delete_many({"userId": user_id})
    await db.comments.delete_many({"userId": user_id})
    await db.trophies.delete_many({"userId": user_id})
    await db.notifications.delete_many({"userId": user_id})
    await db.messages.delete_many({"$or": [{"senderId": user_id}, {"receiverId": user_id}]})
    await db.activities.delete_many({"userId": user_id})
    
    # Finally, delete the user
    await db.users.delete_one({"id": user_id})
    
    return {"message": "Account deleted successfully"}


# ====================
# Routes - AI Chat
# ====================

@api_router.post("/ai/chat")
async def chat_with_ai(chat_data: ChatMessage, user_id: str = Depends(get_current_user)):
    gemini_api_key = os.environ.get('GEMINI_API_KEY')
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    try:
        # Configure Gemini
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # Construct prompt from messages
        prompt = ""
        if chat_data.context:
            prompt += f"Context: {chat_data.context}\n\n"
        prompt += f"User: {chat_data.message}\nAssistant:"
        
        response = model.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        logging.error(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate response")

class QuestionEnhanceRequest(BaseModel):
    title: str
    description: str

@api_router.post("/ai/enhance-question")
async def enhance_question(data: QuestionEnhanceRequest, user_id: str = Depends(get_current_user)):
    gemini_api_key = os.environ.get('GEMINI_API_KEY')
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-flash-latest')
        
        prompt = f"""
        You are an expert developer helper. Please enhance the following programming question to be more clear, concise, and likely to get a good answer.
        Improve the title to be descriptive.
        Improve the description to include necessary details, formatting, and clarity.
        
        Original Title: {data.title}
        Original Description: {data.description}
        
        Return the result in JSON format with "title" and "description" keys. Do not add any other text or markdown formatting.
        """
        
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Clean up potential markdown code blocks if Gemini adds them
        if response_text.startswith("```json"):
            response_text = response_text[7:-3]
        elif response_text.startswith("```"):
            response_text = response_text[3:-3]
            
        return json.loads(response_text)
    except Exception as e:
        logging.error(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to enhance question")

# ====================
# Routes - Challenges
# ====================

@api_router.get("/challenges/daily")
async def get_daily_challenge(user_id: Optional[str] = Depends(get_current_user_optional)):
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Try to find today's challenge
    challenge = await db.challenges.find_one({"date": today}, {"_id": 0})
    
    # If no challenge for today, create a mock one (for MVP)
    if not challenge:
        challenge = {
            "id": str(uuid.uuid4()),
            "title": "Reverse a String",
            "description": "Write a function that reverses a string. The input string is given as an argument.",
            "difficulty": "Easy",
            "points": 10,
            "testCases": [
                {"input": "hello", "output": "olleh"},
                {"input": "world", "output": "dlrow"}
            ],
            "starterCode": "def reverse_string(s):\n    # Your code here\n    pass",
            "date": today,
            "solvedBy": []
        }
        await db.challenges.insert_one(challenge)
        del challenge["_id"]
    
    # Check if user solved it
    challenge["solved"] = False
    if user_id and user_id in challenge.get("solvedBy", []):
        challenge["solved"] = True
        
    return challenge

class ChallengeSubmission(BaseModel):
    code: str

@api_router.post("/challenges/{challenge_id}/submit")
async def submit_challenge(challenge_id: str, submission: ChallengeSubmission, user_id: str = Depends(get_current_user)):
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if user_id in challenge.get("solvedBy", []):
        return {"success": True, "message": "You already solved this challenge!", "points": 0}
    
    # MVP: Simple string matching or basic evaluation
    # For "Reverse a String", we'll just check if the code looks somewhat correct or run a simple eval (risky but okay for MVP demo)
    # BETTER MVP: Just check if the output matches for the test cases by running the code in a restricted scope
    
    code = submission.code
    passed = True
    
    try:
        # VERY BASIC SANDBOX (Do not use in production)
        # We will define the function and run it against test cases
        local_scope = {}
        exec(code, {}, local_scope)
        
        func_name = "reverse_string" # Hardcoded for this specific mock challenge
        if func_name not in local_scope:
            return {"success": False, "message": f"Function '{func_name}' not found"}
            
        func = local_scope[func_name]
        
        for case in challenge["testCases"]:
            if func(case["input"]) != case["output"]:
                passed = False
                break
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}
        
    if passed:
        # Award points
        await db.users.update_one({"id": user_id}, {"$inc": {"points": challenge["points"]}})
        await db.challenges.update_one({"id": challenge_id}, {"$addToSet": {"solvedBy": user_id}})
        
        # Update streak
        streak_info = await update_user_streak(user_id)
        
        return {"success": True, "message": "Challenge Solved! +100 Points", "points": challenge["points"]}
    else:
        return {"success": False, "message": "Test cases failed"}

@api_router.get("/challenges/{challenge_id}/solutions")
async def get_challenge_solutions(challenge_id: str):
    solutions = await db.solutions.find({"challengeId": challenge_id}).to_list(1000)
    return solutions

@api_router.post("/challenges/{challenge_id}/share")
async def share_solution(challenge_id: str, submission: ChallengeSubmission, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Optional: Verify if user actually solved it
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
        
    solution = {
        "id": str(uuid.uuid4()),
        "challengeId": challenge_id,
        "userId": user_id,
        "username": user["username"],
        "code": submission.code,
        "language": "python", # Default for now
        "votes": [],
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.solutions.insert_one(solution)
    return solution

@api_router.post("/solutions/{solution_id}/vote")
async def vote_solution(solution_id: str, user_id: str = Depends(get_current_user)):
    solution = await db.solutions.find_one({"id": solution_id})
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
        
    if user_id in solution["votes"]:
        await db.solutions.update_one({"id": solution_id}, {"$pull": {"votes": user_id}})
        return {"message": "Vote removed", "votes": len(solution["votes"]) - 1}
    else:
        await db.solutions.update_one({"id": solution_id}, {"$addToSet": {"votes": user_id}})
        return {"message": "Vote added", "votes": len(solution["votes"]) + 1}

@api_router.get("/projects")
async def get_projects():
    projects = await db.projects.find({}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return projects

@api_router.post("/projects")
async def create_project(project: ProjectCreate, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    new_project = project.model_dump()
    new_project["id"] = str(uuid.uuid4())
    new_project["authorId"] = user_id
    new_project["authorName"] = user["username"]
    new_project["createdAt"] = datetime.now(timezone.utc).isoformat()
    new_project["updatedAt"] = datetime.now(timezone.utc).isoformat()
    new_project["updatedAt"] = datetime.now(timezone.utc).isoformat()
    new_project["members"] = [user_id] # Author is first member
    new_project["roles"] = {user_id: "admin"}
    new_project["tasks"] = [] # Initialize empty tasks list
    
    await db.projects.insert_one(new_project)
    if "_id" in new_project:
        del new_project["_id"]
    return new_project

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Populate members
    member_ids = project.get("members", [])
    if member_ids:
        members = await db.users.find({"id": {"$in": member_ids}}, {"_id": 0, "passwordHash": 0}).to_list(len(member_ids))
        project["membersDetails"] = members
    else:
        project["membersDetails"] = []
        
    return project

@api_router.post("/projects/{project_id}/join")
async def join_project(project_id: str, user_id: str = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if user_id in project["members"]:
        return {"message": "Already a member"}
        
    await db.projects.update_one({"id": project_id}, {"$addToSet": {"members": user_id}})
    # Default role is member, stored in roles dict
    await db.projects.update_one({"id": project_id}, {"$set": {f"roles.{user_id}": "member"}})
    return {"message": "Joined project successfully"}

@api_router.post("/projects/{project_id}/tasks")
async def add_project_task(project_id: str, task: Dict[str, Any], user_id: str = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if user_id not in project["members"]:
        raise HTTPException(status_code=403, detail="Must be a member to add tasks")
        
    user_role = project.get("roles", {}).get(user_id, "member")
    # Fallback: if user is author, treat as admin even if role missing (for legacy projects)
    if user_id == project.get("authorId"):
        user_role = "admin"
        
    if user_role not in ["admin", "co-admin"]:
        raise HTTPException(status_code=403, detail="Only admins and co-admins can add tasks")
        
    new_task = {
        "id": str(uuid.uuid4()),
        "title": task["title"],
        "description": task.get("description", ""),
        "status": "todo",
        "priority": task.get("priority", "medium"),  # low, medium, high
        "dueDate": task.get("dueDate"),
        "assigneeId": task.get("assigneeId"),
        "createdBy": user_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.projects.update_one({"id": project_id}, {"$push": {"tasks": new_task}})
    
    # Send notification to assignee if assigned
    if new_task.get("assigneeId") and new_task["assigneeId"] != user_id:
        notification = {
            "id": str(uuid.uuid4()),
            "userId": new_task["assigneeId"],
            "type": "task_assigned",
            "message": f"You were assigned to task: {new_task['title']}",
            "link": f"/projects/{project_id}",
            "read": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
        
        # Emit via socket
        if new_task["assigneeId"] in active_connections:
            await sio.emit('new_notification', notification, room=active_connections[new_task["assigneeId"]])
    
    return new_task

@api_router.post("/projects/{project_id}/promote")
async def promote_member(project_id: str, body: Dict[str, str], user_id: str = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Check if requester is admin
    requester_role = project.get("roles", {}).get(user_id)
    if requester_role != "admin":
        raise HTTPException(status_code=403, detail="Only the admin can promote members")
        
    target_user_id = body.get("userId")
    if not target_user_id or target_user_id not in project["members"]:
        raise HTTPException(status_code=400, detail="Invalid member to promote")
        
    await db.projects.update_one({"id": project_id}, {"$set": {f"roles.{target_user_id}": "co-admin"}})
    return {"message": "Member promoted to co-admin"}

@api_router.patch("/projects/{project_id}/tasks/{task_id}/status")
async def update_task_status(
    project_id: str,
    task_id: str,
    status_data: Dict[str, str],
    user_id: str = Depends(get_current_user)
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Find the task
    task_index = None
    task = None
    for idx, t in enumerate(project.get("tasks", [])):
        if t["id"] == task_id:
            task_index = idx
            task = t
            break
    
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check permissions: must be assignee, admin, or co-admin
    user_role = project.get("roles", {}).get(user_id, "member")
    is_assignee = task.get("assigneeId") == user_id
    is_authorized = user_role in ["admin", "co-admin"] or is_assignee
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    new_status = status_data.get("status")
    if new_status not in ["todo", "in-progress", "done"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Update task status
    await db.projects.update_one(
        {"id": project_id, "tasks.id": task_id},
        {
            "$set": {
                f"tasks.{task_index}.status": new_status,
                f"tasks.{task_index}.updatedAt": datetime.now(timezone.utc).isoformat(),
                f"tasks.{task_index}.updatedBy": user_id
            }
        }
    )
    
    # Send notification to assignee if not the one updating
    assignee_id = task.get("assigneeId")
    if assignee_id and assignee_id != user_id:
        user_data = await db.users.find_one({"id": user_id})
        notification = {
            "id": str(uuid.uuid4()),
            "userId": assignee_id,
            "type": "task_updated",
            "message": f"{user_data.get('name', 'Someone')} changed '{task['title']}' status to {new_status}",
            "link": f"/projects/{project_id}",
            "read": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
        
        if assignee_id in active_connections:
            await sio.emit('new_notification', notification, room=active_connections[assignee_id])
    
    return {"message": "Task status updated", "status": new_status}

@api_router.delete("/projects/{project_id}/tasks/{task_id}")
async def delete_task(
    project_id: str,
    task_id: str,
    user_id: str = Depends(get_current_user)
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if user is admin or co-admin
    user_role = project.get("roles", {}).get(user_id, "member")
    if user_role not in ["admin", "co-admin"]:
        raise HTTPException(status_code=403, detail="Only admins and co-admins can delete tasks")
    
    # Check if task exists
    task_exists = any(t["id"] == task_id for t in project.get("tasks", []))
    if not task_exists:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Remove task from array
    await db.projects.update_one(
        {"id": project_id},
        {"$pull": {"tasks": {"id": task_id}}}
    )
    
    return {"message": "Task deleted successfully"}

@api_router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user)
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Only admin (host) can delete project
    user_role = project.get("roles", {}).get(user_id, "member")
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Only the project host can delete the project")
    
    # Delete the project
    await db.projects.delete_one({"id": project_id})
    
    return {"message": "Project deleted successfully"}

@api_router.post("/projects/{project_id}/files")
async def upload_project_file(
    project_id: str, 
    file: UploadFile = File(...), 
    user_id: str = Depends(get_current_user)
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if user_id not in project["members"]:
        raise HTTPException(status_code=403, detail="Must be a member to upload files")

    # Upload to local storage
    try:
        # Read file content
        content = await file.read()
        
        # Create unique filename
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Generate URL (assuming localhost for dev, needs env var for prod)
        # For now, we return a relative path or full path based on request
        # But since we mounted /uploads, we can use that.
        file_url = f"/uploads/{filename}"
        
        file_data = {
            "id": str(uuid.uuid4()),
            "name": file.filename,
            "url": file_url,
            "type": file.content_type,
            "uploadedBy": user_id,
            "uploadedAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.projects.update_one(
            {"id": project_id}, 
            {"$push": {"files": file_data}}
        )
        
        return file_data
        
    except Exception as e:
        logging.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="File upload failed")

@api_router.get("/tutorials")
async def get_tutorials():
    tutorials = await db.tutorials.find().to_list(100)
    # If empty, seed some data
    if not tutorials:
        seed_tutorials = [
            {
                "id": str(uuid.uuid4()),
                "title": "Intro to Python",
                "description": "Learn the basics of Python programming.",
                "category": "Python",
                "difficulty": "Beginner",
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "steps": [
                    {
                        "id": "1",
                        "title": "Hello World",
                        "content": "Let's start with the classic Hello World program.",
                        "code": "print('Hello, World!')",
                        "test": "Hello, World!",
                        "quiz": {
                            "question": "What function is used to output text?",
                            "options": ["echo()", "print()", "log()"],
                            "answer": "print()"
                        }
                    },
                    {
                        "id": "2",
                        "title": "Variables",
                        "content": "Variables store data values.",
                        "code": "x = 5\ny = 10\nprint(x + y)",
                        "test": "15",
                        "quiz": {
                            "question": "How do you assign a value to a variable?",
                            "options": ["x : 5", "x = 5", "int x = 5"],
                            "answer": "x = 5"
                        }
                    }
                ]
            }
        ]
        await db.tutorials.insert_many(seed_tutorials)
        return seed_tutorials
    return tutorials

@api_router.get("/tutorials/{tutorial_id}")
async def get_tutorial(tutorial_id: str):
    tutorial = await db.tutorials.find_one({"id": tutorial_id})
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found")
    return tutorial
# Routes - Posts
# ====================

@api_router.get("/posts/trending", response_model=List[Post])
async def get_trending_posts(limit: int = 20):
    # Simple trending algorithm: likes + comments
    # In a real app, this would be more complex (recency * popularity)
    pipeline = [
        {"$match": {"published": True}},
        {"$addFields": {
            "popularity": {"$add": [{"$size": "$likes"}, "$commentsCount"]}
        }},
        {"$sort": {"popularity": -1, "createdAt": -1}},
        {"$limit": limit}
    ]
    
    posts = await db.posts.aggregate(pipeline).to_list(limit)
    return posts

@api_router.get("/posts/following", response_model=List[Post])
async def get_following_posts(limit: int = 20, current_user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    following_ids = user.get("following", [])
    
    cursor = db.posts.find(
        {"authorId": {"$in": following_ids}, "published": True}
    ).sort("createdAt", -1).limit(limit)
    
    posts = await cursor.to_list(length=limit)
    return posts

@api_router.get("/posts", response_model=List[Post])
async def get_posts(
    skip: int = 0, 
    limit: int = 20, 
    category: Optional[str] = None, 
    tag: Optional[str] = None, 
    search: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    sort: Optional[str] = "newest",
    timeframe: Optional[str] = "all",
    min_likes: Optional[int] = 0
):
    query = {"published": True}
    
    if category:
        query["category"] = category
    
    # Handle single tag (legacy) and multiple tags
    if tag:
        query["tags"] = tag
    if tags:
        query["tags"] = {"$all": tags}
        
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
        
    # Timeframe filter
    if timeframe and timeframe != "all":
        now = datetime.now(timezone.utc)
        if timeframe == "day":
            start_date = now - timedelta(days=1)
        elif timeframe == "week":
            start_date = now - timedelta(weeks=1)
        elif timeframe == "month":
            start_date = now - timedelta(days=30)
        elif timeframe == "year":
            start_date = now - timedelta(days=365)
        else:
            start_date = None
            
        if start_date:
            query["createdAt"] = {"$gte": start_date.isoformat()}
            
    # Min likes filter
    if min_likes and min_likes > 0:
        query["$expr"] = {"$gte": [{"$size": "$likes"}, min_likes]}

    # Sorting
    sort_criteria = [("createdAt", -1)] # Default newest
    if sort == "oldest":
        sort_criteria = [("createdAt", 1)]
    elif sort == "popular":
        # Sort by likes count (descending)
        # Note: This is inefficient in MongoDB without a computed field, but works for smaller datasets
        # For better performance, we should store likeCount on the document
        pass # We'll handle this by sorting in memory or using aggregation if needed. 
             # For now, let's stick to simple sorts or use aggregation if strictly required.
             # Actually, let's use aggregation for robust sorting if "popular" or "views"
    elif sort == "views":
        sort_criteria = [("views", -1)]
    elif sort == "unanswered":
        # specific to questions, but we can reuse logic if we had comments count
        sort_criteria = [("commentsCount", 1)]

    # If sorting by computed fields (likes), we need aggregation
    if sort == "popular":
        pipeline = [
            {"$match": query},
            {"$addFields": {"likesCount": {"$size": "$likes"}}},
            {"$sort": {"likesCount": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {"$project": {"likesCount": 0}} # Remove computed field
        ]
        posts = await db.posts.aggregate(pipeline).to_list(limit)
    else:
        posts = await db.posts.find(query, {"_id": 0}).sort(sort_criteria).skip(skip).limit(limit).to_list(limit)
    
    # Add comment count to each post (if not already fetched via aggregation)
    for post in posts:
        if "commentsCount" not in post:
            comment_count = await db.comments.count_documents({"postId": post["id"]})
            post["commentsCount"] = comment_count
    
    return posts

# Saved Searches Routes
@api_router.post("/searches", response_model=SavedSearch)
async def create_saved_search(search_data: SavedSearchCreate, user_id: str = Depends(get_current_user)):
    saved_search = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "name": search_data.name,
        "query": search_data.query,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.saved_searches.insert_one(saved_search)
    return saved_search

@api_router.get("/searches", response_model=List[SavedSearch])
async def get_saved_searches(user_id: str = Depends(get_current_user)):
    searches = await db.saved_searches.find({"userId": user_id}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return searches

@api_router.delete("/searches/{search_id}")
async def delete_saved_search(search_id: str, user_id: str = Depends(get_current_user)):
    result = await db.saved_searches.delete_one({"id": search_id, "userId": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return {"message": "Saved search deleted"}

@api_router.get("/posts/feed", response_model=List[Post])
async def get_personalized_feed(limit: int = 20, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    following_users = user.get("following", [])
    following_tags = user.get("followingTags", [])
    
    # Logic:
    # 1. Get posts from followed users (high priority)
    # 2. Get posts with followed tags (medium priority)
    # 3. Get trending/recent posts (fill the rest)
    # For simplicity in this iteration, we'll fetch a mix using $or
    
    query = {
        "published": True,
        "$or": [
            {"authorId": {"$in": following_users}},
            {"tags": {"$in": following_tags}}
        ]
    }
    
    # If user follows nothing, fall back to all posts
    if not following_users and not following_tags:
        query = {"published": True}
    
    posts = await db.posts.find(query, {"_id": 0}).sort("createdAt", -1).limit(limit).to_list(limit)
    
    # If we didn't get enough posts, fill with general recent posts
    if len(posts) < limit:
        existing_ids = [p["id"] for p in posts]
        remaining = limit - len(posts)
        
        fallback_query = {
            "published": True,
            "id": {"$nin": existing_ids}
        }
        
        fallback_posts = await db.posts.find(fallback_query, {"_id": 0}).sort("createdAt", -1).limit(remaining).to_list(remaining)
        posts.extend(fallback_posts)
    
    # Add comment count
    for post in posts:
        comment_count = await db.comments.count_documents({"postId": post["id"]})
        post["commentsCount"] = comment_count
        
    return posts


@api_router.get("/posts/bookmarked", response_model=List[Post])
async def get_bookmarked_posts(user_id: str = Depends(get_current_user)):
    posts = await db.posts.find({"bookmarks": user_id}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    
    # Add comment count to each post
    for post in posts:
        comment_count = await db.comments.count_documents({"postId": post["id"]})
        post["commentsCount"] = comment_count
        
    return posts


@api_router.get("/search/autocomplete")
async def get_search_autocomplete(query: str):
    if not query or len(query) < 2:
        return {"posts": [], "users": [], "tags": []}
        
    # Search posts (limit 3)
    posts = await db.posts.find(
        {"title": {"$regex": query, "$options": "i"}, "published": True},
        {"id": 1, "title": 1, "category": 1, "_id": 0}
    ).limit(3).to_list(3)
    
    # Search users (limit 3)
    users = await db.users.find(
        {"$or": [
            {"username": {"$regex": query, "$options": "i"}},
            {"name": {"$regex": query, "$options": "i"}}
        ]},
        {"username": 1, "name": 1, "avatar": 1, "_id": 0}
    ).limit(3).to_list(3)
    
    # Search tags (limit 3)
    # We'll use a simple aggregation to find matching tags from posts
    pipeline = [
        {"$unwind": "$tags"},
        {"$match": {"tags": {"$regex": query, "$options": "i"}}},
        {"$group": {"_id": "$tags"}},
        {"$limit": 3}
    ]
    tags_cursor = db.posts.aggregate(pipeline)
    tags = [doc["_id"] for doc in await tags_cursor.to_list(3)]
    
    return {
        "posts": posts,
        "users": users,
        "tags": tags
    }

@api_router.get("/posts/drafts", response_model=List[Post])
async def get_drafts(user_id: str = Depends(get_current_user)):
    drafts = await db.posts.find(
        {"authorId": user_id, "published": False}, 
        {"_id": 0}
    ).sort("updatedAt", -1).to_list(100)
    return drafts

@api_router.get("/posts/trending", response_model=List[Post])
async def get_trending_posts():
    # Calculate score: likes * 2 + views
    pipeline = [
        {"$match": {"published": True}},
        {"$addFields": {
            "likesCount": {"$size": "$likes"},
            "score": {"$add": [{"$multiply": [{"$size": "$likes"}, 2]}, "$views"]}
        }},
        {"$sort": {"score": -1}},
        {"$limit": 5}
    ]
    
    posts = await db.posts.aggregate(pipeline).to_list(5)
    
    # Add comment count
    for post in posts:
        comment_count = await db.comments.count_documents({"postId": post["id"]})
        post["commentsCount"] = comment_count
        
    return posts

@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, user_id: str = Depends(get_current_user)):
    post = post_data.model_dump()
    post["id"] = str(uuid.uuid4())
    post["authorId"] = user_id
    post["likes"] = []
    post["bookmarks"] = []
    post["views"] = 0
    post["published"] = post_data.published if post_data.published is not None else True
    post["createdAt"] = datetime.now(timezone.utc).isoformat()
    post["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.posts.insert_one(post)
    await update_user_points(user_id, 5, "post_created")
    
    # Check for badges
    await check_and_award_badges(user_id, "create_post")
    
    # Trigger email notifications (background task)
    # Find users who follow these tags
    followers = await db.users.find({
        "followingTags": {"$in": post["tags"]},
        "emailSettings.newContent": True
    }).to_list(100)
    
    for follower in followers:
        if follower["id"] != user_id: # Don't notify self
            # In a real app, use BackgroundTasks for this
            asyncio.create_task(send_new_content_notification(
                follower["email"], 
                follower["username"], 
                post["title"], 
                post["tags"], 
                post["id"]
            ))
    
    post_copy = post.copy()
    del post_copy["_id"]
    return post_copy

@api_router.get("/posts/{post_id}", response_model=Post)
async def get_post(post_id: str):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Increment views
    await db.posts.update_one({"id": post_id}, {"$inc": {"views": 1}})
    post["views"] += 1
    
    return post

@api_router.put("/posts/{post_id}", response_model=Post)
async def update_post(post_id: str, post_data: PostCreate, user_id: str = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["authorId"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_dict = post_data.model_dump()
    update_dict["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.posts.update_one({"id": post_id}, {"$set": update_dict})
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return updated_post

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user_id: str = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["authorId"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.posts.delete_one({"id": post_id})
    return {"message": "Post deleted"}

@api_router.post("/posts/{post_id}/like")
async def toggle_like_post(post_id: str, user_id: str = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    likes = post.get("likes", [])
    if user_id in likes:
        await db.posts.update_one({"id": post_id}, {"$pull": {"likes": user_id}})
        return {"liked": False}
    else:
        await db.posts.update_one({"id": post_id}, {"$push": {"likes": user_id}})
        # Award points to post author
        await update_user_points(post["authorId"], 1, "post_liked")
        
        # Check for badges
        await check_and_award_badges(post["authorId"], "like_received")
        
        return {"liked": True}

@api_router.post("/posts/{post_id}/bookmark")
async def toggle_bookmark_post(post_id: str, user_id: str = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    bookmarks = post.get("bookmarks", [])
    if user_id in bookmarks:
        await db.posts.update_one({"id": post_id}, {"$pull": {"bookmarks": user_id}})
        return {"bookmarked": False}
    else:
        await db.posts.update_one({"id": post_id}, {"$push": {"bookmarks": user_id}})
        return {"bookmarked": True}

# ====================
# Routes - Questions
# ====================

@api_router.get("/questions", response_model=List[Question])
async def get_questions(skip: int = 0, limit: int = 20, status: Optional[str] = None, tag: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if tag:
        query["tags"] = tag
    
    questions = await db.questions.find(query, {"_id": 0}).sort("createdAt", -1).skip(skip).limit(limit).to_list(limit)
    return questions

@api_router.post("/questions", response_model=Question)
async def create_question(question_data: QuestionCreate, user_id: str = Depends(get_current_user)):
    # Deduct 1 point for asking question
    user = await db.users.find_one({"id": user_id})
    if user and user.get("points", 0) < 1:
        raise HTTPException(status_code=400, detail="Not enough points to ask a question (requires 1 point)")
    
    question = question_data.model_dump()
    question["id"] = str(uuid.uuid4())
    question["userId"] = user_id
    question["status"] = "open"
    question["views"] = 0
    question["createdAt"] = datetime.now(timezone.utc).isoformat()
    question["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.questions.insert_one(question)
    await update_user_points(user_id, -1, "question_asked")
    
    question_copy = question.copy()
    del question_copy["_id"]
    return question_copy

@api_router.get("/questions/{question_id}", response_model=Question)
async def get_question(question_id: str):
    question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Increment views
    await db.questions.update_one({"id": question_id}, {"$inc": {"views": 1}})
    question["views"] += 1
    
    return question

@api_router.post("/questions/{question_id}/upvote", response_model=Question)
async def toggle_question_upvote(question_id: str, user_id: str = Depends(get_current_user)):
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    upvotes = question.get("upvotes", [])
    if user_id in upvotes:
        # Remove upvote
        await db.questions.update_one(
            {"id": question_id},
            {"$pull": {"upvotes": user_id}}
        )
        upvotes.remove(user_id)
    else:
        # Add upvote
        await db.questions.update_one(
            {"id": question_id},
            {"$addToSet": {"upvotes": user_id}}
        )
        upvotes.append(user_id)
        
        # Award points to author (if not self-vote)
        if question["userId"] != user_id:
            await update_user_points(question["userId"], 5, "question_upvoted")
            
            # Notify author
            notification = {
                "id": str(uuid.uuid4()),
                "userId": question["userId"],
                "type": "question_upvote",
                "message": "Someone upvoted your question!",
                "link": f"/questions/{question_id}",
                "read": False,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
            
            # Emit socket event
            if question["userId"] in active_connections:
                await sio.emit('new_notification', notification, room=active_connections[question["userId"]])
    
    # Return updated question
    question["upvotes"] = upvotes
    if "_id" in question:
        del question["_id"]
        
    return question

# ====================
# Routes - Answers
# ====================

@api_router.get("/questions/{question_id}/answers", response_model=List[Answer])
async def get_answers(question_id: str):
    answers = await db.answers.find({"questionId": question_id}, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    return answers

@api_router.post("/answers", response_model=Answer)
async def create_answer(answer_data: AnswerCreate, user_id: str = Depends(get_current_user)):
    answer = answer_data.model_dump()
    answer["id"] = str(uuid.uuid4())
    answer["userId"] = user_id
    answer["isAccepted"] = False
    answer["pointsAwarded"] = 0
    answer["upvotes"] = []
    answer["createdAt"] = datetime.now(timezone.utc).isoformat()
    answer["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.answers.insert_one(answer)
    
    # Create notification for question author
    question = await db.questions.find_one({"id": answer_data.questionId})
    if question and question["userId"] != user_id:
        notification = {
            "id": str(uuid.uuid4()),
            "userId": question["userId"],
            "type": "new_answer",
            "message": f"New answer on your question: {question['title']}",
            "link": f"/questions/{answer_data.questionId}",
            "read": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
        
        # Emit via socket
        if question["userId"] in active_connections:
            await sio.emit('new_notification', notification, room=active_connections[question["userId"]])
            
    # Award 15 points for answering
    await update_user_points(user_id, 15, "answer_given")
    
    # Check for badges
    await check_and_award_badges(user_id, "create_answer")
    
    answer_copy = answer.copy()
    del answer_copy["_id"]
    return answer_copy

@api_router.put("/answers/{answer_id}/accept")
async def accept_answer(answer_id: str, helpful: bool, user_id: str = Depends(get_current_user)):
    answer = await db.answers.find_one({"id": answer_id})
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    question = await db.questions.find_one({"id": answer["questionId"]})
    if not question or question["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Only question author can accept answers")
    
    # Award points
    points = 30 if helpful else 20
    await db.answers.update_one(
        {"id": answer_id},
        {"$set": {"isAccepted": True, "pointsAwarded": points, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    await db.questions.update_one({"id": answer["questionId"]}, {"$set": {"status": "answered"}})
    
    await update_user_points(answer["userId"], points, "answer_accepted")
    
    return {"message": "Answer accepted", "pointsAwarded": points}

@api_router.post("/answers/{answer_id}/upvote")
async def upvote_answer(answer_id: str, user_id: str = Depends(get_current_user)):
    answer = await db.answers.find_one({"id": answer_id})
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    upvotes = answer.get("upvotes", [])
    if user_id in upvotes:
        await db.answers.update_one({"id": answer_id}, {"$pull": {"upvotes": user_id}})
        return {"upvoted": False}
    else:
        await db.answers.update_one({"id": answer_id}, {"$push": {"upvotes": user_id}})
        await update_user_points(answer["userId"], 1, "answer_upvoted")
        return {"upvoted": True}

# ====================
# Routes - Comments
# ====================

@api_router.post("/comments", response_model=Comment)
async def create_comment(comment_data: CommentCreate, user_id: str = Depends(get_current_user)):
    comment = comment_data.model_dump()
    comment["id"] = str(uuid.uuid4())
    comment["userId"] = user_id
    comment["createdAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.comments.insert_one(comment)
    # await update_user_points(user_id, 5, "comment_posted")
    
    comment_copy = comment.copy()
    del comment_copy["_id"]
    return comment_copy

@api_router.get("/posts/{post_id}/comments", response_model=List[Comment])
async def get_post_comments(post_id: str):
    comments = await db.comments.find({"postId": post_id}, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    comments = await db.comments.find({"postId": post_id}, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    return comments

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user_id: str = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    # Check if user is author or admin
    user = await db.users.find_one({"id": user_id})
    if comment["userId"] != user_id and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await db.comments.delete_one({"id": comment_id})
    return {"message": "Comment deleted"}

@api_router.delete("/questions/{question_id}")
async def delete_question(question_id: str, user_id: str = Depends(get_current_user)):
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    # Check if user is author or admin
    user = await db.users.find_one({"id": user_id})
    if question["userId"] != user_id and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await db.questions.delete_one({"id": question_id})
    # Also delete answers? Maybe keep them but orphaned or delete them too.
    # For simplicity, let's delete answers too
    await db.answers.delete_many({"questionId": question_id})
    
    return {"message": "Question deleted"}

# ====================
# Routes - Leaderboard
# ====================

@api_router.get("/leaderboard")
async def get_leaderboard(period: str = "all", limit: int = 100):
    if period == "week":
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        # For simplicity, showing all-time for now
        users = await db.users.find({}, {"_id": 0, "passwordHash": 0}).sort("points", -1).limit(limit).to_list(limit)
    elif period == "month":
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        users = await db.users.find({}, {"_id": 0, "passwordHash": 0}).sort("points", -1).limit(limit).to_list(limit)
    else:  # all
        users = await db.users.find({}, {"_id": 0, "passwordHash": 0}).sort("points", -1).limit(limit).to_list(limit)
    
    return users

# ====================
# Routes - Conversations & Messages
# ====================

@api_router.post("/conversations", response_model=Conversation)
async def create_conversation(conv_data: ConversationCreate, user_id: str = Depends(get_current_user)):
    # Check if 1:1 conversation already exists
    if not conv_data.isGroup and len(conv_data.participants) == 2:
        existing = await db.conversations.find_one({
            "isGroup": False,
            "participants": {"$all": conv_data.participants}
        })
        if existing:
            existing["_id"] = str(existing["_id"])
            del existing["_id"]
            return existing
    
    conversation = conv_data.model_dump()
    conversation["id"] = str(uuid.uuid4())
    conversation["createdBy"] = user_id
    conversation["createdAt"] = datetime.now(timezone.utc).isoformat()
    conversation["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    if conv_data.isGroup:
        conversation["admins"] = [user_id]  # Creator is admin
        if not conversation.get("name"):
            conversation["name"] = "New Group"
    
    await db.conversations.insert_one(conversation)
    
    conversation_copy = conversation.copy()
    del conversation_copy["_id"]
    return conversation_copy

@api_router.get("/conversations")
async def get_conversations(user_id: str = Depends(get_current_user)):
    # Get all conversations where user is a participant
    conversations = await db.conversations.find(
        {"participants": user_id},
        {"_id": 0}
    ).sort("updatedAt", -1).to_list(1000)
    
    # Enrich with participant details and last message
    for conv in conversations:
        # Get last message
        last_msg = await db.messages.find_one(
            {"conversationId": conv["id"]},
            {"_id": 0},
            sort=[("createdAt", -1)]
        )
        conv["lastMessage"] = last_msg
        
        # Get participant details
        participant_details = []
        for p_id in conv["participants"]:
            user_doc = await db.users.find_one({"id": p_id}, {"_id": 0, "passwordHash": 0})
            if user_doc:
                participant_details.append(user_doc)
        conv["participantDetails"] = participant_details
    
    # Also handle legacy 1:1 messages (backward compatibility)
    legacy_messages = await db.messages.find(
        {
            "$or": [{"senderId": user_id}, {"receiverId": user_id}],
            "conversationId": None  # Only get messages without conversationId
        },
        {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    
    # Group legacy messages by conversation partner
    legacy_convs = {}
    for msg in legacy_messages:
        other_id = msg["receiverId"] if msg["senderId"] == user_id else msg["senderId"]
        if other_id not in legacy_convs:
            # Get other user details
            other_user = await db.users.find_one({"id": other_id}, {"_id": 0, "passwordHash": 0})
            if other_user:
                legacy_convs[other_id] = {
                    "id": f"legacy-{other_id}",
                    "participants": [user_id, other_id],
                    "participantDetails": [other_user],
                    "isGroup": False,
                    "createdBy": "",
                    "createdAt": msg["createdAt"],
                    "updatedAt": msg["createdAt"],
                    "lastMessage": msg
                }
    
    # Combine and return
    all_conversations = conversations + list(legacy_convs.values())
    return all_conversations

@api_router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, user_id: str = Depends(get_current_user)):
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if user_id not in conversation["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get participant details
    participant_details = []
    for p_id in conversation["participants"]:
        user_doc = await db.users.find_one({"id": p_id}, {"_id": 0, "passwordHash": 0})
        if user_doc:
            participant_details.append(user_doc)
    conversation["participantDetails"] = participant_details
    
    return conversation

@api_router.put("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    name: Optional[str] = None,
    avatar: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if user_id not in conversation.get("admins", []):
        raise HTTPException(status_code=403, detail="Only admins can update conversation")
    
    update_data = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    if name:
        update_data["name"] = name
    if avatar:
        update_data["avatar"] = avatar
    
    await db.conversations.update_one({"id": conversation_id}, {"$set": update_data})
    return {"message": "Conversation updated"}

@api_router.post("/conversations/{conversation_id}/members")
async def add_conversation_member(
    conversation_id: str,
    member_id: str,
    user_id: str = Depends(get_current_user)
):
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if not conversation.get("isGroup"):
        raise HTTPException(status_code=400, detail="Cannot add members to 1:1 conversation")
    
    if user_id not in conversation.get("admins", []):
        raise HTTPException(status_code=403, detail="Only admins can add members")
    
    if member_id in conversation["participants"]:
        raise HTTPException(status_code=400, detail="User already in conversation")
    
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$push": {"participants": member_id},
            "$set": {"updatedAt": datetime.now(timezone.utc).isoformat()}
        }
    )
    return {"message": "Member added"}

@api_router.delete("/conversations/{conversation_id}/members/{member_id}")
async def remove_conversation_member(
    conversation_id: str,
    member_id: str,
    user_id: str = Depends(get_current_user)
):
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # User can remove themselves or admins can remove others
    if user_id != member_id and user_id not in conversation.get("admins", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$pull": {"participants": member_id, "admins": member_id},
            "$set": {"updatedAt": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # If no participants left, delete conversation
    updated_conv = await db.conversations.find_one({"id": conversation_id})
    if not updated_conv["participants"]:
        await db.conversations.delete_one({"id": conversation_id})
    
    return {"message": "Member removed"}

@api_router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user_id: str = Depends(get_current_user)):
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if conversation.get("createdBy") != user_id:
        raise HTTPException(status_code=403, detail="Only creator can delete conversation")
    
    await db.conversations.delete_one({"id": conversation_id})
    await db.messages.delete_many({"conversationId": conversation_id})
    return {"message": "Conversation deleted"}

@api_router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, user_id: str = Depends(get_current_user)):
    # Handle legacy format
    if conversation_id.startswith("legacy-"):
        other_user_id = conversation_id.replace("legacy-", "")
        messages = await db.messages.find(
            {"$or": [
                {"senderId": user_id, "receiverId": other_user_id},
                {"senderId": other_user_id, "receiverId": user_id}
            ]},
            {"_id": 0}
        ).sort("createdAt", 1).to_list(1000)
        
        # Mark as read
        await db.messages.update_many(
            {"senderId": other_user_id, "receiverId": user_id, "read": False},
            {"$set": {"read": True}}
        )
        return messages
    
    # Check access
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if user_id not in conversation["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await db.messages.find(
        {"conversationId": conversation_id},
        {"_id": 0}
    ).sort("createdAt", 1).to_list(1000)
    
    # Enrich with sender details for groups
    if conversation.get("isGroup"):
        for msg in messages:
            sender = await db.users.find_one({"id": msg["senderId"]}, {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar": 1})
            if sender:
                msg["senderDetails"] = sender
    
    # Mark as read
    await db.messages.update_many(
        {"conversationId": conversation_id, "senderId": {"$ne": user_id}, "read": False},
        {"$set": {"read": True}}
    )
    
    return messages

@api_router.post("/messages/upload", response_model=MessageAttachment)
async def upload_message_file(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    # Validate file
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    try:
        # Generate unique filename
        import hashlib
        from datetime import datetime
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        file_hash = hashlib.md5(file_content).hexdigest()[:8]
        safe_filename = f"{timestamp}_{file_hash}_{file.filename}"
        
        # Save to local uploads directory
        file_path = UPLOAD_DIR / safe_filename
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Generate full URL for the file (use network IP for cross-device access)
        file_url = f"http://localhost:8000/uploads/{safe_filename}"
        
        logging.info(f"File uploaded successfully: {safe_filename}")
        
        return MessageAttachment(
            filename=file.filename or "unknown",
            url=file_url,
            size=len(file_content),
            type=file.content_type or "application/octet-stream"
        )
    except Exception as e:
        logging.error(f"Upload error: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.post("/messages", response_model=Message)
async def send_message(message_data: MessageCreate, user_id: str = Depends(get_current_user)):
    message = message_data.model_dump()
    message["id"] = str(uuid.uuid4())
    message["senderId"] = user_id
    message["read"] = False
    message["createdAt"] = datetime.now(timezone.utc).isoformat()
    
    # Handle backward compatibility with receiverId
    if not message.get("conversationId") and message.get("receiverId"):
        # Create or find 1:1 conversation
        participants = sorted([user_id, message["receiverId"]])
        conversation = await db.conversations.find_one({
            "isGroup": False,
            "participants": {"$all": participants}
        })
        
        if not conversation:
            # Create new 1:1 conversation
            conversation = {
                "id": str(uuid.uuid4()),
                "participants": participants,
                "isGroup": False,
                "admins": [],
                "createdBy": user_id,
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }
            await db.conversations.insert_one(conversation)
        
        message["conversationId"] = conversation["id"]
    
    # Validate conversation access
    if message.get("conversationId"):
        conversation = await db.conversations.find_one({"id": message["conversationId"]})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if user_id not in conversation["participants"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Update conversation's last activity
        await db.conversations.update_one(
            {"id": message["conversationId"]},
            {"$set": {"updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
    
    await db.messages.insert_one(message)
    
    # Emit via socket to all conversation participants
    if message.get("conversationId"):
        conv = await db.conversations.find_one({"id": message["conversationId"]})
        if conv:
            for participant_id in conv["participants"]:
                if participant_id != user_id and participant_id in active_connections:
                    await sio.emit('new_message', message, room=active_connections[participant_id])
    elif message.get("receiverId"):
        # Legacy support
        if message["receiverId"] in active_connections:
            await sio.emit('new_message', message, room=active_connections[message["receiverId"]])
    
    message_copy = message.copy()
    del message_copy["_id"]
    return message_copy

# Keep old endpoint for backward compatibility
@api_router.get("/messages/{other_user_id}")
async def get_messages(other_user_id: str, user_id: str = Depends(get_current_user)):
    messages = await db.messages.find(
        {"$or": [
            {"senderId": user_id, "receiverId": other_user_id},
            {"senderId": other_user_id, "receiverId": user_id}
        ]},
        {"_id": 0}
    ).sort("createdAt", 1).to_list(1000)
    
    # Mark as read
    await db.messages.update_many(
        {"senderId": other_user_id, "receiverId": user_id, "read": False},
        {"$set": {"read": True}}
    )

# ====================
# Routes - Notifications
# ====================

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(user_id: str = Depends(get_current_user)):
    notifications = await db.notifications.find({"userId": user_id}, {"_id": 0}).sort("createdAt", -1).limit(50).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user_id: str = Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id, "userId": user_id}, {"$set": {"read": True}})
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user_id: str = Depends(get_current_user)):
    await db.notifications.update_many({"userId": user_id, "read": False}, {"$set": {"read": True}})
    return {"message": "All notifications marked as read"}

# ====================
# Constants
# ====================

BADGES = {
    "first_post": {"name": "First Post", "description": "Created your first post", "icon": "PenTool"},
    "popular_writer": {"name": "Popular Writer", "description": "Received 100 likes", "icon": "Star"},
    "bug_hunter": {"name": "Bug Hunter", "description": "Reported a valid bug", "icon": "Bug"},
    "streak_master": {"name": "Streak Master", "description": "7-day login streak", "icon": "Flame"},
    "helper": {"name": "Helper", "description": "Answered 10 questions", "icon": "MessageCircle"},
    "verified": {"name": "Verified", "description": "Verified User", "icon": "CheckCircle"}
}

# ====================
# Routes - Search
# ====================

@api_router.get("/search")
@api_router.get("/search")
async def search(
    q: str, 
    type: str = "all", 
    skip: int = 0, 
    limit: int = 20,
    sort: str = "relevance",
    time: str = "all",
    tags: Optional[str] = None,
    status: str = "all"
):
    results = {}
    
    # Calculate date filter
    date_filter = {}
    if time != "all":
        now = datetime.now(timezone.utc)
        if time == "day":
            start_date = now - timedelta(days=1)
        elif time == "week":
            start_date = now - timedelta(weeks=1)
        elif time == "month":
            start_date = now - timedelta(days=30)
        elif time == "year":
            start_date = now - timedelta(days=365)
        else:
            start_date = None
            
        if start_date:
            date_filter = {"createdAt": {"$gte": start_date.isoformat()}}

    # Parse tags
    tag_list = tags.split(",") if tags else []

    # Common sort options
    sort_criteria = [("score", {"$meta": "textScore"})] # Default for text search if set up
    if sort == "newest":
        sort_criteria = [("createdAt", -1)]
    elif sort == "popular":
        sort_criteria = [("views", -1)] # Or likes
    
    # --- POSTS ---
    if type in ["all", "posts"]:
        query = {"$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"content": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}}
        ]}
        
        if date_filter:
            query.update(date_filter)
            
        if tag_list:
            query["tags"] = {"$in": tag_list} # Or $all for strict matching

        # Adjust sort for posts if popular
        post_sort = sort_criteria
        if sort == "popular":
            post_sort = [("likes", -1), ("views", -1)]

        posts = await db.posts.find(query, {"_id": 0}).sort(post_sort).limit(limit).to_list(limit)
        results["posts"] = posts
    
    # --- QUESTIONS ---
    if type in ["all", "questions"]:
        query = {"$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}}
        ]}
        
        if date_filter:
            query.update(date_filter)
            
        if tag_list:
            query["tags"] = {"$in": tag_list}

        if status == "solved":
            query["status"] = "answered" # Assuming 'answered' is the status for solved
        elif status == "unsolved":
            query["status"] = {"$ne": "answered"}

        # Adjust sort for questions
        question_sort = sort_criteria
        if sort == "popular":
            question_sort = [("upvotes", -1), ("views", -1)]
        elif sort == "unanswered":
             # This is tricky with simple sort, might need aggregation or just relying on status
             # For now, let's just sort by newest if unanswered is requested as a sort (which is weird)
             # Usually 'unanswered' is a filter. If it's a sort, maybe least answers?
             # Let's treat it as a filter + newest
             query["status"] = {"$ne": "answered"}
             question_sort = [("createdAt", -1)]

        questions = await db.questions.find(query, {"_id": 0}).sort(question_sort).limit(limit).to_list(limit)
        results["questions"] = questions
    
    # --- USERS ---
    if type in ["all", "users"]:
        # Users usually don't have date/tag filters in the same way, so we might ignore them or apply if relevant
        # For now, keep simple search for users
        users = await db.users.find(
            {"$or": [
                {"username": {"$regex": q, "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}},
                {"skills": {"$regex": q, "$options": "i"}}
            ]},
            {"_id": 0, "passwordHash": 0}
        ).limit(limit).to_list(limit)
        results["users"] = users
    
    return results

# ====================
# Routes - Reports
# ====================

@api_router.post("/reports", response_model=Report)
async def create_report(report_data: ReportCreate, user_id: str = Depends(get_current_user)):
    report = report_data.model_dump()
    report["id"] = str(uuid.uuid4())
    report["reporterId"] = user_id
    report["status"] = "pending"
    report["createdAt"] = datetime.now(timezone.utc).isoformat()
    report["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.reports.insert_one(report)
    
    report_copy = report.copy()
    del report_copy["_id"]
    return report_copy

@api_router.get("/admin/reports", response_model=List[Report])
async def get_reports(user_id: str = Depends(get_current_user)):
    # Verify admin status
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    reports = await db.reports.find({}, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    return reports

@api_router.put("/admin/reports/{report_id}")
async def update_report_status(report_id: str, status: str = Query(..., regex="^(pending|resolved|dismissed)$"), user_id: str = Depends(get_current_user)):
    # Verify admin status
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    result = await db.reports.update_one(
        {"id": report_id},
        {
            "$set": {
                "status": status,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return {"message": "Report status updated"}

@api_router.get("/admin/users", response_model=List[User])
async def get_admin_users(user_id: str = Depends(get_current_user)):
    # Verify admin status
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    users = await db.users.find({}, {"_id": 0, "passwordHash": 0}).sort("createdAt", -1).to_list(1000)
    return users

@api_router.put("/admin/users/{target_user_id}/role")
async def update_user_role(target_user_id: str, role: str = Query(..., regex="^(user|admin|moderator|banned)$"), user_id: str = Depends(get_current_user)):
    # Verify admin status
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    result = await db.users.update_one(
        {"id": target_user_id},
        {"$set": {"role": role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": f"User role updated to {role}"}

@api_router.get("/admin/stats")
async def get_admin_stats(user_id: str = Depends(get_current_user)):
    # Verify admin status
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    total_users = await db.users.count_documents({})
    total_posts = await db.posts.count_documents({})
    total_questions = await db.questions.count_documents({})
    total_reports = await db.reports.count_documents({})
    pending_reports = await db.reports.count_documents({"status": "pending"})
    
    return {
        "users": total_users,
        "posts": total_posts,
        "questions": total_questions,
        "reports": total_reports,
        "pendingReports": pending_reports
    }

# ====================
# Routes - Questions & Answers
# ====================

@api_router.get("/questions", response_model=List[Question])
async def get_questions(
    skip: int = 0, 
    limit: int = 20, 
    sort: str = "newest", 
    tag: Optional[str] = None
):
    query = {}
    if tag:
        query["tags"] = tag
        
    sort_criteria = [("createdAt", -1)]
    if sort == "popular":
        sort_criteria = [("upvotes", -1), ("views", -1)]
    elif sort == "unanswered":
        query["status"] = "open"
        
    questions = await db.questions.find(query, {"_id": 0}).sort(sort_criteria).skip(skip).limit(limit).to_list(limit)
    return questions

@api_router.post("/questions", response_model=Question)
async def create_question(question_data: QuestionCreate, user_id: str = Depends(get_current_user)):
    question_id = str(uuid.uuid4())
    new_question = {
        "id": question_id,
        "userId": user_id,
        "title": question_data.title,
        "description": question_data.description,
        "tags": question_data.tags,
        "status": "open",
        "views": 0,
        "upvotes": [],
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.questions.insert_one(new_question)
    
    # Award points for asking
    await update_user_points(user_id, 1, "ask_question")
    await check_and_award_badges(user_id, "ask_question")
    
    return new_question

@api_router.get("/questions/{question_id}", response_model=Question)
async def get_question(question_id: str):
    question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    # Increment views
    await db.questions.update_one({"id": question_id}, {"$inc": {"views": 1}})
    question["views"] += 1
    
    return question

@api_router.post("/questions/{question_id}/upvote")
async def upvote_question(question_id: str, user_id: str = Depends(get_current_user)):
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if user_id in question.get("upvotes", []):
        # Remove upvote
        await db.questions.update_one({"id": question_id}, {"$pull": {"upvotes": user_id}})
    else:
        # Add upvote
        await db.questions.update_one({"id": question_id}, {"$addToSet": {"upvotes": user_id}})
        # Award points to author
        if question["userId"] != user_id:
            await update_user_points(question["userId"], 2, "question_upvoted")
            
    updated_question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    return updated_question

@api_router.get("/questions/{question_id}/answers", response_model=List[Answer])
async def get_answers(question_id: str):
    answers = await db.answers.find({"questionId": question_id}, {"_id": 0}).sort([("isAccepted", -1), ("upvotes", -1)]).to_list(100)
    return answers

@api_router.post("/answers", response_model=Answer)
async def create_answer(answer_data: AnswerCreate, user_id: str = Depends(get_current_user)):
    # Check if question exists
    question = await db.questions.find_one({"id": answer_data.questionId})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    answer_id = str(uuid.uuid4())
    new_answer = {
        "id": answer_id,
        "questionId": answer_data.questionId,
        "userId": user_id,
        "content": answer_data.content,
        "isAccepted": False,
        "pointsAwarded": 0,
        "upvotes": [],
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.answers.insert_one(new_answer)
    
    # Update question status if it was open
    if question.get("status") == "open":
        await db.questions.update_one({"id": answer_data.questionId}, {"$set": {"status": "answered"}})
        
    # Award points for answering
    await update_user_points(user_id, 5, "answer_question")
    await check_and_award_badges(user_id, "create_answer")
    
    # Notify question author
    if question["userId"] != user_id:
        notification = {
            "id": str(uuid.uuid4()),
            "userId": question["userId"],
            "type": "new_answer",
            "message": f"New answer on your question: {question['title']}",
            "link": f"/questions/{question['id']}",
            "read": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
        if question["userId"] in active_connections:
            await sio.emit('new_notification', notification, room=active_connections[question["userId"]])
    
    return new_answer

@api_router.post("/answers/{answer_id}/upvote")
async def upvote_answer(answer_id: str, user_id: str = Depends(get_current_user)):
    answer = await db.answers.find_one({"id": answer_id})
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    if user_id in answer.get("upvotes", []):
        # Remove upvote
        await db.answers.update_one({"id": answer_id}, {"$pull": {"upvotes": user_id}})
    else:
        # Add upvote
        await db.answers.update_one({"id": answer_id}, {"$addToSet": {"upvotes": user_id}})
        # Award points to author
        if answer["userId"] != user_id:
            await update_user_points(answer["userId"], 5, "answer_upvoted")
            await check_and_award_badges(answer["userId"], "like_received") # Reusing like badge logic
            
    return {"message": "Upvote toggled"}

@api_router.put("/answers/{answer_id}/accept")
async def accept_answer(answer_id: str, helpful: bool = True, user_id: str = Depends(get_current_user)):
    answer = await db.answers.find_one({"id": answer_id})
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
        
    question = await db.questions.find_one({"id": answer["questionId"]})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if question["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Only question author can accept answers")
        
    # Mark answer as accepted
    points = 100 if helpful else 20
    await db.answers.update_one(
        {"id": answer_id}, 
        {"$set": {"isAccepted": True, "pointsAwarded": points}}
    )
    
    # Mark question as solved/closed if helpful
    if helpful:
        await db.questions.update_one({"id": question["id"]}, {"$set": {"status": "solved"}})
        
    # Award points to answer author
    await update_user_points(answer["userId"], points, "answer_accepted")
    
    return {"message": "Answer accepted"}

@api_router.get("/answers/{answer_id}/comments", response_model=List[Comment])
async def get_answer_comments(answer_id: str):
    comments = await db.comments.find({"answerId": answer_id}, {"_id": 0}).sort("createdAt", 1).to_list(1000)
    return comments

@api_router.post("/comments", response_model=Comment)
async def create_comment(comment_data: CommentCreate, user_id: str = Depends(get_current_user)):
    comment_id = str(uuid.uuid4())
    new_comment = {
        "id": comment_id,
        "userId": user_id,
        "content": comment_data.content,
        "postId": comment_data.postId,
        "answerId": comment_data.answerId,
        "parentId": comment_data.parentId,
        "upvotes": [],
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    
    await db.comments.insert_one(new_comment)
    
    # Award points for commenting
    await update_user_points(user_id, 1, "comment_created")
    
    # Notify parent comment author if reply
    if comment_data.parentId:
        parent = await db.comments.find_one({"id": comment_data.parentId})
        if parent and parent["userId"] != user_id:
             notification = {
                "id": str(uuid.uuid4()),
                "userId": parent["userId"],
                "type": "new_reply",
                "message": f"Someone replied to your comment",
                "link": f"/questions/TODO", # Ideally link to specific anchor
                "read": False,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
             await db.notifications.insert_one(notification)
             if parent["userId"] in active_connections:
                await sio.emit('new_notification', notification, room=active_connections[parent["userId"]])

    return new_comment

@api_router.post("/comments/{comment_id}/upvote")
async def upvote_comment(comment_id: str, user_id: str = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    if user_id in comment.get("upvotes", []):
        await db.comments.update_one({"id": comment_id}, {"$pull": {"upvotes": user_id}})
    else:
        await db.comments.update_one({"id": comment_id}, {"$addToSet": {"upvotes": user_id}})
        
    return {"message": "Upvote toggled"}

# ====================
# Routes - Tags
# ====================

@api_router.get("/tags/trending")
async def get_trending_tags(limit: int = 10):
    # Aggregate tags from posts in the last 7 days
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    pipeline = [
        {"$match": {"createdAt": {"$gte": cutoff}, "published": True}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    tags = await db.posts.aggregate(pipeline).to_list(limit)
    return [{"tag": t["_id"], "count": t["count"]} for t in tags]

@api_router.post("/tags/{tag}/follow")
async def follow_tag(tag: str, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"followingTags": tag}}
    )
    return {"message": f"Followed tag #{tag}"}

@api_router.delete("/tags/{tag}/follow")
async def unfollow_tag(tag: str, user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$pull": {"followingTags": tag}}
    )
    return {"message": f"Unfollowed #{tag}"}

@api_router.get("/tags/{tag}/info")
async def get_tag_info(tag: str):
    # Count posts with this tag
    post_count = await db.posts.count_documents({"tags": tag})
    
    # Count questions with this tag
    question_count = await db.questions.count_documents({"tags": tag})
    
    # Count followers
    follower_count = await db.users.count_documents({"followingTags": tag})
    
    return {
        "tag": tag,
        "postCount": post_count,
        "questionCount": question_count,
        "followerCount": follower_count
    }

@api_router.get("/badges")
async def get_badges():
    return BADGES


# ====================
# Routes - AI Chatbot
# ====================
# Note: AI chat route is defined above in "Routes - AI Chat" section


# ====================
# Routes - Activity Feed
# ====================

@api_router.get("/users/{username}/activity", response_model=List[Activity])
async def get_user_activity(username: str, skip: int = 0, limit: int = 50):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    activities = await db.activities.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1).skip(skip).limit(limit).to_list(limit)
    return activities

# ====================
# Socket.IO Events
# ====================

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    # Remove from active connections
    for user_id, conn_sid in list(active_connections.items()):
        if conn_sid == sid:
            del active_connections[user_id]
            break

@sio.event
async def authenticate(sid, data):
    try:
        token = data.get('token')
        user_id = decode_jwt_token(token)
        active_connections[user_id] = sid
        await sio.emit('authenticated', {'userId': user_id}, room=sid)
        logger.info(f"User {user_id} authenticated on socket {sid}")
    except Exception as e:
        await sio.emit('error', {'message': 'Authentication failed'}, room=sid)

@sio.event
async def send_message(sid, data):
    try:
        # data: {to: userId, content: str}
        sender_id = None
        for user_id, conn_sid in active_connections.items():
            if conn_sid == sid:
                sender_id = user_id
                break
        
        if not sender_id:
            return
        
        message = {
            "id": str(uuid.uuid4()),
            "senderId": sender_id,
            "receiverId": data['to'],
            "content": data['content'],
            "read": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.messages.insert_one(message)
        
        # Emit to receiver
        if data['to'] in active_connections:
            await sio.emit('receive_message', message, room=active_connections[data['to']])
        
        # Emit back to sender for confirmation
        await sio.emit('message_sent', message, room=sid)
    except Exception as e:
        logger.error(f"Error sending message: {e}")

@sio.event
async def typing(sid, data):
    try:
        sender_id = None
        for user_id, conn_sid in active_connections.items():
            if conn_sid == sid:
                sender_id = user_id
                break
        
        if not sender_id:
            return
        
        if data['to'] in active_connections:
            await sio.emit('user_typing', {'from': sender_id}, room=active_connections[data['to']])
    except Exception as e:
        logger.error(f"Error in typing event: {e}")

# Include router

# ====================
# Routes - Admin
# ====================

@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(admin: dict = Depends(get_current_admin_user)):
    users = await db.users.find({}, {"_id": 0, "passwordHash": 0}).to_list(1000)
    return users

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_current_admin_user)):
    # Delete user's posts, comments, answers, etc.
    await db.posts.delete_many({"authorId": user_id})
    await db.comments.delete_many({"userId": user_id})
    await db.questions.delete_many({"userId": user_id})
    await db.answers.delete_many({"userId": user_id})
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted successfully"}

@api_router.delete("/admin/posts/{post_id}")
async def admin_delete_post(post_id: str, admin: dict = Depends(get_current_admin_user)):
    await db.posts.delete_one({"id": post_id})
    # Also delete comments for this post
    await db.comments.delete_many({"postId": post_id})
    return {"message": "Post deleted successfully"}

app.include_router(api_router)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
