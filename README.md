# ⚡ AI Radar — Practical AI Feed & Intelligence Dashboard

A real-time, curated AI feed that filters out academic noise and brings you **practical AI products, actionable tools, and game-changing breakthroughs you can use today**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yugjain/AIfeed&env=GEMINI_API_KEY,GEMINI_MODEL&project-name=aifeed)

---

## 🌐 Live Access

- **Public Live URL**: [https://accomplished-scheme-turner-compilation.trycloudflare.com](https://accomplished-scheme-turner-compilation.trycloudflare.com)
- **Local Dashboard**: `http://localhost:3000`
- **GitHub Repository**: [https://github.com/yugjain/AIfeed](https://github.com/yugjain/AIfeed)

---

## ✨ Features

- **🌟 Top Picks (Practical & Products)**: Curated strictly for usable AI apps, workflow speedups, and consumer/developer tools. No dense math papers or raw code cluttering your primary feed.
- **🔬 Deep Tech & Code**: A dedicated tab for technical systems, repositories, and academic preprints whenever you want to do a deep dive.
- **🤖 Powered by Gemini (`gemini-3.8-flash`)**:
  - **Plain-English TL;DR**: Explains *what it does* in simple, human language without technical jargon.
  - **"How to use it" Callout**: Concrete takeaway on how the tool helps you or what you can build with it.
  - **Daily Executive Radar Briefing**: 60-second morning intelligence briefing on top breakthroughs.
- **📡 Multi-Source Ingestion**:
  - **Product Hunt**: AI category product launches
  - **Newsletters & Blogs**: Ben's Bites, OpenAI, Google DeepMind, Hugging Face, Simon Willison, Latent Space
  - **Communities**: Hacker News top stories, Reddit (r/ChatGPT, r/artificial, r/LocalLLaMA)
  - **Code & Papers**: GitHub Trending AI repos, Lobste.rs, ArXiv preprints
- **💾 Fast Local Persistence**: Zero-lag atomic in-memory storage, URL deduplication across platforms, and instant search.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/yugjain/AIfeed.git
cd AIfeed
npm install
```

### 2. Configure Environment
Create `.env.local`:
```bash
GEMINI_API_KEY=your_free_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```
*(Get a free key in 30 seconds at [Google AI Studio](https://aistudio.google.com/apikey) - 1,500 free requests per day)*

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **AI SDK**: `@google/genai` (Gemini 3.8 Flash)
- **Icons**: Lucide React
- **Feeds**: `rss-parser` + REST API connectors
