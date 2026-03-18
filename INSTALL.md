# ScrapeCore — Installation & User Guide

This guide covers everything from installation to running your first analysis.

---

## Before you start — get an Anthropic API key

ScrapeCore uses **Claude Opus 4.6** to analyse your data. You need an API key.

1. Go to **[console.anthropic.com](https://console.anthropic.com)** and sign up (or log in)
2. Click **API Keys** in the left sidebar → **Create Key**
3. Give it a name (e.g. "ScrapeCore") and click **Create Key**
4. **Copy the key now** — it starts with `sk-ant-` and won't be shown again

> **Cost:** Anthropic charges per use. A typical analysis costs ~$0.05–$0.20 depending on input length. Add a payment method under **Billing** and set a monthly spend limit to stay in control.

---

## Install — Desktop App (recommended)

No terminal. No Docker. No Node.js. Works on Windows, macOS, and Linux.

### Download

Go to the **[Releases page](../../releases/latest)** and download the file for your OS:

| OS | File |
|---|---|
| **Windows** | `ScrapeCore-Setup-{version}.exe` |
| **macOS** | `ScrapeCore-{version}.dmg` |
| **Linux** | `ScrapeCore-{version}.AppImage` |

### Install

**Windows:**
1. Double-click `ScrapeCore-Setup-{version}.exe`
2. If Windows shows "Windows protected your PC" → click **More info** → **Run anyway**
   *(This appears because the app is not yet code-signed — it is safe)*
3. Follow the installer steps and click **Install**
4. Open ScrapeCore from the Start Menu

**macOS:**
1. Double-click the `.dmg` file → drag **ScrapeCore** to **Applications**
2. Open the app. If macOS says "unidentified developer":
   - Go to **System Settings → Privacy & Security**
   - Click **Open Anyway** next to the ScrapeCore message, then click **Open**

**Linux:**
1. Open a terminal in your Downloads folder:
   ```
   chmod +x ScrapeCore-*.AppImage
   ./ScrapeCore-*.AppImage
   ```
   Or right-click → **Properties → Permissions → Allow executing as program**, then double-click

### Add your API key

The app opens immediately — no setup screen blocks you.

1. Click the **⚙** gear icon in the top-right corner of the app
2. Paste your Anthropic API key into the field
3. Click **Save** — the key is active immediately, no restart needed

> Your API key is stored on your computer only. It is sent to Anthropic when you run an analysis, and nowhere else.

---

## Install — Docker (teams and self-hosted)

Best if you want one shared instance your whole team can access via a browser.

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
# 1. Download the source code (Code → Download ZIP on GitHub, then unzip)
cd ScrapeCore

# 2. Copy the environment template
cp .env.docker.example .env.docker

# 3. Edit .env.docker and fill in:
#    ANTHROPIC_API_KEY=sk-ant-your-key-here
#    NEXTAUTH_SECRET=any-long-random-string-32-chars-minimum

# 4. Start
docker compose --env-file .env.docker up -d
```

Open **http://localhost:3000**. The first person to visit registers the admin account.

> Stop: `docker compose down`
> Update: pull latest code, then `docker compose --env-file .env.docker up -d --build`

---

## Your first analysis

### Step 1 — Prepare your text

ScrapeCore analyses qualitative text: interview transcripts, survey open-ends, customer reviews, forum posts, support tickets — any text where people describe their experiences and behaviours.

**Good inputs:**
- 50 customer interview transcripts about why people churn
- 200 App Store reviews mentioning friction points
- A Reddit thread where users discuss a competitor product

The more text you provide, the richer the analysis. The input limit is **~15,000 words (~100KB)**. For larger datasets, split into batches using Batch mode (see below).

### Step 2 — Paste and run

1. Open ScrapeCore — you land on the **Analyse** tab
2. Paste your text into the input area on the left
3. *(Optional)* Select a data type from the dropdown (Survey, Reviews, Interviews, etc.)
4. *(Optional)* Add a project context — a sentence describing what you're researching
5. Click **Run analysis**
6. A 7-step progress indicator shows what Claude is doing
7. Results appear on the right in 20–60 seconds

### Step 3 — Read the results

| Section | What it tells you |
|---|---|
| **COM-B Chart** | Visual breakdown of Capability, Opportunity, and Motivation signals |
| **COM-B Mapping** | Full list of signals per sub-dimension (physical, psychological, social, etc.) |
| **Key Behaviours** | Specific behaviours observed in the text, rated by frequency and importance |
| **Barriers** | What stops people from doing the target behaviour, ranked by severity |
| **Motivators & Facilitators** | What drives and enables the behaviour, ranked by strength |
| **Intervention Opportunities** | Ranked, actionable recommendations mapped to BCW categories and BCT techniques |
| **Contradictions & Tensions** | Where evidence conflicts and what it may mean |
| **Confidence Assessment** | How much to trust this analysis, with identified limitations |
| **Recommended Next Research** | What additional data would sharpen the findings |

### Step 4 — Export

At the top of any results panel, click **Export** to download:
- **PDF** — formatted report ready to share (opens browser print dialog → Save as PDF)
- **Markdown** — structured text report
- **JSON** — full structured data for further processing

---

## Collecting data from external sources

Instead of pasting text manually, ScrapeCore can fetch data for you.

### Scrape a URL

1. Click the **Scrape URLs** tab in the left panel
2. Paste one or more URLs
3. Click **Fetch** — text is extracted and ready to analyse

### Social listening (Reddit, HackerNews, App Store, Play Store)

1. Click the **Social listening** tab
2. Enter a product name or keywords
3. Select a source and click **Fetch**

### Competitor digital footprint

1. Click the **Digital footprint** tab
2. Enter a competitor URL
3. Click **Fetch** — ScrapeCore builds a profile from their public content

### Live research with Perplexity *(optional — requires Perplexity API key)*

1. Get a key at **[perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)**
2. Click ⚙ in ScrapeCore → paste your `PERPLEXITY_API_KEY` → Save
3. The **Social listening** tab now includes a live web research option

### JS-rendered sites with Firecrawl *(optional — required for G2 and Capterra)*

1. Get a key at **[firecrawl.dev](https://firecrawl.dev)**
2. Click ⚙ in ScrapeCore → paste your `FIRECRAWL_API_KEY` → Save
3. In the URL scraper, enable **Firecrawl** and scrape as normal

---

## Batch mode — analyse multiple documents at once

1. Click the **Batch** tab in the left panel
2. Two document slots appear by default — click **+** to add more
3. Give each document a title, select its data type, and paste the text
4. Click **Run all** — documents are analysed in sequence
5. Once two or more are complete, a **Compare** button appears
6. Click **Compare** to see a side-by-side table of COM-B signals, barriers, motivators, confidence, and top findings across all documents

---

## All pages

| Page | What it does |
|---|---|
| **Analyse** (`/`) | Main workspace — paste text, scrape sources, run analysis |
| **Dashboard** (`/dashboard`) | COM-B frequency trends, quality scores, and activity across all analyses |
| **Compare** (`/compare`) | Side-by-side COM-B diff between any two saved analyses |
| **Eval Lab** (`/eval`) | Rubric scoring, prompt version diff, A/B evaluation |
| **Monitor** (`/monitoring`) | Scheduled competitor scans — re-runs automatically at set intervals |
| **Audit Log** (`/audit`) | Full record of every analysis run, export, and review action |

---

## Sharing an analysis

After running an analysis, click the **Share** button at the top of the results. This creates a read-only link you can send to anyone — they don't need a ScrapeCore account to view it. The shared page has a **Print / PDF** button so recipients can save a copy.

---

## Troubleshooting

**"No API key configured" / Settings opens automatically**
The app detected no API key is set. Click ⚙ Settings, paste your key (starts with `sk-ant-`), and click Save.

**"Analysis failed" error**
- Check your API key is correctly saved in ⚙ Settings (no extra spaces or line breaks)
- Check you have a payment method in the [Anthropic console](https://console.anthropic.com)

**"Input too large" error**
The limit is ~100KB (~15,000 words). Use the **Batch** tab to split large datasets across multiple documents.

**macOS — "app can't be opened"**
Go to **System Settings → Privacy & Security → Open Anyway**. Or run in Terminal:
```
xattr -d com.apple.quarantine ~/Applications/ScrapeCore.app
```

**Windows — installer blocked by Defender**
Right-click the `.exe` → **Run as administrator**. If still blocked → **More info → Run anyway**.

**Linux — AppImage won't run**
Make sure it's executable: `chmod +x ScrapeCore-*.AppImage`

**Analysis is slow**
- 5,000 words: ~20–40 seconds
- 15,000 words: ~60–90 seconds
- Speed depends on Anthropic's API response time, not your internet connection

**No results from G2 or Capterra**
These sites require JavaScript rendering. Add a Firecrawl API key in ⚙ Settings and enable it in the URL scraper.

**"X analyses remaining this hour" badge is red**
The app allows 10 analyses per hour. Wait for the hour to reset, or contact the team to raise the limit.

---

## API cost reference

| Service | Free credit on signup | Typical cost per use |
|---|---|---|
| **Anthropic** (required) | $5 | ~$0.05–$0.20 per analysis |
| Perplexity (optional) | $5 | ~$0.005 per query |
| Firecrawl (optional) | 500 free scrapes/month | ~$0.001 per page |

---

## Getting help

Raise an issue on the GitHub repository or contact the project team directly.
