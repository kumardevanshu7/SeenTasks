# SeenTasks

<div align="center">
  <h3>A calmer, human way to plan your day.</h3>
  <p>SeenTasks reads what is on your mind, weighs urgency against your energy and well-being, and helps you decide what truly deserves today — not just what shouts the loudest.</p>
</div>

---

> **Note:** This project falls under **Arigato Labs**.

---

## ✨ What is SeenTasks?

Most task apps just collect work. SeenTasks helps you make a **humane decision** about it.

You add what is on your mind, and an AI priority guide sorts each task into a clear place for your day — while respecting who you are and the goals you set for yourself. Postponed tasks are gently tracked, never forgotten, and anything that works against your own goals is flagged kindly.

## 🚀 Features

- **AI priority guide** — Every task is read and placed into a category with a plain-language reason. It considers urgency, real consequences, the time and day, and your well-being.
- **Five priority categories** — `Danger Zone`, `First Priority`, `Second Priority`, `End of Day`, and `Do Tomorrow`.
- **Your persona / bio** — Pick traits like *No junk food, Job hunting, Stay fit, Little timepass, Creativity, Save money, Family first* and more. The guide judges every task against your goals.
- **Danger Zone** — If a task works against a goal you chose (e.g. ordering junk food when you want to avoid it), it is flagged kindly, like a caring friend.
- **Delay tracking** — Recall unfinished tasks into today. Each carries a *"Delayed by N days"* label, and the card shifts from light red to deep red as the delay grows.
- **Horizontal day slider & calendar** — Slide across days on the Today page, or open the calendar to see any day's plan.
- **Abort bin** — Drop a task into the bin and restore it later with a clear *Bin task* label.
- **Companion assistant** — A friendly chat that talks in simple, easy words to help you plan and stay balanced.
- **Connections** — Find people by a unique username (email stays private) to plan together.
- **Installable PWA** — Add SeenTasks to your phone or desktop and use it like a native app.

## 🛠️ Tech Stack

- **Framework:** [React](https://react.dev/) + [Vite](https://vite.dev/)
- **Auth & Database:** [Firebase](https://firebase.google.com/) (Google Auth, Firestore)
- **AI:** [OpenRouter](https://openrouter.ai/) — model `nvidia/nemotron-3-ultra-550b-a55b:free`
- **State:** [Zustand](https://github.com/pmndrs/zustand)
- **Animation & scroll:** [Framer Motion](https://www.framer.com/motion/) + [Lenis](https://lenis.darkroom.engineering/)
- **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Styling:** Custom CSS (warm cream + coral editorial theme)

## 🙌 How to use SeenTasks (for users)

1. **Sign in** with your Google account.
2. **Choose a username** — this is how friends can find you (your email stays private).
3. **Set your persona** — open **Your persona** and tap the traits that describe you and your goals. Save it. This teaches the guide who you are.
4. **Add tasks** — click **Add task**, type one task per line, add optional context (a deadline, your energy), and let the guide sort them.
5. **Work your day** — tasks appear grouped by priority. Tick them off, or move ones you cannot do into the **Abort bin**.
6. **Recall unfinished work** — the next day, tap **Recall unfinished** to bring past tasks into today with a delay label.
7. **Browse days** — use the date slider on Today or the **Calendar** to look back and ahead.
8. **Talk it through** — open **Assistant** to chat in simple words about planning your day.
9. **Install the app** — use the **Install app** button to add SeenTasks to your device.

## 📦 Run on your own computer (step-by-step)

### Step 1: Prerequisites
- [Node.js](https://nodejs.org/) (latest LTS)
- [Git](https://git-scm.com/downloads)

### Step 2: Clone the code
```bash
git clone https://github.com/<your-username>/SeenTasks.git
cd SeenTasks
```

### Step 3: Install dependencies
```bash
npm install
```

### Step 4: Set up Firebase
1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Click the Web icon (`</>`) to register a web app and copy the config values.
3. **Authentication → Sign-in method → enable Google** (set a support email).
4. **Firestore Database → Create database** (production mode).
5. **Firestore → Rules** → paste the contents of [`firestore.rules`](./firestore.rules) → **Publish**.

### Step 5: Configure environment variables
Create a file named `.env.local` in the project root (see [`.env.example`](./.env.example)):
```env
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_web_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key
```
> Get a free OpenRouter key at [openrouter.ai](https://openrouter.ai/). If the key is missing, the app still works using a local fallback for prioritization.

### Step 6: Start the app
```bash
npm run dev
```
Open **http://localhost:5173** in your browser.

## 🚀 Deploying to Vercel

1. Push your code to GitHub (secrets in `.env.local` and `scripts/` are git-ignored and will not be uploaded).
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) → **Add New Project** → import the repo. Vercel auto-detects Vite.
3. Under **Environment Variables**, add every `VITE_...` variable from your `.env.local` (including `VITE_OPENROUTER_API_KEY`).
4. Click **Deploy**.
5. After deploy: Firebase Console → **Authentication → Settings → Authorized domains** → add your Vercel domain (e.g. `seentasks.vercel.app`). Without this, Google login fails with `auth/unauthorized-domain`.

## 📜 Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the production site into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Check the code for errors |

## 🔒 Security notes

- `VITE_` variables are bundled into the browser. The OpenRouter free-model key is visible to visitors — rotate it if it is ever abused.
- Never commit `.env` files or `scripts/serviceAccountKey.json`; they are already git-ignored.
- Firestore access is protected by [`firestore.rules`](./firestore.rules); usernames are unique because they are claimed create-only.

---

## 🏢 About Arigato Labs

**SeenTasks** is proudly developed by **Kumar Devanshu**, founder of **Arigato Labs**, in 2026.

Our mission is to build sleek, modern, high-performance tools that empower individuals and teams to achieve their goals with elegance and ease. We believe software should feel natural, fast, and distinctly beautiful.

---

### Legal Disclaimer & License

Copyright © 2026 Arigato Labs. All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY.

---

*Created as part of Arigato Labs.*
