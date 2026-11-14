# GIRMA — Growth, Innovation, Resources, Markets and Access

> *"Your Potential Deserves Access."* — **GIRMA Technologies**

GIRMA is a full-stack digital ecosystem empowering entrepreneurs, SMEs, startup founders, students, graduates, innovators, mentors, investors, and organizations across Northern Nigeria, Nigeria, and Africa with verified opportunities, transparent eligibility matching (**GIRMA Match**), financial tools (**Business Toolkit**), B2B market connections, mentorship, and grounded AI guidance (**Ask GIRMA**).

---

## Architecture Overview

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, jsPDF
- **Backend API & Server:** Node.js + Express (`server.ts`) on port `3000`
- **Database & Authentication:** Firebase Authentication (Google Sign-In + Email/Password with email verification & password recovery) + Cloud Firestore (`firebase-applet-config.json`) with hardened zero-trust rules (`firestore.rules`)
- **AI Layer:** Server-side `@google/genai` (`gemini-4-hydrogen`) protected by Firebase ID token verification and rate limiting (`/api/ai/chat`, `/api/ai/match-advice`, `/api/ai/toolkit-draft`)

---

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` (or configure via AI Studio Secrets):
```env
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="http://localhost:3000"
CRON_SECRET="optional_secret_for_deadline_scheduler"
```
> **Security Note:** Never expose `GEMINI_API_KEY` in client code (`VITE_*`). All Gemini calls execute strictly on the Express backend (`server.ts`).

### 3. Firebase & Firestore Setup
Firebase configuration lives in `/firebase-applet-config.json` (connected to the provisioned Firebase project and Firestore database).
To deploy or update Firestore security rules:
```bash
npx eslint firestore.rules
```
And deploy rules via your Firebase project workflow or Firebase CLI (`firebase deploy --only firestore:rules`).

### 4. Run Locally
```bash
npm run dev
```
The full-stack Express + Vite application runs on **http://localhost:3000**.

---

## Creating the First Admin & Seeding Data

1. **Bootstrapped Super-Admin:**
   - Sign in with Google or verified Email/Password using the bootstrapped admin email (`ahmedmalgwi2@gmail.com`).
   - On first admin login, GIRMA automatically initializes curated Northern Nigeria & Pan-African development seed opportunities, learning resources, verified directory businesses, market listings, and mentors (explicitly marked `isSeedData: true` where applicable).
2. **Promoting Additional Admins:**
   - Sign in as an existing admin, open **Admin Console → Users**, and click **Make Admin** next to any verified user account (creates `/admins/{uid}`).
3. **Managing Opportunities & Verifications:**
   - From **Admin Console**, administrators can publish/edit/expire/delete opportunities, review and approve/reject business verification requests, approve mentor applications, broadcast announcements, inspect live Recharts analytics, and audit actions in `admin_activity_logs`.
   - Use **Initialize / Refresh Development Seed Data** in the Admin Console at any time during development/testing.

---

## Running Automated Tests & Checks

Run the unit, deterministic math, GIRMA Match, and static security verification suite:
```bash
npx tsx --test tests/girma.test.ts
```

Validate TypeScript, production build, ESLint, and Firestore security rules:
```bash
npm run lint
npm run build
npx eslint firestore.rules
```

---

## Production Build & Deployment

Build the frontend bundle and start the production Express server:
```bash
npm run build
NODE_ENV=production npm start
```
The production server serves static assets from `dist/`, exposes `/api/health`, `/api/ai/*`, and `/api/cron/deadlines`, and binds to `0.0.0.0:3000` (Cloud Run compatible).
