-- Starvia: quota access is granted only to confirmed active paid
-- subscriptions, or cancelled subscriptions whose already-paid period is still
-- running. Created/pending/authenticated mandates do not receive paid AI quota.

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
  v_date date := (now() at time zone 'Asia/Kolkata')::date;
  v_used integer;
  v_plan text;
  v_limit integer;
begin
  if auth.uid() is distinct from p_user_id and current_user <> 'service_role' then
    raise exception 'not authorized';
  end if;
  if p_amount <> 1 then
    raise exception 'invalid quota amount';
  end if;

  select coalesce((
    select s.plan::text
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.plan in ('pro','ultra')
      and (
        (
          s.status = 'active'
          and (s.current_period_end is null or s.current_period_end > now())
        )
        or (
          s.status = 'cancelled'
          and s.current_period_end is not null
          and s.current_period_end > now()
        )
      )
    order by s.updated_at desc nulls last
    limit 1
  ), 'free') into v_plan;

  select pl.daily_limit into v_limit
  from public.plan_limits pl
  where pl.plan = v_plan and pl.feature = p_feature;

  if v_limit is null then
    raise exception 'quota feature is not configured';
  end if;

  insert into public.ai_usage(user_id, usage_date, feature, used, tokens_used)
  values (p_user_id, v_date, p_feature, 0, 0)
  on conflict (user_id, usage_date, feature) do nothing;

  select u.used into v_used
  from public.ai_usage u
  where u.user_id = p_user_id
    and u.usage_date = v_date
    and u.feature = p_feature
  for update;

  if v_used + p_amount > v_limit then
    return query select false, v_used, greatest(v_limit - v_used, 0);
    return;
  end if;

  update public.ai_usage u
  set used = u.used + p_amount,
      updated_at = now()
  where u.user_id = p_user_id
    and u.usage_date = v_date
    and u.feature = p_feature
  returning u.used into v_used;

  return query select true, v_used, greatest(v_limit - v_used, 0);
end;
$$;

create or replace function public.refund_ai_quota(
  p_user_id uuid,
  p_feature text,
  p_limit integer,
  p_amount integer default 1
)
returns table (refunded integer, used integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := (now() at time zone 'Asia/Kolkata')::date;
  v_used integer;
  v_plan text;
  v_limit integer;
  v_refund integer;
begin
  if auth.uid() is distinct from p_user_id and current_user <> 'service_role' then
    raise exception 'not authorized';
  end if;
  if p_amount <> 1 then
    raise exception 'invalid quota amount';
  end if;

  select coalesce((
    select s.plan::text
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.plan in ('pro','ultra')
      and (
        (
          s.status = 'active'
          and (s.current_period_end is null or s.current_period_end > now())
        )
        or (
          s.status = 'cancelled'
          and s.current_period_end is not null
          and s.current_period_end > now()
        )
      )
    order by s.updated_at desc nulls last
    limit 1
  ), 'free') into v_plan;

  select pl.daily_limit into v_limit
  from public.plan_limits pl
  where pl.plan = v_plan and pl.feature = p_feature;

  if v_limit is null then
    raise exception 'quota feature is not configured';
  end if;

  select u.used into v_used
  from public.ai_usage u
  where u.user_id = p_user_id
    and u.usage_date = v_date
    and u.feature = p_feature
  for update;

  if not found then
    return query select 0, 0, v_limit;
    return;
  end if;

  v_refund := least(p_amount, greatest(v_used, 0));

  if v_refund > 0 then
    update public.ai_usage u
    set used = greatest(u.used - v_refund, 0),
        updated_at = now()
    where u.user_id = p_user_id
      and u.usage_date = v_date
      and u.feature = p_feature
    returning u.used into v_used;
  end if;

  return query select v_refund, v_used, greatest(v_limit - v_used, 0);
end;
$$;

revoke all on function public.consume_ai_quota(uuid,text,integer,integer) from public;
grant execute on function public.consume_ai_quota(uuid,text,integer,integer) to authenticated, service_role;

revoke all on function public.refund_ai_quota(uuid,text,integer,integer) from public;
grant execute on function public.refund_ai_quota(uuid,text,integer,integer) to authenticated, service_role;

notify pgrst, 'reload schema';
