-- Starvia fresh-project foundation (v2)
-- Apply ONLY to a newly created Supabase project. Never run against the existing
-- production project. Auth users are owned by Supabase Auth; application records
-- are scoped by user_id and protected with RLS.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  board text not null check (board in ('ICSE','CBSE','STATE','OTHER')),
  class_level smallint not null check (class_level between 6 and 12),
  subjects text[] not null default '{}',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro','ultra')),
  status text not null default 'active' check (status in ('active','pending','cancelled','expired','past_due')),
  provider text not null default 'free' check (provider in ('free','razorpay')),
  provider_customer_id text,
  provider_subscription_id text,
  period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  feature text not null check (feature in ('tutor','tutorial','quiz','flashcards','exam_prep','solve')),
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date, feature)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  subject text,
  board text,
  class_level smallint check (class_level between 6 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_owner_updated_idx on public.conversations(user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(content) between 1 and 30000),
  model text,
  created_at timestamptz not null default now()
);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  board text not null,
  class_level smallint not null check (class_level between 6 and 12),
  subject text not null,
  topic text not null,
  content jsonb not null,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_owner_updated_idx on public.lessons(user_id, updated_at desc);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  board text not null,
  class_level smallint not null check (class_level between 6 and 12),
  subject text not null,
  topic text not null,
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  created_at timestamptz not null default now()
);
create index quizzes_owner_created_idx on public.quizzes(user_id, created_at desc);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  score integer not null default 0 check (score >= 0),
  total integer not null check (total >= 0),
  completed_at timestamptz not null default now()
);
create index attempts_owner_completed_idx on public.quiz_attempts(user_id, completed_at desc);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  subject text,
  minutes integer not null default 0 check (minutes >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  created_at timestamptz not null default now()
);
create index study_sessions_owner_created_idx on public.study_sessions(user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, board, class_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    case when new.raw_user_meta_data->>'board' in ('ICSE','CBSE','STATE','OTHER')
      then new.raw_user_meta_data->>'board' else 'ICSE' end,
    case when coalesce(new.raw_user_meta_data->>'class_level','9') ~ '^(6|7|8|9|10|11|12)$'
      then (new.raw_user_meta_data->>'class_level')::smallint else 9 end
  ) on conflict (id) do nothing;
  insert into public.subscriptions(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS: each student may access only their own records.
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_usage enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.lessons enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.study_sessions enable row level security;

create policy "profile read own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profile update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "subscription read own" on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "usage read own" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
create policy "conversations own all" on public.conversations for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "messages own all" on public.messages for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "lessons own all" on public.lessons for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "quizzes own all" on public.quizzes for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "attempts own all" on public.quiz_attempts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sessions own all" on public.study_sessions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Browser clients cannot write subscriptions or quota counters directly.
revoke insert, update, delete on public.subscriptions from authenticated;
revoke insert, update, delete on public.ai_usage from authenticated;
grant select on public.subscriptions, public.ai_usage to authenticated;

create or replace function public.consume_ai_quota(p_feature text, p_daily_limit integer)
returns table(allowed boolean, used integer, remaining integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_used integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_daily_limit < 0 or p_daily_limit > 10000 then raise exception 'invalid limit'; end if;
  insert into public.ai_usage(user_id, usage_date, feature, used)
  values(v_user, v_today, p_feature, 0)
  on conflict(user_id, usage_date, feature) do nothing;
  select u.used into v_used from public.ai_usage u
  where u.user_id = v_user and u.usage_date = v_today and u.feature = p_feature
  for update;
  if v_used >= p_daily_limit then
    return query select false, v_used, greatest(p_daily_limit - v_used, 0); return;
  end if;
  update public.ai_usage u set used = u.used + 1, updated_at = now()
  where u.user_id = v_user and u.usage_date = v_today and u.feature = p_feature
  returning u.used into v_used;
  return query select true, v_used, greatest(p_daily_limit - v_used, 0);
end $$;
revoke all on function public.consume_ai_quota(text, integer) from public, anon;
grant execute on function public.consume_ai_quota(text, integer) to authenticated;

notify pgrst, 'reload schema';
