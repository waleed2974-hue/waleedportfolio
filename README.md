# Syed Waleed — Graphic Design Portfolio & Admin Studio

A high-performance, dark-mode portfolio and creative administration system built for **Syed Waleed**, Senior Brand Identity Architect & Graphic Designer.

## 🌟 Highlights & Features

- **Split-Screen Interactive Case Study Reader**:
  - Full-screen drawer with sticky left challenge/architecture & measurable impact metadata.
  - Media stream supporting high-resolution lossless imagery (JPG, PNG, WEBP) and looped motion film reels (MP4) with responsive `contain` rendering.
  - Infinite scroll chaining to seamlessly navigate between projects.
- **Dynamic Creative Lab (Bento Grid)**:
  - Interactive experiments, UI/UX shots, brand marks, and video studies.
- **Admin Studio**:
  - Add, edit, reorder, duplicate, and preview case studies with live responsive image previews.
  - 2FA OTP verification via email relay.
  - AI Copywriting Studio for case study challenges, measurable impact metrics, and client replies.
  - High-res media uploader with MySQL indexing and exportable SQL dumps.
- **Security Hardened**:
  - Zero plain-text credentials; SHA-256 password hashing via Web Crypto API.
  - Redacted OTP server telemetry.
  - Rate-limited OTP dispatch and 5-attempt brute-force lockout.
  - Protected PHP backend endpoints (`/api/projects.php`, `/api/upload.php`, `/api/inquiries.php`).
  - Strict localhost dev-server binding and sanitized production source maps.

## 🛠️ Tech Stack

- **Frontend**: React 19, GSAP 3 (Flip, ScrollTrigger), Lenis smooth scrolling, Lucide icons, Vite 5
- **Backend / APIs**: Node.js Vite server middleware & PHP 8.x PDO MySQL endpoints
- **Database**: MySQL (XAMPP / cPanel) & Supabase PostgreSQL cloud sync

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Build for Production
```bash
npm run build
```
The output will be placed in the `dist/` directory ready for deployment to any static host or cPanel public_html.

## 📄 License
Private portfolio repository &copy; Syed Waleed. All rights reserved.
