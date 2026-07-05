<p align="center">
  <img src="public/icons/icon-192.png" alt="Wise Quran" width="120" height="120">
</p>

<h1 align="center">Wise Quran — القرآن الكريم</h1>

<p align="center">
  <strong>A modern, offline-first Quran app built as a Progressive Web App.</strong>
</p>

<p align="center">
  <a href="https://quran.thewise.cloud">quran.thewise.cloud</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/iammagdy/wisequran?style=flat-square&color=3d7a5a" alt="License">
  <img src="https://img.shields.io/badge/PWA-Ready-brightgreen?style=flat-square&color=3d7a5a" alt="PWA Ready">
  <img src="https://img.shields.io/badge/React-18-informational?style=flat-square&color=3d7a5a" alt="React 18">
  <img src="https://img.shields.io/github/actions/workflow/status/iammagdy/wisequran/deploy.yml?style=flat-square&color=3d7a5a&label=deploy" alt="Deploy Status">
</p>

<p align="center">
  <a href="#features">Features</a> · <a href="#screenshots">Screenshots</a> · <a href="#tech-stack">Tech Stack</a> · <a href="#getting-started">Getting Started</a> · <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## About

Wise Quran is a fast, beautiful, and distraction-free app for reading the Quran, listening to recitations, and tracking daily prayers and Azkar. Built offline-first — once you download a Surah or audio file, it works permanently without an internet connection. Perfect for travel or low-connectivity areas.

## Features

| | |
|---|---|
| 📖 **Full Quran** | All 114 surahs with clean Uthmanic typography |
| 🎧 **Audio Recitations** | Multiple reciters with ayah-by-ayah tracking and fullscreen player |
| 🌙 **Azkar & Duas** | Morning/evening remembrances with tap counters |
| 🕌 **Prayer Tracker** | Daily prayer logging with streaks and statistics |
| 📿 **Digital Tasbeeh** | Tap counter with haptic feedback |
| 🧭 **Qibla Compass** | Live direction based on your location |
| 🌙 **Ramadan Tracker** | Ramadan schedule and prayer times |
| 📊 **Stats & Achievements** | Reading progress and milestones |
| 📴 **Offline Mode** | Download surahs and audio for true offline use |
| 📱 **Installable PWA** | Add to home screen on Android and iOS |
| 🌓 **Dark Mode** | Automatic and manual theme switching |
| 🔗 **Ayah Sharing** | Generate beautiful share cards |

## Screenshots

<p align="center">
  <img src="docs/screenshots/quran-home.png" width="200" alt="Quran Home">
  <img src="docs/screenshots/surah-reader.png" width="200" alt="Surah Reader">
  <img src="docs/screenshots/azkar.png" width="200" alt="Azkar">
  <img src="docs/screenshots/settings.png" width="200" alt="Settings">
</p>

## Tech Stack

- **React 18** + **TypeScript** — UI framework
- **Vite** + **vite-plugin-pwa** — Build tool with PWA support
- **Workbox** — Service worker and offline caching
- **IndexedDB** — Local storage for surahs, audio, and tafsir
- **Framer Motion** — Animations
- **shadcn/ui** + **Tailwind CSS** — Component library and styling
- **GitHub Actions** — Automated deployment to Hostinger via SCP

## Getting Started

```bash
# Clone
git clone https://github.com/iammagdy/wisequran.git
cd wisequran

# Install
npm install

# Dev server (runs at http://localhost:8080)
npm run dev

# Production build
npm run build
```

## Deployment

Every push to `main` automatically builds and deploys to [quran.thewise.cloud](https://quran.thewise.cloud) via GitHub Actions.

## Acknowledgments

Developed with AI pair programming assistance from **Claude** (Anthropic) and **Gemini** (Google) for architecture, UI/UX, and PWA offline capabilities.

## License

[MIT](LICENSE)
