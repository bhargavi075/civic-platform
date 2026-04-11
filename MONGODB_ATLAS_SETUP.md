# 🍃 MongoDB Atlas Setup Guide for Civic Voice

## Step 1: Create a Free MongoDB Atlas Account

1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Click **"Try Free"** → Sign up with Google or Email
3. Choose the **Free (M0)** tier — no credit card needed

---

## Step 2: Create a Cluster

1. After signing in, click **"Build a Database"**
2. Select **M0 Free** tier
3. Choose a cloud provider (AWS/GCP/Azure) and a region **close to you** (e.g., Mumbai for India)
4. Name your cluster (e.g., `civic-voice-cluster`)
5. Click **"Create Cluster"** — wait ~2 minutes

---

## Step 3: Create a Database User

1. In the left sidebar, go to **Security → Database Access**
2. Click **"Add New Database User"**
3. Choose **Password** authentication
4. Enter:
   - **Username:** `civic_admin` (or any name)
   - **Password:** Generate a strong password — **SAVE IT!**
5. Under **Built-in Role**, select **"Atlas admin"** or **"Read and write to any database"**
6. Click **"Add User"**

---

## Step 4: Whitelist Your IP Address

1. Go to **Security → Network Access**
2. Click **"Add IP Address"**
3. For **deployment**, click **"Allow Access from Anywhere"** → `0.0.0.0/0`
   - ⚠️ This is needed for platforms like Render, Railway, Vercel, etc.
4. Click **"Confirm"**

---

## Step 5: Get Your Connection String

1. Go to **Database → Connect** (on your cluster)
2. Click **"Connect your application"**
3. Choose **Node.js** and version **5.5 or later**
4. Copy the connection string — it looks like:
   ```
   mongodb+srv://civic_admin:<password>@civic-voice-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password from Step 3
6. Add your database name before the `?`: 
   ```
   mongodb+srv://civic_admin:yourpassword@civic-voice-cluster.xxxxx.mongodb.net/civic_platform?retryWrites=true&w=majority
   ```

---

## Step 6: Update Your .env File

Open `backend/.env` and replace the `MONGODB_URI` line:

```env
PORT=5000
MONGODB_URI=mongodb+srv://civic_admin:yourpassword@civic-voice-cluster.xxxxx.mongodb.net/civic_platform?retryWrites=true&w=majority
JWT_SECRET=civic_platform_jwt_secret_change_in_production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GROQ_API_KEY=your_groq_api_key
```

> ⚠️ Never commit your `.env` file to GitHub! Make sure `.env` is in `.gitignore`

---

## Step 7: Verify It Works Locally

```bash
cd civic_platform/backend
npm install
node server.js
```

You should see:
```
🚀 Server running on port 5000
✅ MongoDB Atlas connected successfully
📦 Database: civic_platform
```

Then test registration:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

You should get a token back, and the user will appear in Atlas under:
**Database → Browse Collections → civic_platform → users**

---

## Step 8: Verify Users Are Stored in Atlas

1. Go to your Atlas cluster → **"Browse Collections"**
2. Look for the `civic_platform` database
3. Click on the `users` collection
4. After registering, you'll see the user document with name, email, role, etc.

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `Authentication failed` | Wrong password in URI — re-check Step 3 |
| `IP not whitelisted` | Add `0.0.0.0/0` in Network Access (Step 4) |
| `ECONNREFUSED` | Still using localhost URI — update MONGODB_URI |
| `bad auth` | URL-encode special chars in password (e.g., `@` → `%40`) |
| Collections not showing | Register a user first to create the collection |

---

## For Deployment (Render / Railway / Vercel)

Set these **environment variables** in your hosting platform's dashboard:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | A long random string (use [randomkeygen.com](https://randomkeygen.com)) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your deployed frontend URL |
| `GROQ_API_KEY` | Your Groq API key |

