# SeenTasks — Interview Q&A (Short Answers + Speak Scripts)

> Language: simple / layman.  
> Most answers: **short**. Important ones: **medium**. Nothing long.  
> Speak naturally; don’t memorize word-for-word.

---

## How to use this:

1. Read the **Answer** (facts).
2. Practice the **Say this** line out loud once.
3. If they dig deeper → use one extra sentence from “If they ask more”.

---

## 1. What is SeenTasks?

**Answer:** A day planner app. AI sorts important tasks; Quick Tasks is a simple daily checklist.

**Say this:**  
“SeenTasks is a personal planner. AI helps decide what deserves today, and Quick Tasks is for small checkboxes without AI.”

---

## 2. Why did you build it?

**Answer:** Normal to-do apps only collect lists. I wanted help choosing priorities and a separate space for tiny tasks.

**Say this:**  
“Most apps dump everything in one list. I wanted calm priority for real work, and a simple checklist for small daily things.”

---

## 3. Real-life use?

**Answer:** Morning → Quick Tasks for small chores → Today for serious plan → tick off → unfinished quick items go to Not completed after midnight.

**Say this:**  
“In the morning I open Quick Tasks for small stuff, then Today for the real plan. At midnight unfinished quick tasks move to Not completed.”

---

## 4. Tech stack?

**Answer:** React, Vite, Firebase Auth + Firestore, Zustand, OpenRouter AI, PWA.

**Say this:**  
“React with Vite on the frontend, Firebase for login and database, Zustand for state, OpenRouter for AI, and it’s a PWA.”

---

## 5. Frontend or full-stack?

**Answer:** Frontend-heavy with BaaS. No custom Node backend; Firebase is the backend.

**Say this:**  
“It’s mostly frontend. Backend is Firebase — Auth and Firestore — no separate Node server.”

---

## 6. How does login work?

**Answer:** Google sign-in → load profile → if no username, force username setup → enter app.

**Say this:**  
“User signs in with Google. If it’s first time, they pick a unique username, then they enter the app.”

---

## 7. What is Quick Tasks?

**Answer:** Manual checklist, no AI. Synced on Firestore. Labels like #job, #insta. Delete needs One Password.

**Say this:**  
“Quick Tasks is a simple checklist — no AI. It syncs across devices, supports labels, and delete is protected.”

---

## 8. Why two systems — AI Today and Quick Tasks?

**Answer:** Different jobs. AI for thoughtful prioritization; Quick Tasks for speed and simplicity.

**Say this:**  
“Not every task needs AI. Serious planning uses Today; small daily ticks use Quick Tasks.”

---

## 9. How does AI prioritization work?

**Answer:** Send title + persona + time context to OpenRouter → get category + reason. If AI fails, local keyword fallback.

**Say this:**  
“When you add a task, we call OpenRouter with your persona. It returns a category and a short reason. If the API fails, a local heuristic still works.”

_If they ask more:_ Categories are danger, first, second, end-of-day, tomorrow.

---

## 10. What is Persona?

**Answer:** User-selected traits (fitness, job hunt, no junk food…). AI uses them so conflicting tasks become Danger Zone.

**Say this:**  
“Persona is who you are and what you care about. The AI judges tasks against that — like junk food vs ‘no junk food’.”

---

## 11. Where is data stored?

**Answer:** AI tasks + persona → localStorage. Quick Tasks + One Password + profiles + collab → Firestore.

**Say this:**  
“Personal AI tasks stay on the device for now. Quick Tasks and security settings sync on Firestore. Login is Firebase Auth.”

---

## 12. Why not put AI tasks on Firestore yet?

**Answer:** Started local for speed and simplicity; rules already prepared for future sync.

**Say this:**  
“I shipped AI tasks locally first so the core loop was fast. Firestore rules for cloud tasks are ready when we sync them next.”

---

## 13. What schemas do you have?

**Answer (medium):**  
Users, publicProfiles, usernames, quickTasks, settings/onePassword, connectionRequests, assignedTasks. Local AI task object has category, status, iteration, etc.

**Say this:**  
“Main Firestore schemas are users, public profiles, usernames, quick tasks, one-password settings, connection requests, and assigned tasks. AI tasks have a rich local schema with category and status.”

