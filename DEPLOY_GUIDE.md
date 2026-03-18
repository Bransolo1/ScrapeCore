# ScrapeCore — Idiot's Guide to Getting This Live on the Web

**Time needed:** ~20 minutes
**Cost:** $0
**Skill level:** If you can copy-paste, you can do this

---

## What We're Doing

Right now ScrapeCore only runs on your computer. We're going to put it on the internet so anyone with the link can use it. Two free services make this happen:

- **Vercel** — hosts the app (like a free web server that runs Next.js apps)
- **Turso** — hosts the database (like a free cloud version of your SQLite file)

When we're done you'll have a URL like `https://scrapecore.vercel.app` that works for everyone.

---

## Step 1: Get a Turso Account (the database)

### 1a — Sign up (no terminal needed!)

1. Go to **[turso.tech](https://turso.tech)**
2. Click **Sign Up** → sign in with **GitHub** (free, no credit card)

### 1b — Create your database

1. Once logged in, click **Create Database**
2. Name it `scrapecore`
3. Pick the closest region to your users
4. Click **Create**

### 1c — Get your connection details

1. Click on your new `scrapecore` database
2. You'll see a URL like `libsql://scrapecore-yourname.turso.io`
   **Copy this. This is your DATABASE_URL.**
3. Click **Generate Token** (or look for a "Create Token" / "..." menu)
4. Create a **read-write** token
5. Copy the long string it gives you (starts with `eyJ...`)
   **Copy this. This is your TURSO_AUTH_TOKEN.**

Save both somewhere — you'll paste them into Vercel in Step 2.

### 1d — Database tables (automatic!)

**You don't need a terminal for this.** After deploying to Vercel (Step 2), you'll hit a setup URL once and it creates all the tables automatically. Instructions in Step 3.

---

## Step 2: Get a Vercel Account (the web host)

### 2a — Sign up

1. Go to **[vercel.com](https://vercel.com)**
2. Click **Sign Up**
3. Choose **Continue with GitHub** (easiest — it needs access to your repo)
4. Authorize Vercel to see your GitHub repos

### 2b — Import your project

1. Once logged in, click **Add New...** → **Project**
2. Find **ScrapeCore** in the repo list and click **Import**
3. Vercel auto-detects it's a Next.js app — don't change any settings yet
4. **DON'T click Deploy yet** — we need to add environment variables first

### 2c — Add environment variables

On the import page, expand the **Environment Variables** section. Add these one at a time:

| Name | Value | Where to get it |
|---|---|---|
| `DATABASE_URL` | `libsql://scrapecore-yourname.turso.io` | Step 1d above |
| `TURSO_AUTH_TOKEN` | `(the long token string)` | Step 1d above |
| `NEXTAUTH_SECRET` | `(any random 32+ character string)` | See below |
| `NEXTAUTH_URL` | `https://scrapecore.vercel.app` | This is your app URL — change `scrapecore` if Vercel gives you a different subdomain |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Your API key from [console.anthropic.com](https://console.anthropic.com) — or leave blank if users bring their own |

**To generate NEXTAUTH_SECRET**, run this in your terminal:
```bash
openssl rand -base64 32
```
Or just mash your keyboard for 32+ characters. Seriously. It just needs to be long and random.

**Optional extras** (skip if you don't use them):

| Name | Value |
|---|---|
| `PERPLEXITY_API_KEY` | Your Perplexity key (for live research + social listening) |
| `FIRECRAWL_API_KEY` | Your Firecrawl key (for JS-rendered scraping) |
| `CRON_SECRET` | Any random string (protects the scheduled monitoring endpoint) |

### 2d — Deploy

Click **Deploy**.

Wait 2-3 minutes. Vercel builds the app, installs dependencies, generates the Prisma client, and deploys.

When it's done you'll see a confetti animation and a preview of your app.

### 2e — Visit your app

Click the link Vercel gives you. It'll be something like:

```
https://scrapecore.vercel.app
```

**You should see the ScrapeCore login page.** Register your first account — this becomes the admin.

---

## Step 3: Set Up the Database Tables

After Vercel deploys, you need to create the database tables once. No terminal needed — just visit a URL.

1. Open your browser
2. Go to: `https://YOUR-APP.vercel.app/api/setup`
   - It will ask for authorization
3. Add your `NEXTAUTH_SECRET` as a Bearer token. Easiest way:
   - Open your browser's developer tools (F12) → Console tab
   - Paste this (replace `YOUR-SECRET` with your actual NEXTAUTH_SECRET from Step 2c):
   ```javascript
   fetch('/api/setup', { headers: { 'Authorization': 'Bearer YOUR-SECRET' } }).then(r => r.json()).then(console.log)
   ```
4. You should see: `{ success: true, message: "All tables and indexes created..." }`

**Or** use any API tool (Postman, curl on a friend's computer, etc.):
```
GET https://YOUR-APP.vercel.app/api/setup
Authorization: Bearer YOUR-NEXTAUTH-SECRET
```

**This only needs to be done once. After that, never touch it again.**

---

## Step 4: Test It

1. Go to `https://YOUR-APP.vercel.app`
2. You should see the login/register page
3. Register your first account — this becomes the admin
4. Go to the main Analyse tab
5. Paste some sample text (a product review, interview transcript, anything)
6. Click **Run analysis**
7. Wait 20-60 seconds
8. You should see the full COM-B analysis results

If that works, **you're live on the web**. Send the URL to anyone.

---

## That's It. You're Done.

Your app is now:
- Live at `https://scrapecore.vercel.app`
- Database hosted on Turso (free)
- Auto-deploys when you push to GitHub
- SSL/HTTPS included automatically
- Scales automatically

---

## Common Problems & Fixes

### "Build failed" on Vercel
- Go to Vercel dashboard → your project → **Deployments** → click the failed one → **Logs**
- 90% of the time it's a missing environment variable. Double-check you added all 4 required ones.

### "Analysis failed" after deploying
- Check `ANTHROPIC_API_KEY` is set in Vercel env vars
- Make sure your Anthropic account has billing set up at [console.anthropic.com](https://console.anthropic.com)

### Database errors / "table not found"
- You forgot step 1e. Run the `npx prisma db push` command with your Turso credentials.

### "Invalid URL" or auth errors
- Make sure `NEXTAUTH_URL` matches your actual Vercel URL exactly (including `https://`)
- Make sure `NEXTAUTH_SECRET` is set

### Analysis times out (large inputs)
- Vercel free tier has a 60-second function limit
- Keep inputs under ~10,000 words on free tier
- If you need longer: upgrade to Vercel Pro ($20/mo) for 300-second limits

### I changed code but the site didn't update
- Push to your `main` branch on GitHub. Vercel auto-deploys on every push.
- Check Vercel dashboard → Deployments to see if a build is running.

### I want a custom domain (like scrapecore.com)
1. Buy a domain anywhere (Namecheap, Google Domains, etc.)
2. Vercel Dashboard → Project → Settings → Domains → Add
3. Follow the DNS instructions Vercel gives you (usually: add a CNAME record)
4. Update `NEXTAUTH_URL` in Vercel env vars to match your new domain

---

## Monthly Cost Breakdown

| Service | Free Tier Limit | What It Means |
|---|---|---|
| **Vercel** | 100GB bandwidth, 100 hrs compute | ~thousands of analyses per month |
| **Turso** | 9GB storage, 25M row reads | ~tens of thousands of analyses |
| **Anthropic** | $5 free credit on signup | ~25-100 analyses before you pay |
| **Total** | **$0/month** | Until you hit serious scale |

---

## Quick Reference

| Thing | Where |
|---|---|
| Your app | `https://scrapecore.vercel.app` |
| Vercel dashboard | [vercel.com/dashboard](https://vercel.com/dashboard) |
| Turso dashboard | [turso.tech/dashboard](https://turso.tech/app) |
| Anthropic console | [console.anthropic.com](https://console.anthropic.com) |
| Change env vars | Vercel → Project → Settings → Environment Variables |
| Redeploy | Push to GitHub, or Vercel → Deployments → Redeploy |
| View logs | Vercel → Project → Logs |
| Database browser | `turso db shell scrapecore` in terminal |
