# 🎥 Video Screening Bot

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.0.0-black?logo=next.js)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.1-38B2AC?logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)
![Groq](https://img.shields.io/badge/Groq-AI%20Summary-f55036)

A modern, lightning-fast platform for conducting **One-Way Video Interviews**. Built to streamline the hiring process with an elegant applicant tracking dashboard, fully automated video transcription, and AI-generated candidate summaries.

---

## ✨ Features

- **🗣️ One-Way Video Interviews**: Candidates receive a secure magic link, read the customized questions, and record their answers directly in the browser.
- **⚡ Insanely Fast Transcription**: As soon as an interview finishes, the video is instantly transcribed using **Groq Whisper** (`whisper-large-v3`), mapping candidate answers to the exact questions asked.
- **🚀 Optimized Uploads**: Video clips are uploaded independently for maximum speed, reducing server load and bypassing heavy client-side merging.
- **✨ Strict AI Interview Summaries**: Leveraging **Groq LLaMA 3.1 (8B)**, the platform automatically generates a 3-4 bullet point summary of the candidate's soft skills and scores them. The AI is strictly trained to detect and penalize silent/non-responsive candidates.
- **⏱️ Live Transcript Playback**: A beautiful, auto-scrolling side-panel accompanies the video player during review. Click any sentence in the transcript to instantly jump the video to that exact timestamp! 
- **📹 Visual Clip List**: The dashboard features visual video thumbnails for each recorded clip for seamless navigation.
- **🎨 Premium UI/UX**: Designed with dark mode, glassmorphism, smooth animations, and tailored layout grids for the best viewing experience across all devices.
- **🔗 Secure Sharing**: Generate read-only, time-expiring shareable links to effortlessly share specific candidate interviews with hiring managers.

---

## 🛠️ Tech Stack

A comprehensive, detailed breakdown of the entire technology stack used in this project is available in the [tech_stack.txt](./tech_stack.txt) file. 

At a high level:
- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), React 19, Tailwind CSS, Radix UI, Framer Motion
- **Backend & Storage**: [Supabase](https://supabase.com/) (PostgreSQL & Storage Buckets)
- **AI & Transcription**: [Groq API](https://groq.com/) (Whisper & LLaMA 3 models)
- **Emails & Media**: Nodemailer, FFmpeg, HTML2PDF

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com/) account
- A [Groq](https://console.groq.com/) API Key
- A Gmail account with an App Password (for Nodemailer)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Achyut-Pancholi/Interview-Screening-Video-Bot.git
cd Interview-Screening-Video-Bot/happy-app
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add the following keys:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_EMAIL=your_admin_email

GROQ_API_KEY=your_groq_api_key
```

### 4. Gmail App Password Setup

To allow the application to send magic links via email, you must generate a Gmail App Password:
1. Go to your Google Account settings.
2. Navigate to **Security** > **2-Step Verification** (make sure this is turned on).
3. Scroll down to the bottom and click on **App passwords**.
4. Create a new app password (e.g., name it "Video Screening Bot").
5. Copy the generated 16-character password and paste it as the `GMAIL_APP_PASSWORD` in your `.env.local` file.

### 5. Database Setup

Run the SQL snippet found in `supabase-schema.sql` inside your Supabase SQL Editor. This will automatically create the required `interviews` table and configure the correct columns (including the AI `summary` column).

### 5. Run the Application

```bash
npm run dev
```

Navigate to `http://localhost:3000` to start exploring the application!

---

## 📸 Screenshots

*(To be added)*

---

## 📄 License
This project is licensed under the MIT License.
