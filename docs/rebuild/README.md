# Starvia rebuild track

This branch is an isolated rebuild track. Do not deploy it to production until its checks pass.

## Safety boundary
- Existing Supabase production project: `zwrtvfahcgvssbndvray`. Keep it intact.
- Do not run `supabase/fresh-project/001_foundation.sql` against production. It is intended only for a newly created Supabase project.
- Do not copy production users, credentials, or payment records into development.
- Keep secrets in hosting environment variables; never commit provider keys.

## Release gates
1. Provision a separate Supabase project for the new database and apply the fresh-project foundation SQL there.
2. Configure a server-only AI adapter with explicit model IDs, timeouts, schema validation, redacted errors, and safe retries.
3. Implement tutor, quiz, and lesson generation against the same provider adapter; validate every output before persisting or charging usage.
4. Rebuild mobile-first navigation and the study workspace, then connect dashboard metrics to persisted data (no fake success states).
5. Add automated checks for unauthenticated access, RLS ownership, quota concurrency/refunds, malformed model output, provider outages, and all three generation flows.
6. Deploy a preview, test it end-to-end, then switch production environment variables only after sign-off.

## Initial acceptance criteria
- A normal tutor prompt yields a relevant educational answer, not a provider/classifier label.
- Quiz response contains the requested number of schema-valid questions and answer keys.
- Lesson response contains title, objectives, explanation, examples, and recap.
- Failed or invalid AI output does not consume a credit.
- A user cannot read another user's data or change their own subscription plan.
- Main mobile routes work at 360px width without horizontal overflow or clipped controls.