---

## 14. Who designed the schemas?

**Answer:** Designed in the app services to match features; locked down in `firestore.rules`.

**Say this:**  
“I designed schemas around the features, then enforced them in Firestore security rules so the client can’t write random fields.”

---

## 15. What is One Password?

**Answer:** One question + one answer. Answer hashed (SHA-256), stored only on Firebase. Used before deletes.

**Say this:**  
“It’s a simple Q&A lock — not a PIN. The answer is hashed and saved on Firebase. Deletes ask that question first.”

---

## 16. Why hash the answer?

**Answer:** So Firebase never stores the plain answer. Even if someone reads the doc, they see a hash.

**Say this:**  
“We hash the answer before saving, so the database doesn’t keep the secret in plain text.”

---

## 17. Is One Password bank-level security?

**Answer:** No — soft protection against accidental deletes. Real account security is Google Auth.

**Say this:**  
“It’s for accidental deletes, not banking. Account security still comes from Google login.”

---

## 18. Security steps you took?

**Answer (medium):** Google Auth, Firestore deny-by-default, owner-only paths, username uniqueness, hashed One Password, rate-limit on wrong answers, email kept off public profiles.

**Say this:**  
“Google login, strict Firestore rules, owner-only data, unique usernames, hashed One Password, and public profiles without email.”

---

## 19. How do connections / assign tasks work?

**Answer:** Search username → request → accept → assign a task doc in `assignedTasks` → shows on their Today.

**Say this:**  
“You find someone by username, connect, then you can assign a planned task. It appears on their Today board.”

---

## 20. PWA — what does that mean here?

**Answer:** Installable on phone/desktop, service worker, works more like an app.

**Say this:**  
“It’s a PWA — you can install it and open it like a normal app from the home screen.”

---

## 21. How did you make it open fast?

**Answer:** Lazy routes, slim fonts, defer heavy listeners, profile cache, load AI only when needed.

**Say this:**  
“Pages load on demand, fonts are slim, heavy Firebase listeners start after first paint, and AI code loads only when you add a task.”

---

## 22. State management — why Zustand?

**Answer:** Lightweight, easy persist for local tasks, less boilerplate than Redux for this app size.

**Say this:**  
“Zustand is light and enough for this app. I persist the local task store without Redux complexity.”

---

## 23. Biggest challenge?

**Answer (pick one):** Cross-device Quick Tasks sync, or keeping AI useful with a free model + solid fallback, or delete protection without friction.

**Say this:**  
“Syncing Quick Tasks cleanly across phone and laptop while keeping the UI instant was the tricky part — local first, then Firestore merge.”

---

## 24. If Quick Tasks don’t show on phone?

**Answer:** Same account? Rules deployed? Check permission-denied in Network. Confirm docs under `users/{uid}/quickTasks`.

**Say this:**  
“First I check same Google account and Firestore rules. Then Network tab for permission errors, and whether documents exist under that user’s quickTasks.”

---

## 25. If AI always falls back locally?

**Answer:** Check API key env, OpenRouter status, CORS/network, then read console errors.

**Say this:**  
“I’d verify the OpenRouter key and network calls. If the API fails, the app intentionally falls back to a local heuristic.”

---

## 26. What would you improve next?

**Answer:** Sync AI tasks to Firestore; move OpenRouter key to a backend; stronger org features if needed.

**Say this:**  
“Next I’d sync personal AI tasks to the cloud and move the AI key server-side for production.”

---

## 27. Did you work alone?

**Answer:** Adjust to truth. Default: built as a personal/Arigato Labs product project.

**Say this:**  
“I built it as a product project under Arigato Labs — end-to-end from UI to Firebase rules.”

---

## Quick 30-second pitch (memorize this)

“SeenTasks is a calm day planner. AI ranks what deserves today using your persona, Quick Tasks handles small checklists with cloud sync, and deletes are protected with a hashed Q&A on Firebase. I built it in React with Firebase and focused on speed and simple UX.”

---

## If stuck — buy 5 seconds

“Good question — in this project that part works like this: …”  
Then give the short answer from the matching number above.
