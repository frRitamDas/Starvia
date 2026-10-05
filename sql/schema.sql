-- ============================================================================
--  Starvia — Supabase schema (v1.0)
--  Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
--  It is idempotent: re-running it is safe.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
--  Helper: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
--  profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           citext,
  full_name       text,
  class_level     text check (class_level in ('6','7','8','9','10','11','12')),
  board           text check (board in ('CBSE','ICSE','STATE','OTHER')),
  subjects        text[] default '{}',
  learning_level  text check (learning_level in ('foundation','developing','proficient','advanced')),
  exam_target     text,
  avatar_url      text,
  onboarded_at    timestamptz,
  xp              integer not null default 0 check (xp >= 0),
  level           integer not null default 1,
  streak_count    integer not null default 0,
  longest_streak  integer not null default 0,
  last_active_date date,
  study_minutes   integer not null default 0,
  role            text not null default 'student' check (role in ('student','admin')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_active_idx on public.profiles (last_active_date desc);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
--  subscriptions  (one active row per user)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users(id) on delete cascade,
  plan                    text not null default 'free' check (plan in ('free','pro','ultra')),
  status                  text not null default 'active'
                            check (status in ('active','created','authenticated','pending','halted',
                                              'paused','cancelled','completed','expired')),
  provider                text not null default 'free' check (provider in ('free','razorpay','mock')),
  provider_subscription_id text,
  provider_payment_id     text,
  provider_customer_id    text,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  cancelled_at            timestamptz,
  amount_inr              integer,
  currency                text not null default 'INR',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists subscriptions_plan_idx on public.subscriptions (plan);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_provider_sub_idx
  on public.subscriptions (provider_subscription_id);

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  payments  (verified payments only — written server-side)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  amount_inr          integer not null check (amount_inr >= 0),
  currency            text not null default 'INR',
  status              text not null default 'created'
                        check (status in ('created','authorized','captured','failed','refunded')),
  provider            text not null default 'razorpay' check (provider in ('razorpay','mock')),
  order_id            text,
  payment_id          text,
  subscription_id     text,
  signature_verified  boolean not null default false,
  notes               jsonb default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists payments_payment_id_key
  on public.payments (payment_id) where payment_id is not null;
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  plan_limits  (optional DB overrides for quotas)
-- ---------------------------------------------------------------------------
create table if not exists public.plan_limits (
  plan        text not null check (plan in ('free','pro','ultra')),
  feature     text not null,
  daily_limit integer not null check (daily_limit >= 0),
  updated_at  timestamptz not null default now(),
  primary key (plan, feature)
);

-- ---------------------------------------------------------------------------
--  ai_usage  (authoritative daily quota counters)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  usage_date  date not null default (now() at time zone 'Asia/Kolkata')::date,
  feature     text not null,
  used        integer not null default 0 check (used >= 0),
  tokens_used integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, usage_date, feature)
);

create index if not exists ai_usage_user_date_idx on public.ai_usage (user_id, usage_date);
create index if not exists ai_usage_date_idx on public.ai_usage (usage_date);

drop trigger if exists ai_usage_updated_at on public.ai_usage;
create trigger ai_usage_updated_at before update on public.ai_usage
  for each row execute function public.set_updated_at();

