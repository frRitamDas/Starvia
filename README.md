# Starvia

AI-powered study companion for Indian school students.

## Tech stack

- **Next.js 15 (App Router)** with React Server Components, streaming and route handlers
- **TypeScript** (strict), **Tailwind CSS** with a custom design system, shadcn/ui-style Radix primitives
- **Supabase** — Google-only authentication, Postgres with row-level security, Storage for avatars
- **NaraRouter** — primary OpenAI-compatible text AI gateway, with resilient SSE/non-stream fallback
- **Google Gemini** — server-side fallback and native image/vision provider
- **Razorpay** — server-side signature verification, recurring monthly/yearly subscriptions, webhooks and lifecycle reconciliation

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

For paid plans, configure **four separate Razorpay recurring plan ids**:
- `RAZORPAY_PLAN_PRO_MONTHLY`
- `RAZORPAY_PLAN_PRO_YEARLY`
- `RAZORPAY_PLAN_ULTRA_MONTHLY`
- `RAZORPAY_PLAN_ULTRA_YEARLY`

Starvia does not silently convert a recurring SaaS purchase into a one-time order. Missing cadence-specific plan ids keep that checkout disabled until configured.

Monthly subscriptions renew monthly and yearly subscriptions renew yearly. Cancelling at the end of the current cycle keeps the already-paid entitlement active until the provider-supplied period end; missed expiry webhooks are reconciled lazily on the next authenticated request.

Use `/api/health` for configuration-level checks. It deliberately never exposes secrets or performs billable AI probes.

## Development

Install dependencies and run:

```bash
npm install
npm run dev
```
