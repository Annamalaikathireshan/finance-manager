# Deployment Guide

## 1. Running Locally

You can now run the application locally using the following commands:

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```
*Runs on http://localhost:5000*

**Terminal 2 (Frontend):**
```bash
npm start
```
*Runs on http://localhost:4200*

---

## 2. Deployment Options

Since this is a MEAN stack application (MongoDB, Express, Angular, Node.js), you need a hosting provider that supports Node.js backends.

### Recommended: Render (Free Tier Available)

**Render** is excellent for full-stack applications.

#### Step 1: Prepare for Deployment
1.  **Build the Angular App**:
    The backend should serve the frontend in production.
    In `server/index.js`, we already added code to serve `client/dist/finance-manager`.
    
    You need to move the built Angular files to the server directory or configure the build command to put them there.
    
    **Option A (Monorepo deployment)**:
    - Root `package.json` should have a `build` script that builds the angular app and installs server deps.
    - Root `start` script should run the server.

#### Step 2: Configure for Render
1.  Create a `render-build.sh` file in the root directory:
    ```bash
    #!/usr/bin/env bash
    # Install dependencies
    npm install
    cd server && npm install
    cd ..
    
    # Build Angular app
    npm run build
    
    # Move build artifacts to server/client/dist (if not already there)
    # Angular builds to dist/finance-manager by default.
    # Our server expects client/dist/finance-manager.
    mkdir -p server/client/dist
    cp -r dist server/client/
    ```
    *Make sure to give it execution permissions: `chmod +x render-build.sh`*

2.  **Push to GitHub**: Ensure your code is on GitHub.

3.  **Create Web Service on Render**:
    - Connect your GitHub repo.
    - **Build Command**: `./render-build.sh`
    - **Start Command**: `cd server && node index.js`
    - **Environment Variables**:
        - `MONGO_URI`: Your MongoDB connection string.
        - `GOOGLE_CLIENT_ID`: Your Google Client ID.
        - `GOOGLE_CLIENT_SECRET`: Your Google Client Secret.
        - `COOKIE_KEY`: A random string.
        - `NODE_ENV`: `production`

### Alternative: Vercel (Frontend) + Render (Backend)

1.  **Backend (Render)**:
    - Deploy only the `server` folder to Render.
    - Set `start` command to `node index.js`.
    - Add Env Vars.

2.  **Frontend (Vercel)**:
    - Deploy the Angular app to Vercel.
    - Update `environment.prod.ts` in Angular to point to the Render Backend URL instead of `/api`.
    - *Note: This requires changing the Auth flow to handle cross-domain cookies or using JWTs, which is more complex.*

**Recommendation**: Stick to the **Monorepo deployment on Render** (Option 1) as it keeps the Auth flow simple (same domain cookies).

## 3. MongoDB Atlas (Database)
1.  Create a cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2.  Get the connection string (URI).
3.  Allow access from anywhere (`0.0.0.0/0`) in Network Access (or specifically Render's IPs if possible).

## 4. Google OAuth
1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Update "Authorized JavaScript origins" and "Authorized redirect URIs" with your deployed domain (e.g., `https://your-app.onrender.com` and `https://your-app.onrender.com/auth/google/callback`).
