# SeenTasks — Setup

Everything runs from the frontend. No Cloud Functions, no CLI deploy needed.

## 1. Firebase Console (one-time)
- Authentication → Sign-in method → enable **Google**, set a support email.
- Authentication → Settings → Authorized domains → add `localhost` and your Vercel domain.
- Firestore Database → create database (production mode).
- Firestore → Rules → paste the contents of `firestore.rules` → Publish.

## 2. Local environment (.env.local — git-ignored)
Already contains your Firebase web config. Add your OpenRouter key:
```
VITE_OPENROUTER_API_KEY=sk-or-v1-...
```
Then restart `npm run dev`.

## 3. Run locally
```
npm run dev
```

## 4. Deploy on Vercel
- Framework preset: Vite. Build: `npm run build`. Output: `dist`.
- Add every `VITE_...` variable from `.env.local` into Vercel → Project → Settings → Environment Variables (including `VITE_OPENROUTER_API_KEY`).
- Deploy.

## How it works
- Google login: client-side Firebase Auth.
- Username + friends: stored directly in Firestore (usernames are unique because they are create-only).
- AI priority: browser calls OpenRouter `nvidia/nemotron-3-ultra-550b-a55b:free` (`src/lib/openrouter.js`); if it fails, a local heuristic is used.

## Notes
- `VITE_` variables ship in the browser bundle. The OpenRouter free-model key is visible to site visitors; rotate it if abused.
- `scripts/serviceAccountKey.json` is git-ignored and unused by the app.