-- Atomic consume-or-fail. Stops limit bypass even under concurrent requests.
create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_feature text,
  p_limit integer,
  p_amount integer default 1
)
returns table (allowed boolean, used integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  insert into public.ai_usage (user_id, usage_date, feature, used)
  values (p_user_id, v_today, p_feature, 0)
  on conflict (user_id, usage_date, feature) do nothing;

  select used into v_used
  from public.ai_usage
  where user_id = p_user_id and usage_date = v_today and feature = p_feature
  for update;

  if v_used + p_amount > p_limit then
    return query select false, v_used, greatest(p_limit - v_used, 0);
    return;
  end if;

  update public.ai_usage
     set used = used + p_amount,
         updated_at = now()
   where user_id = p_user_id and usage_date = v_today and feature = p_feature
   returning used into v_used;

  return query select true, v_used, greatest(p_limit - v_used, 0);
end;
$$;

-- ---------------------------------------------------------------------------
--  ai_events  (admin analytics: requests, latency, error rate)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_events (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null,
  feature     text not null,
  status      text not null check (status in ('success','error','blocked','cached')),
  model       text,
  latency_ms  integer,
  tokens_used integer not null default 0,
  error_code  text,
  created_at  timestamptz not null default now()
);

create index if not exists ai_events_created_idx on public.ai_events (created_at desc);
create index if not exists ai_events_feature_idx on public.ai_events (feature, created_at desc);

-- ---------------------------------------------------------------------------
--  ai_cache  (shared generated content — avoids duplicate model calls)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_cache (
  cache_key  text primary key,
  kind       text not null,
  payload    jsonb not null,
  model      text,
  tokens_used integer not null default 0,
  hit_count  integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_cache_kind_idx on public.ai_cache (kind, created_at desc);

-- ---------------------------------------------------------------------------
--  conversations / messages  (AI tutor)
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null default 'New chat',
  subject         text,
  topic           text,
  class_level     text,
  board           text,
  difficulty      text,
  pinned          boolean not null default false,
  message_count   integer not null default 0,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists conversations_user_idx
  on public.conversations (user_id, last_message_at desc);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  model           text,
  tokens          integer,
  rating          smallint check (rating in (-1, 0, 1)),
  latency_ms      integer,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
--  tutorials
-- ---------------------------------------------------------------------------
create table if not exists public.tutorials (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  class_level  text not null,
  board        text not null,
  subject      text not null,
  chapter      text,
  topic        text not null,
  difficulty   text not null default 'medium',
  title        text not null,
  content      jsonb not null,
  cache_key    text not null,
  model        text,
  is_public    boolean not null default false,
  completed    boolean not null default false,
  completed_at timestamptz,
  times_viewed integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tutorials_user_idx on public.tutorials (user_id, created_at desc);
create index if not exists tutorials_cache_idx on public.tutorials (cache_key);
create unique index if not exists tutorials_user_cache_key
  on public.tutorials (user_id, cache_key);

drop trigger if exists tutorials_updated_at on public.tutorials;
create trigger tutorials_updated_at before update on public.tutorials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  quizzes / quiz_questions / quiz_attempts
-- ---------------------------------------------------------------------------
create table if not exists public.quizzes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  class_level    text,
  board          text,
  subject        text not null,
  chapter        text,
  topic          text,
  difficulty     text not null default 'medium',
  question_count integer not null default 0,
  cache_key      text,
  created_at     timestamptz not null default now()
);

create index if not exists quizzes_user_idx on public.quizzes (user_id, created_at desc);

create table if not exists public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  position       integer not null default 0,
  type           text not null default 'mcq' check (type in ('mcq','true_false','short_answer')),
  question       text not null,
  options        jsonb,
  correct_answer text not null,
  explanation    text not null default '',
  topic          text,
  difficulty     text,
  marks          integer not null default 1,
  created_at     timestamptz not null default now()
);

create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id, position);

create table if not exists public.quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  quiz_id          uuid not null references public.quizzes(id) on delete cascade,
  score            integer not null default 0,
  total            integer not null default 0,
  percentage       numeric(5,2) not null default 0,
  answers          jsonb not null default '[]'::jsonb,
  weak_topics      text[] default '{}',
  duration_seconds integer,
  created_at       timestamptz not null default now()
);

create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);
create index if not exists quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id);

-- ---------------------------------------------------------------------------
--  flashcards / decks / progress
-- ---------------------------------------------------------------------------
create table if not exists public.flashcard_decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  subject     text not null,
  topic       text,
  class_level text,
  board       text,
  source      text not null default 'manual' check (source in ('manual','ai','tutorial')),
  card_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists flashcard_decks_user_idx on public.flashcard_decks (user_id, created_at desc);

drop trigger if exists flashcard_decks_updated_at on public.flashcard_decks;
create trigger flashcard_decks_updated_at before update on public.flashcard_decks
  for each row execute function public.set_updated_at();

create table if not exists public.flashcards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  deck_id    uuid not null references public.flashcard_decks(id) on delete cascade,
  front      text not null,
  back       text not null,
  hint       text,
  subject    text,
  topic      text,
  created_at timestamptz not null default now()
);

create index if not exists flashcards_deck_idx on public.flashcards (deck_id, created_at);
create index if not exists flashcards_user_idx on public.flashcards (user_id);

