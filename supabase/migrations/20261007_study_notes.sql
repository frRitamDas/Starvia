-- Private, user-owned notebook entries and their optional generated mind maps.
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

create index if not exists study_notes_user_idx
  on public.study_notes (user_id, updated_at desc);

alter table public.study_notes enable row level security;

drop policy if exists "study_notes_own" on public.study_notes;
create policy "study_notes_own" on public.study_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists study_notes_updated_at on public.study_notes;
create trigger study_notes_updated_at before update on public.study_notes
  for each row execute function public.set_updated_at();
