# 🚀 DevConnect Deployment Guide

## Quick Start (100% Free)

Your app is ready to deploy on **Koyeb** (backend) and **Vercel** (frontend). Both are completely free, no credit card required.

---

## Backend: Deploy on Koyeb

### 1. Sign Up
- Go to **https://koyeb.com**
- Click "Sign up" with GitHub
- No credit card needed!

### 2. Create New App
1. Click **"Create App"**
2. Select **"Deploy from GitHub"**
3. Choose repository: **Hiroshi2102/DevConnect**

### 3. Configure
- **Builder:** Docker
- **Dockerfile path:** `backend/Dockerfile`  
- **Port:** 8000
- **Instance:** Free (Nano)

### 4. Environment Variables

**Copy these values from your local `backend/.env` file:**

```
MONGO_URL=<your MongoDB connection string>
DB_NAME=devconnect_db
JWT_SECRET=<your JWT secret>
GEMINI_API_KEY=<your Gemini API key>
CLOUDINARY_CLOUD_NAME=<your Cloudinary name>
CLOUDINARY_API_KEY=<your Cloudinary key>
CLOUDINARY_API_SECRET=<your Cloudinary secret>
GROQ_API_KEY=<your Groq API key>
GROQ_MODEL=llama-3.3-70b-versatile
MAIL_USERNAME=<your Gmail>
MAIL_PASSWORD=<your Gmail app password>
CORS_ORIGINS=*
```

> **Note:** All these values are in your local `backend/.env` file. Just copy-paste them into Koyeb.

### 5. Deploy
- Click **"Deploy"**
- Wait 3-5 minutes
- Copy your backend URL: `https://YOUR-APP.koyeb.app`

---

## Frontend: Deploy on Vercel

### 1. Sign Up
- Go to **https://vercel.com**
- Sign up with GitHub

### 2. Import Project
1. Click **"Add New..."** → **"Project"**
2. Select **Hiroshi2102/DevConnect**

### 3. Configure
- Framework: Create React App (auto-detected)
- Root Directory: `./`

### 4. Environment Variable
Add one variable:
- Name: `REACT_APP_BACKEND_URL`
- Value: Your Koyeb backend URL (from step above)

### 5. Deploy
- Click **"Deploy"**
- Wait 2-3 minutes
- Done!

---

## Final Step: Update CORS

1. Go to Koyeb dashboard
2. Your app → **Settings** → **Environment**
3. Edit `CORS_ORIGINS` to:
   ```
   https://YOUR-FRONTEND.vercel.app,http://localhost:3000
   ```
4. Redeploy

---

## ✅ Your Site is Live!

- **Frontend:** https://YOUR-APP.vercel.app
- **Backend:** https://YOUR-APP.koyeb.app

## 💰 Cost
**$0** - Completely free forever!

## 📝 Local Development
Still works! Just run:
```bash
# Backend
cd backend && python -m uvicorn server:app --reload

# Frontend  
cd frontend && npm start
```

---

**Need help?** Check the logs in Koyeb/Vercel dashboards.
