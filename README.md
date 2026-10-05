# Starvia

AI-powered study companion for Indian school and competitive-exam students.

Starvia includes a class-aware AI tutor (typed or browser voice input), structured tutorials, quizzes with a mistake-review bank, photo question solving, revision plans, spaced flashcards, a private notes notebook with AI mind maps, and progress tracking. It supports CBSE, ICSE/ISC and State Boards for Classes 6–12, with JEE/NEET and other exam targets.

## Tech stack

- **Next.js 15 (App Router)** with React Server Components, streaming and route handlers
- **TypeScript** (strict), **Tailwind CSS** with a custom design system, shadcn/ui-style Radix primitives
- **Supabase** — Google-only authentication, Postgres with row-level security, Storage for avatars
- **Google Gemini** — server-side only, with model switchability, caching and structured JSON responses
- **Razorpay** — server-side signature verification, webhooks and subscription support

## Authentication

Starvia uses **Supabase Auth with Google OAuth only**.

There is no email/password registration, sign-in, password reset, or email confirmation flow in the Starvia application. A new Google user is created in Supabase Auth and the database trigger provisions the corresponding profile and free subscription records.

Configure the Google provider in Supabase:

1. Authentication → Providers → Google → Enable.
2. Use the Google OAuth **Web Client ID** (ending in `.apps.googleusercontent.com`) and matching Client Secret.
3. Add the Supabase callback URL shown in the provider settings to the Google Cloud OAuth client's Authorized redirect URIs.
4. Keep **Skip nonce checks** disabled.
5. Keep **Allow users without an email** disabled.
6. Disable the Supabase **Email** provider so Google is the only authentication method.

The application redirects through `/api/auth/google` and then handles the OAuth callback at `/auth/callback`.

## Environment

Set the Supabase URL and publishable key in Vercel, plus the server secret key and the other production integrations described in `.env.example`.

For a new database, run `sql/schema.sql`. To update an existing deployment, apply the timestamped files in `supabase/migrations/` in order; `20261007_study_notes.sql` adds the private notebook and saved mind maps.

## Development

Install dependencies and run:

```bash
npm install
npm run dev
```
