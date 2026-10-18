-- Internal counters are inaccessible to browser and bearer-token clients.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
create table private.api_rate_limits (
  subject text not null,
  bucket text not null,
  window_start timestamptz not null,
  requests integer not null,
  expires_at timestamptz not null,
  primary key (subject, bucket)
);
alter table private.api_rate_limits enable row level security;
revoke all on private.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on private.api_rate_limits to service_role;
create index api_rate_limits_expiry on private.api_rate_limits(expires_at);

create function public.consume_api_limit(subject_key text, bucket_name text, max_requests integer, window_seconds integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_time_utc timestamptz := clock_timestamp();
  starts timestamptz;
  ends timestamptz;
  used integer;
begin
  if length(subject_key) not between 1 and 128 or length(bucket_name) not between 1 and 40
    or max_requests not between 1 and 100000 or window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit policy';
  end if;
  starts := to_timestamp(floor(extract(epoch from current_time_utc) / window_seconds) * window_seconds);
  ends := starts + make_interval(secs => window_seconds);
  insert into private.api_rate_limits as counters(subject, bucket, window_start, requests, expires_at)
    values(subject_key, bucket_name, starts, 1, ends)
    on conflict(subject, bucket) do update set
      requests = case when counters.window_start = starts then least(counters.requests + 1, max_requests + 1) else 1 end,
      window_start = starts, expires_at = ends
    returning requests into used;
  -- Bounded opportunistic cleanup; no scheduler required and no unbounded history.
  delete from private.api_rate_limits where (subject, bucket) in (
    select subject, bucket from private.api_rate_limits
    where expires_at < current_time_utc - interval '1 day' limit 100
  );
  return jsonb_build_object('allowed', used <= max_requests,
    'retry_after', greatest(1, ceil(extract(epoch from ends - current_time_utc))::integer));
end;
$$;
revoke all on function public.consume_api_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_api_limit(text,text,integer,integer) to service_role;
