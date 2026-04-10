# Deployment Instructions

Your production-ready code is in the `noble-poketrades-prod` folder.

## 1. Create a GitHub Repository
- Create a new empty repository on GitHub.
- Open your terminal in the `noble-poketrades-prod` folder.
- Run:
  ```bash
  git init
  git add .
  git commit -m "Initial commit for production"
  git branch -M main
  git remote add origin YOUR_GITHUB_REPO_URL
  git push -u origin main
  ```

## 2. Deploy to Render
- Go to [Render.com](https://render.com) and create a free account.
- **Step A: Database**
  - Click "New" -> "PostgreSQL".
  - Name it `poketrades-db`.
  - Once created, copy the **Internal Database URL** or **External Database URL**.
- **Step B: Web Service**
  - Click "New" -> "Web Service".
  - Connect your GitHub repository.
  - Runtime: `Node`.
  - Build Command: `npm install`.
  - Start Command: `node server.js`.
  - **Environment Variables**:
    - Click "Advanced" or "Environment".
    - Add `DATABASE_URL` and paste the Database URL you copied earlier.
- **Step C: Live!**
  - Render will give you a URL like `https://noble-poketrades.onrender.com`.
  - Anyone can now visit that link, create an account, and sync their cards!

## 3. Local Development
You can still run it locally by running `node server.js`. It will automatically fallback to the local JSON files if it doesn't see the database variable.
