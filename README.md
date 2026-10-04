# Starvia — AI study platform for Indian school students

Starvia is a production-ready AI learning platform for Class 6–12 students across CBSE, ICSE and
State Boards. It explains concepts at the right level, generates structured tutorials and quizzes,
solves typed or photographed questions, builds revision plans before exams, and tracks real progress
— all with a daily AI allowance that scales with the student's plan.

**Version 1.0** · Founder: Ritam Das · Instagram [@vxritam](https://instagram.com/vxritam)

---

## What's inside

| Surface | What it does |
| --- | --- |
| `/` marketing site | Landing, features, pricing, about, FAQ, contact, privacy, terms |
| `/dashboard` | Greeting, streak/XP/level, today's learning, AI usage meters, quick actions, recommendations |
| `/tutor` | Streaming AI tutor with markdown + maths + code, conversation history, regenerate, copy, feedback |
| `/tutorials` | Structured tutorials (objectives → sections → examples → terms → exam tips → mistakes → practice → summary) with mark-complete |
| `/quiz` | MCQ / true-false / short-answer quizzes generated per chapter, graded server-side with explanations and weak topics |
| `/solve` | Type or upload a photo of any question → concept, step-by-step solution, final answer, similar practice question |
| `/exam-prep` | Day-wise revision plans, important topics with weightage, formula sheet, practice questions, mock blueprints, topic mastery tracker |
| `/flashcards` | AI-generated and hand-built decks with flip review and known/unknown tracking |
| `/progress` | Accuracy trends, subject mastery, learning time, streaks, achievements |
| `/profile` | Editable onboarding details (name, class, board, subjects, learning level, exam target), avatar, theme, billing |
| `/upgrade` | Plan comparison, Razorpay checkout, billing history, cancellation |
| `/admin` | Admin-only analytics: users, plans, revenue, AI requests, DAU, quiz/tutorial activity, feedback |

Plans (all limits live in one server-side config — `lib/plans.ts`, overridable per plan from the
`plan_limits` table): **Starter** free (5 tutor messages, 2 tutorials, 3 quizzes, 1 image question
per day) · **Pro** ₹99/month · **Ultra** ₹249/month. Yearly billing is available at a discount.

## Tech stack

- **Next.js 15 (App Router)** with React Server Components, streaming and route handlers
- **TypeScript** (strict), **Tailwind CSS** with a custom design system, shadcn/ui-style Radix primitives
- **Firebase Authentication** — primary Google popup sign-in in the browser; ID tokens are verified server-side with Node crypto (no `firebase-admin`)
- **Supabase** — SSR sessions, email/password + OAuth fallback, Postgres with row-level security, Storage for avatars
- **Google Gemini** — server-side only, with model switchability, caching and structured JSON responses
- **Razorpay** — server-side signature verification, webhooks and subscription support

No payment, AI, or Firebase Admin SDK is bundled. Gemini and Razorpay use small server-side REST clients;
Firebase's minimal app/auth browser modules load only on the auth surface, and the server verifies Google signatures
against the official rotating x509 certificates.

## Quick start

```bash
npm install
cp .env.example .env.local     # add your keys — or leave it empty to explore demo mode
npm run dev                    # http://localhost:3000
```

Without any keys the app runs in **demo mode**: a seeded student account, a fully clickable UI and
clearly-labelled placeholder AI answers. Demo mode is off by default and always off in production
unless you explicitly set `NEXT_PUBLIC_DEMO_MODE=true`.

Useful scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run build       # production build
npm run check       # typecheck + lint
npm run db:push     # apply sql/schema.sql using SUPABASE_DB_URL
npm run icons       # regenerate PWA icons from the original Starvia mark
```

## Setting up the backend

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply [`sql/schema.sql`](sql/schema.sql). Either paste it into **SQL Editor**, or copy the database
   connection string and run `SUPABASE_DB_URL='postgresql://…' npm run db:push`. The idempotent schema creates
   every table, RLS policy, the `handle_new_user()` trigger, and the atomic `consume_ai_quota()` function.
3. Copy **Project URL**, **anon key** and **service_role key** into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). The
   service-role key stays server-only and is required for usage counters, payments, admin analytics,
   and the verified Firebase-to-Supabase session bridge.
4. Storage: create an `avatars` bucket for profile photos and apply the project storage policies.
5. Add `http://localhost:3000/auth/callback` and `https://your-domain/auth/callback` under
   **Authentication → URL Configuration → Redirect URLs**.
6. Optional redirect fallback: enable Google under **Authentication → Providers** and set
   `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`. Firebase remains the primary Google sign-in path.

### 2. Firebase Google sign-in

1. Create or open a Firebase project, then add a **Web app** under **Project settings → General**.
2. Open **Build → Authentication → Sign-in method**, enable **Google**, and select a support email.
3. Copy the public web configuration into `NEXT_PUBLIC_FIREBASE_API_KEY`,
   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`,
   `NEXT_PUBLIC_FIREBASE_APP_ID`, and `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`.
4. Under **Authentication → Settings → Authorized domains**, add `localhost`, your production Vercel
   domain, and any stable preview/custom domain used for sign-in.
5. Keep `SUPABASE_SERVICE_ROLE_KEY` configured. After Firebase verifies Google in the popup, Starvia
   posts only the Firebase ID token to `/api/auth/google`; the server verifies its RS256 signature,
   `kid`, audience, issuer, expiry and `email_verified`, then issues a normal Supabase SSR session.

Do **not** install or configure `firebase-admin`; the verifier in `lib/firebase/verify.ts` deliberately
uses `node:crypto` and Google's rotating x509 certificates.

### 3. Gemini

Create an API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set
`GEMINI_API_KEY`. Model names are configurable (`GEMINI_MODEL_DEFAULT`, `_FAST`, `_VISION`, `_PRO`),
so you can change models without touching code. All calls happen in server code — the key never
reaches the browser.

### 4. Razorpay

1. Add `RAZORPAY_KEY_ID`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Webhooks → add `https://your-domain/api/webhooks/razorpay`, subscribe to `payment.captured`,
   `payment.failed` and the `subscription.*` events, then set `RAZORPAY_WEBHOOK_SECRET`.
3. Optional but recommended: create monthly plans in Razorpay and set `RAZORPAY_PLAN_PRO` /
   `RAZORPAY_PLAN_ULTRA` for true recurring subscriptions. Without them, checkout uses a one-time
   order and activates 30 days of access.

Payments are only activated after **server-side** signature verification and a server-to-provider
re-check of the captured amount. A browser claiming "payment succeeded" is never trusted. Until
Razorpay is configured, the upgrade page offers a clearly-labelled test activation (dev only, hard
disabled in production).

## Deploying to Vercel

1. Push this repository to GitHub and import it from **Vercel → Add New → Project**. Next.js is
   detected automatically; use Node.js 20 or newer.
2. Paste **every variable name** from `.env.example` into **Project → Settings → Environment
   Variables**, adding real values only in Vercel. At minimum set Supabase, Firebase, Gemini and
   Razorpay keys, `NEXT_PUBLIC_SITE_URL=https://your-domain`, and `ADMIN_EMAILS=you@example.com`.
3. Apply `sql/schema.sql` to the production Supabase project before the first real account signs in.
4. Add the final Vercel/custom domain to **Firebase → Authentication → Settings → Authorized
   domains**.
5. Add `https://your-domain/auth/callback` to **Supabase → Authentication → URL Configuration →
   Redirect URLs**, and set the same domain as the Site URL.
6. Configure the Razorpay webhook URL as `https://your-domain/api/webhooks/razorpay` and use the exact
   same webhook secret in Vercel.
7. Redeploy after changing environment variables. Open `/api/health`: `supabase`, `serviceRole`,
   `firebaseAuth`, `gemini`, `razorpay`, and `razorpayWebhook` should all report `true`. The endpoint
   exposes booleans only and never returns a secret.
8. Complete one real Google sign-in, Gemini tutor stream, server-graded quiz and Razorpay **test-mode**
   payment before promoting the deployment. Do not infer integration success from a successful build.

## Security model

- Row-level security on every table; users can only ever read and write their own rows.
- All AI calls, quota checks and payment verification happen on the server.
- Daily limits are stored in the database (`ai_usage` + `consume_ai_quota`), so refreshing or
  clearing the browser cannot reset them.
- Firebase Google ID tokens are verified server-side against Google's x509 certificates, including
  signature, audience, issuer, timestamps and verified email, before a Supabase session is issued.
- Only `NEXT_PUBLIC_*` values reach the browser. `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_DB_URL`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are server-only, and
  `lib/env.ts` throws if a secret getter is ever touched in the browser.
- Input validation (zod) on every route, per-IP/route rate limiting, signed webhooks.
- Admin analytics is limited to the emails in `ADMIN_EMAILS`.

## Project structure

```
app/
  (marketing)/   public pages + shared marketing layout
  (auth)/        login, signup, password reset, server actions
  (app)/         protected product: dashboard, tutor, tutorials, quiz, solve,
                 exam-prep, flashcards, progress, profile, upgrade, admin
  api/           route handlers (AI, data, payments, webhooks, health)
components/      ui primitives, marketing, app shell, motion layer, feature modules
lib/             ai/, data/, firebase/, payments/, supabase/, plans, usage, session
scripts/         database setup and deterministic PWA icon generation
sql/schema.sql   full database schema, RLS policies and helper functions
```

## Branding

The logo ships as an original inline SVG (`components/brand/logo.tsx`). To use your own hosted
assets, set `NEXT_PUBLIC_BRAND_MARK` and `NEXT_PUBLIC_BRAND_LOGO` — no code changes needed.

---

© Starvia. Built for students who want to actually understand the answer.