create table if not exists public.flashcard_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  card_id          uuid not null references public.flashcards(id) on delete cascade,
  deck_id          uuid not null references public.flashcard_decks(id) on delete cascade,
  known_count      integer not null default 0,
  unknown_count    integer not null default 0,
  streak           integer not null default 0,
  mastered         boolean not null default false,
  last_reviewed_at timestamptz,
  next_review_at   timestamptz,
  created_at       timestamptz not null default now(),
  unique (user_id, card_id)
);

create index if not exists flashcard_progress_deck_idx on public.flashcard_progress (user_id, deck_id);

-- ---------------------------------------------------------------------------
--  study_progress  (topic-level mastery used by /progress and /exam-prep)
-- ---------------------------------------------------------------------------
create table if not exists public.study_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  subject         text not null,
  chapter         text,
  topic           text not null,
  status          text not null default 'not_started'
                    check (status in ('not_started','learning','practiced','mastered')),
  confidence      integer not null default 0 check (confidence between 0 and 5),
  minutes_spent   integer not null default 0,
  last_studied_at timestamptz default now(),
  created_at      timestamptz not null default now(),
  unique (user_id, subject, topic)
);

create index if not exists study_progress_user_idx on public.study_progress (user_id, last_studied_at desc);

-- ---------------------------------------------------------------------------
--  study_notes  (private class notes + generated mind maps)
create table if not exists public.study_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  subject     text not null default 'General',
  topic       text,
  content     text not null default '',
  mind_map    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists study_notes_user_idx on public.study_notes (user_id, updated_at desc);

drop trigger if exists study_notes_updated_at on public.study_notes;
create trigger study_notes_updated_at before update on public.study_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  exam_plans  (saved exam preparation packs)
-- ---------------------------------------------------------------------------
create table if not exists public.exam_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  board       text not null,
  class_level text not null,
  subject     text not null,
  chapter     text,
  exam_type   text not null,
  planned_days integer not null default 7,
  title       text not null,
  content     jsonb not null,
  cache_key   text,
  model       text,
  created_at  timestamptz not null default now()
);

create index if not exists exam_plans_user_idx on public.exam_plans (user_id, created_at desc);

-- ---------------------------------------------------------------------------
--  achievements
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  code         text not null,
  title        text not null,
  description  text not null default '',
  icon         text not null default 'award',
  xp_awarded   integer not null default 0,
  unlocked_at  timestamptz not null default now(),
  unique (user_id, code)
);

create index if not exists achievements_user_idx on public.achievements (user_id, unlocked_at desc);

-- ---------------------------------------------------------------------------
--  feedback  (in-app feedback + contact form)
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  email      citext,
  category   text not null default 'other'
               check (category in ('bug','idea','content','billing','contact','other')),
  rating     integer check (rating between 1 and 5),
  message    text not null,
  page       text,
  status     text not null default 'new' check (status in ('new','reviewed','resolved')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);

-- ============================================================================
--  ROW LEVEL SECURITY
--  Everything is deny-by-default. Users only ever touch their own rows.
-- ============================================================================

alter table public.profiles           enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.payments           enable row level security;
alter table public.plan_limits        enable row level security;
alter table public.ai_usage           enable row level security;
alter table public.ai_events          enable row level security;
alter table public.ai_cache           enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.tutorials          enable row level security;
alter table public.quizzes            enable row level security;
alter table public.quiz_questions     enable row level security;
alter table public.quiz_attempts      enable row level security;
alter table public.flashcard_decks    enable row level security;
alter table public.flashcards         enable row level security;
alter table public.flashcard_progress enable row level security;
alter table public.study_progress     enable row level security;
alter table public.study_notes        enable row level security;
alter table public.exam_plans         enable row level security;
alter table public.achievements       enable row level security;
alter table public.feedback           enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Escalation guard: users can never raise their own XP/level/streak directly
    -- from the client (server-side service role does that). Role cannot change.
    and role = (select role from public.profiles p where p.id = auth.uid())
  );

-- subscriptions -------------------------------------------------------------
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only the server (service role) writes here.

-- payments ------------------------------------------------------------------
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);
-- Writes are server-only.

-- plan_limits ---------------------------------------------------------------
drop policy if exists "plan_limits_read_all" on public.plan_limits;
create policy "plan_limits_read_all" on public.plan_limits
  for select using (true);
