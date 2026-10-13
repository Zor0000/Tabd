-- Agent credentials are independent of the extension's read/write credentials.
create table public.mcp_tokens (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 60),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '30 days',
 check(expires_at > created_at and expires_at <= created_at + interval '31 days')
);
create index mcp_token_owner on public.mcp_tokens(user_id);
alter table public.mcp_tokens enable row level security;
create policy own_mcp_tokens on public.mcp_tokens for all to authenticated
 using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
-- Override hosted projects' default table grants before granting the exact roles.
revoke all on public.mcp_tokens from public,anon,authenticated,service_role;
grant select,insert,delete on public.mcp_tokens to authenticated;
grant select on public.mcp_tokens to service_role;

create table public.taste_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 preferences text not null default '' check(length(preferences)<=5000),
 updated_at timestamptz not null default now()
);
alter table public.taste_profiles enable row level security;
create policy own_taste_profile on public.taste_profiles for all to authenticated
 using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.taste_profiles from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.taste_profiles to authenticated;
grant select on public.taste_profiles to service_role;

-- Invoker privileges preserve RLS for dashboard callers. The MCP server passes
-- only the owner resolved from a verified token when using the service role.
create function public.search_library_references(
 owner_id uuid,
 search_query text default '',
 collection uuid default null,
 required_tags text[] default '{}',
 favorites_only boolean default false,
 include_archived boolean default false,
 page_size integer default 21,
 page_offset integer default 0
) returns table(resource jsonb, relevance real)
language sql stable security invoker set search_path='' as $$
 with recursive scope as (
  select c.id from public.collections c where c.id=collection and c.user_id=owner_id
  union
  select c.id from public.collections c join scope s on c.parent_id=s.id where c.user_id=owner_id
 ), terms as (
  select websearch_to_tsquery('simple',left(search_query,300)) as query
 ), matches as (
  select b, case when trim(search_query)='' then 0::real else ts_rank_cd(b.search_document,t.query) end as rank
  from public.bookmarks b cross join terms t
  where b.user_id=owner_id
   and (include_archived or not b.is_archived)
   and (not favorites_only or b.is_favorite)
   and (collection is null or b.collection_id in (select id from scope))
   and b.tags @> required_tags
   and (trim(search_query)='' or b.search_document @@ t.query)
 )
 select to_jsonb(b)-'user_id'-'search_document'-'normalized_url',rank
 from matches order by rank desc,(b).is_favorite desc,(b).updated_at desc,(b).id
 limit greatest(1,least(page_size,51)) offset greatest(0,least(page_offset,100000));
$$;
revoke all on function public.search_library_references(uuid,text,uuid,text[],boolean,boolean,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.search_library_references(uuid,text,uuid,text[],boolean,boolean,integer,integer) to authenticated,service_role;
