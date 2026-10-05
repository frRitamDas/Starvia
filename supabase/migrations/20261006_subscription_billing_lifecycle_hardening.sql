-- Starvia: recurring subscription lifecycle fields and production cleanup.

alter table public.subscriptions
  add column if not exists billing_interval text,
  add column if not exists provider_plan_id text;

alter table public.subscriptions
  drop constraint if exists subscriptions_billing_interval_check;

alter table public.subscriptions
  add constraint subscriptions_billing_interval_check
  check (billing_interval is null or billing_interval in ('monthly','yearly'));

create index if not exists subscriptions_provider_plan_idx
  on public.subscriptions (provider_plan_id);

create index if not exists subscriptions_period_end_idx
  on public.subscriptions (current_period_end);

-- Production must never grant paid access to a mock/test entitlement.
update public.subscriptions
set
  plan = 'free',
  status = 'expired',
  provider = 'mock',
  provider_subscription_id = null,
  provider_plan_id = null,
  provider_payment_id = null,
  current_period_start = null,
  current_period_end = null,
  cancel_at_period_end = false,
  cancelled_at = coalesce(cancelled_at, now()),
  amount_inr = null,
  billing_interval = null
where provider = 'mock'
  and plan <> 'free';
