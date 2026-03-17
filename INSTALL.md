# ScrapeCore — Installation Guide

This guide covers two ways to install ScrapeCore:

- **Web app / Docker** — best for teams, servers, or anyone comfortable with a terminal
- **Desktop app (Electron)** — best for individual users on Windows, macOS, or Linux

No coding knowledge required for either path. Follow each step in order.

---

## What You Need Before You Start

You will need:

1. **An Anthropic API key** — this is what powers the AI analysis
2. *(Optional)* A Perplexity API key — for live web research and Twitter/X listening
3. *(Optional)* A Firecrawl API key — for scraping review sites like G2 and Capterra

All API keys are obtained online (you pay only for what you use). Instructions for each are below.

---

## Step 1 — Get Your Anthropic API Key

ScrapeCore uses Claude Opus 4.6 (Anthropic's most capable model) to analyse your data. You need an API key to use it.

1. Go to **[console.anthropic.com](https://console.anthropic.com)** in your browser
2. Click **Sign up** and create an account (or log in if you already have one)
3. Once logged in, click **API Keys** in the left sidebar
4. Click **Create Key**
5. Give it a name (e.g. "ScrapeCore") and click **Create Key**
6. **Copy the key now** — it starts with `sk-ant-` and you will not be able to see it again

> **Billing note:** Anthropic charges per use. A typical analysis costs roughly $0.05–$0.20 depending on the length of your input text. Add a payment method under **Billing** in the console and set a monthly spend limit to stay in control.

---

## Step 2 — Choose Your Installation Method

---

### Option A — Web App (Docker) — Recommended for teams

Docker runs ScrapeCore as a web server. Anyone on your network (or the internet) can use it via a browser — no installation needed on each person's computer.

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on any Windows, macOS, or Linux machine.

1. Download and install **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** if you don't have it
2. Download the ScrapeCore source code from this repository (click **Code → Download ZIP**, then unzip it)
3. Open a terminal and navigate to the unzipped folder:
   ```
   cd ScrapeCore-main
   ```
4. Copy the Docker environment template:
   ```
   cp .env.docker.example .env.docker
   ```
5. Open `.env.docker` in any text editor and fill in:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   NEXTAUTH_SECRET=any-long-random-string-at-least-32-characters
   ```
   For `NEXTAUTH_SECRET`, use any long random string (e.g. mash your keyboard). It just needs to be secret and long.
6. Start ScrapeCore:
   ```
   docker compose --env-file .env.docker up -d
   ```
7. Open **http://localhost:3000** in your browser

**First use:** The first person to open the app will be prompted to create an admin account (name, email, password). This account is stored locally — it is not linked to any external service.

> To stop ScrapeCore: `docker compose down`
> To update ScrapeCore: pull the latest code, then run `docker compose --env-file .env.docker up -d --build`

---

### Option B — Desktop App (Electron) — Recommended for individuals

The desktop app installs like any other program. Your data stays entirely on your computer.

#1. Go to the **Releases** page of this GitHub repository
2. Under the latest release, download **`ScrapeCore-Setup-x.x.x.exe`**
3. Double-click the downloaded file to run the installer
4. If Windows shows a "Windows protected your PC" warning, click **More info** → **Run anyway**
   *(This appears because the app is not yet code-signed — it is safe)*
5. Follow the installer steps and click **Install**
6. Once installed, find **ScrapeCore** in your Start Menu and open it

#### macOS

1. Go to the **Releases** page of this GitHub repository
2. Under the latest release, download **`ScrapeCore-x.x.x.dmg`**
3. Double-click the `.dmg` file to open it
4. Drag the **ScrapeCore** icon into your **Applications** folder
5. Open **Applications** and double-click **ScrapeCore**
6. If macOS says "ScrapeCore cannot be opened because it is from an unidentified developer":
   - Open **System Settings** → **Privacy & Security**
   - Scroll down and click **Open Anyway** next to the ScrapeCore message
   - Click **Open** in the confirmation dialog

#### Linux

1. Go to the **Releases** page of this GitHub repository
2. Under the latest release, download **`ScrapeCore-x.x.x.AppImage`**
3. Open a terminal, navigate to your Downloads folder, and make it executable:
   ```
   chmod +x ScrapeCore-*.AppImage
   ./ScrapeCore-*.AppImage
   ```
   Or right-click the file → **Properties** → **Permissions** → tick **Allow executing as program**, then double-click

---

## Step 3 — First Launch Setup (Desktop App)

When the desktop app opens for the first time, a **setup screen** will appear asking for your API key.

1. Paste your Anthropic API key (the one starting with `sk-ant-`) into the field
2. Click **Save and Launch**
3. ScrapeCore will open and you are ready to use it

> Your API key is stored securely on your computer. It is never sent anywhere except to Anthropic when you run an analysis.

> **Docker/web users:** Skip this step — you already added your API key to `.env.docker` in Step 2.

---

## Step 4 — Running Your First Analysis

### 4a. Prepare your text

ScrapeCore analyses **qualitative text**: interview transcripts, survey open-ends, customer reviews, forum posts, Reddit threads, support tickets, or any text where people describe their experiences, thoughts, and behaviours.

Good inputs:
- "Here are 50 customer interview transcripts about why people churn from our product…"
- "Below are 200 App Store reviews mentioning friction…"
- "This is a Reddit thread where startup founders discuss hiring…"

The more text you provide (up to ~50,000 words), the richer the analysis.

### 4b. Paste and analyse

1. Open ScrapeCore — you land on the **Analyse** tab
2. In the left panel, type or paste your text into the large input area
3. *(Optional)* Add a title and tag for this analysis so you can find it later
4. Click the **Analyse** button
5. Wait 20–60 seconds while Claude processes your text
6. Results appear on the right panel

### 4c. Reading the results

Your analysis is structured into sections:

| Section | What it tells you |
|---|---|
| **COM-B Chart** | Visual breakdown of Capability, Opportunity, and Motivation signals found in the text |
| **COM-B Mapping** | Detailed list of signals per sub-dimension (physical, psychological, social, etc.) |
| **Key Behaviours** | The specific behaviours your audience is performing, rated by frequency and importance |
| **Barriers** | What stops people from doing the target behaviour, ranked by severity |
| **Motivators & Enablers** | What drives people toward the behaviour, ranked by strength |
| **Intervention Opportunities** | Ranked, actionable recommendations — each mapped to a BCW category and specific BCT techniques |
| **Contradictions & Tensions** | Where the evidence conflicts and what that might mean |
| **Evidence Confidence** | How much you should trust this analysis, with identified limitations |
| **Recommended Next Research** | What additional data would sharpen the findings |

---

## Step 5 — Adding Data Sources (Optional)

Instead of pasting text manually, ScrapeCore can collect data from external sources for you.

### Scrape a URL

1. In the left panel, click the **Sources** tab
2. Under **Web Scraper**, paste in one or more URLs (company websites, blog posts, landing pages)
3. Click **Fetch** — the text will be extracted and added to your input

### Collect G2 or Capterra Reviews

1. In the **Sources** tab, scroll to **B2B Reviews**
2. Enter the product slug (the part of the URL after `g2.com/products/` or `capterra.com/p/`)
   - Example: for `g2.com/products/notion/reviews`, the slug is `notion`
3. Set how many pages of reviews to collect
4. Click **Fetch Reviews**

### Live Research with Perplexity (requires Perplexity API key)

1. Obtain a Perplexity API key at **[perplexity.ai](https://www.perplexity.ai/settings/api)**
2. Go to ScrapeCore **Settings** and add your `PERPLEXITY_API_KEY`
3. In the **Sources** tab under **The Eyes**, type a research query
4. Choose a recency window (day / week / month) and click **Fetch**
5. Perplexity will search the live web and return structured research findings

### Twitter/X Social Listening (requires Perplexity API key)

1. In the **Sources** tab under **The Eyes**, switch to the **Twitter/X** tab
2. Enter a search query (e.g. "why did you stop using [product]")
3. Click **Fetch** — Perplexity searches Twitter/X and returns relevant posts

### JS-Rendered Sites with Firecrawl (requires Firecrawl API key)

Some websites (including G2 and Capterra) load their content with JavaScript, which basic scrapers cannot read.

1. Obtain a Firecrawl API key at **[firecrawl.dev](https://firecrawl.dev)**
2. Go to ScrapeCore **Settings** and add your `FIRECRAWL_API_KEY`
3. In the **Web Scraper** section, toggle **Firecrawl** on
4. Scrape as normal — you will get much better results from review sites

---

## Step 6 — Comparing Two Analyses

The **Compare** tab lets you pick any two saved analyses and see a side-by-side COM-B diff — useful for competitor benchmarking or before/after research.

1. Click **Compare** in the top navigation
2. Use the dropdowns to select Analysis A and Analysis B from your history
3. The page shows charts for both, and highlights:
   - **Shared** findings (both analyses agree)
   - **Only in A** (unique to the first)
   - **Only in B** (unique to the second)

---

## Step 7 — Dashboard and History

- **Dashboard** — shows aggregate stats across all your analyses: COM-B dimension frequency, confidence distribution, source type breakdown, and activity trends
- **History** — searchable log of all past analyses. Click any row to reload the full results. Use the search box to filter by title, or filter by tag/project

---

## Step 8 — Exporting Results

At the top of any analysis result, click the **Export** button to download:
- **JSON** — full structured data for further processing
- **PDF** — formatted report for sharing with stakeholders

---

## All the Pages — What Each One Does

Once you are running ScrapeCore, you will see a navigation bar at the top with these pages:

| Page | What it does |
|---|---|
| **Analyse** | Your main workspace. Paste text, scrape URLs, or collect reviews — then run the analysis |
| **Dashboard** | Summary charts across all your past analyses: COM-B patterns, quality scores, activity over time |
| **Compare** | Pick any two analyses and see a side-by-side COM-B comparison — useful for competitor benchmarking or before/after research |
| **Eval Lab** | Quality review tools — rubric scores per analysis, side-by-side comparison of two analyses to track whether prompt changes improved results |
| **Monitor** | Set up scheduled scans of a competitor — ScrapeCore will automatically re-run an analysis on their reviews or web presence at a set interval |
| **Audit Log** | A full record of every analysis run, export, and review action — useful for regulated or enterprise use |

---

## Troubleshooting

### "Analysis failed" error

- Check your Anthropic API key is correctly set (no extra spaces)
- Check you have a payment method added in the Anthropic console
- If your text is very long (over 100,000 words), try splitting it into smaller batches

### The app won't open on macOS

- See the "unidentified developer" steps in Step 2 (macOS) above
- If that doesn't work, try: open Terminal, type `xattr -d com.apple.quarantine ~/Applications/ScrapeCore.app` and press Enter, then reopen the app

### The app won't open on Windows

- Right-click the `.exe` installer and choose **Run as administrator**
- If Windows Defender blocks it, click **More info** → **Run anyway**

### No results from G2 or Capterra

- These sites are heavily JavaScript-rendered. Enable Firecrawl for much better results
- Check the slug is correct — it should be just the product name part, not the full URL

### Slow analysis

- Analysis speed depends on your internet connection and text length
- A typical 5,000-word input takes 20–40 seconds
- Very long inputs (20,000+ words) may take 60–90 seconds

---

## API Key Cost Reference

| Service | Free tier | Typical cost per analysis |
|---|---|---|
| Anthropic (required) | $5 free credit on signup | ~$0.05–$0.20 |
| Perplexity (optional) | $5 free credit on signup | ~$0.005 per query |
| Firecrawl (optional) | 500 free scrapes/month | ~$0.001 per page |

---

## Getting Help

If you run into a problem not covered here, raise an issue on the GitHub repository or contact the project team directly.