-- Writes are server-only.

-- ai_usage ------------------------------------------------------------------
drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select using (auth.uid() = user_id);
-- Writes happen through consume_ai_quota() with the service role.

-- ai_events -----------------------------------------------------------------
-- Deliberately no policies: analytics are admin-only via the service role.

-- ai_cache ------------------------------------------------------------------
drop policy if exists "ai_cache_read_all" on public.ai_cache;
create policy "ai_cache_read_all" on public.ai_cache
  for select using (true);
-- Writes are server-only.

-- conversations -------------------------------------------------------------
drop policy if exists "conversations_own" on public.conversations;
create policy "conversations_own" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- messages ------------------------------------------------------------------
drop policy if exists "messages_own" on public.messages;
create policy "messages_own" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tutorials -----------------------------------------------------------------
drop policy if exists "tutorials_select_own_or_public" on public.tutorials;
create policy "tutorials_select_own_or_public" on public.tutorials
  for select using (auth.uid() = user_id or is_public = true);

drop policy if exists "tutorials_insert_own" on public.tutorials;
create policy "tutorials_insert_own" on public.tutorials
  for insert with check (auth.uid() = user_id);

drop policy if exists "tutorials_update_own" on public.tutorials;
create policy "tutorials_update_own" on public.tutorials
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tutorials_delete_own" on public.tutorials;
create policy "tutorials_delete_own" on public.tutorials
  for delete using (auth.uid() = user_id);

-- quizzes & questions -------------------------------------------------------
drop policy if exists "quizzes_own" on public.quizzes;
create policy "quizzes_own" on public.quizzes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "quiz_questions_own" on public.quiz_questions;
create policy "quiz_questions_own" on public.quiz_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "quiz_attempts_own" on public.quiz_attempts;
create policy "quiz_attempts_own" on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- flashcards ----------------------------------------------------------------
drop policy if exists "flashcard_decks_own" on public.flashcard_decks;
create policy "flashcard_decks_own" on public.flashcard_decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "flashcards_own" on public.flashcards;
create policy "flashcards_own" on public.flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "flashcard_progress_own" on public.flashcard_progress;
create policy "flashcard_progress_own" on public.flashcard_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- study_progress ------------------------------------------------------------
drop policy if exists "study_progress_own" on public.study_progress;
create policy "study_progress_own" on public.study_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- study_notes ----------------------------------------------------------------
drop policy if exists "study_notes_own" on public.study_notes;
create policy "study_notes_own" on public.study_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- exam_plans ----------------------------------------------------------------
drop policy if exists "exam_plans_own" on public.exam_plans;
create policy "exam_plans_own" on public.exam_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- achievements --------------------------------------------------------------
drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own" on public.achievements
  for select using (auth.uid() = user_id);
-- Unlocks are awarded server-side only.

-- feedback ------------------------------------------------------------------
drop policy if exists "feedback_insert_any" on public.feedback;
create policy "feedback_insert_any" on public.feedback
  for insert with check (auth.uid() is null or auth.uid() = user_id);

drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own" on public.feedback
  for select using (auth.uid() = user_id);

-- ============================================================================
--  Seed the configurable plan limits from the app defaults.
--  Change these rows (or the code in lib/plans.ts) to adjust quotas.
-- ============================================================================
insert into public.plan_limits (plan, feature, daily_limit) values
  ('free','tutor',5), ('free','tutorial',2), ('free','quiz',3), ('free','image',1),
  ('free','solver',3), ('free','flashcards',0), ('free','exam_prep',1),
  ('pro','tutor',30), ('pro','tutorial',5), ('pro','quiz',10), ('pro','image',5),
  ('pro','solver',15), ('pro','flashcards',10), ('pro','exam_prep',5),
  ('ultra','tutor',100), ('ultra','tutorial',15), ('ultra','quiz',30), ('ultra','image',15),
  ('ultra','solver',50), ('ultra','flashcards',30), ('ultra','exam_prep',15)
on conflict (plan, feature) do nothing;

-- ============================================================================
--  Storage: avatars (public read, users write only their own folder)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
--  Done. Next: create your .env.local from .env.example, then run `npm run dev`.
-- ============================================================================
