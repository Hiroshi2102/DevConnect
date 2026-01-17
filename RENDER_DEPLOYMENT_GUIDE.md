# 🚀 Render.com Deployment Guide (100% FREE)

## Why Render?
- ✅ **Completely FREE** - No credit card required
- ✅ Supports full backend apps (FastAPI + Socket.IO)
- ✅ Auto-deploys from GitHub
- ✅ You already have `render.yaml` configured!
- ⚠️ Only downside: 15-30s cold start after 15 min inactivity

---

## 📋 Step-by-Step Deployment

### Step 1: Push Code to GitHub (if not already)

```bash
# Initialize git if needed
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/DevConnect.git
git branch -M main
git push -u origin main
```

### Step 2: Sign Up on Render

1. Go to https://render.com
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (easiest)
4. Authorize Render to access your repositories

### Step 3: Create New Blueprint

1. Click **"New +"** → **"Blueprint"**
2. Connect your **DevConnect** repository
3. Render will automatically detect `render.yaml`
4. Click **"Apply"**

### Step 4: Set Environment Variables

In the Render Dashboard, for the **backend service**, add these environment variables:

**Copy these from your local `backend/.env` file:**

```
MONGO_URL = <your MongoDB connection string>
DB_NAME = devconnect_db
JWT_SECRET = <your JWT secret>
GEMINI_API_KEY = <your Gemini API key>
CLOUDINARY_CLOUD_NAME = <your Cloudinary cloud name>
CLOUDINARY_API_KEY = <your Cloudinary API key>
CLOUDINARY_API_SECRET = <your Cloudinary API secret>
GROQ_API_KEY = <your Groq API key>
GROQ_MODEL = llama-3.3-70b-versatile
MAIL_USERNAME = <your Gmail address>
MAIL_PASSWORD = <your Gmail app password>
CORS_ORIGINS = *
```

**Note:** CORS_ORIGINS will be automatically updated with your frontend URL after deployment

### Step 5: Deploy!

- Render will automatically build and deploy both:
  - **Backend**: `https://devconnect-backend.onrender.com`
  - **Frontend**: `https://devconnect-frontend.onrender.com`

### Step 6: Update CORS (After Deployment)

Once deployed, update CORS in backend environment variables:
```
CORS_ORIGINS = https://devconnect-frontend.onrender.com,http://localhost:3000
```

---

## 🎯 What Happens Automatically

Your `render.yaml` already configures:
- ✅ Backend deployment with correct Python version
- ✅ Frontend deployment with build commands
- ✅ Environment variables linking
- ✅ Auto-redeploy on git push

---

## 📊 After Deployment

**Monitor your app:**
- View logs in Render Dashboard
- Check build status
- Monitor performance

**Auto-redeploy:**
- Every `git push` triggers automatic redeployment
- No manual steps needed!

---

## 🆓 Free Tier Limits

- ✅ Unlimited projects
- ✅ 750 hours/month free
- ✅ Auto-deploy from GitHub
- ⚠️ Apps sleep after 15 min inactivity (15-30s wake up time)
- ✅ 100GB bandwidth/month

---

## 🐛 Troubleshooting

**Build failed?**
- Check logs in Render Dashboard
- Verify `requirements.txt` is correct
- Check environment variables are set

**App sleeping?**
- Free tier apps sleep after 15 min
- First request takes 15-30 seconds
- Keep-alive services available (search "render keep alive")

**Need to update?**
- Just `git push` to your repo
- Render auto-deploys!

---

## 🚀 Your URLs After Deployment

- **Backend**: `https://devconnect-backend.onrender.com`
- **Frontend**: `https://devconnect-frontend.onrender.com`
- **Local Development**: Keep using localhost!

---

**That's it! Much simpler than Fly.io and 100% FREE! 🎉**
