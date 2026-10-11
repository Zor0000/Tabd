create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', avatar_url text,
 created_at timestamptz not null default now()
);
create table public.collections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 60),
 parent_id uuid, color text not null default 'violet' check(color in ('violet','blue','green','orange','pink')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (id,user_id),
 foreign key (parent_id,user_id) references public.collections(id,user_id) on delete set null (parent_id),
 check (parent_id is distinct from id)
);
create unique index collection_names on public.collections(user_id,coalesce(parent_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(name));
create index collection_owner on public.collections(user_id,parent_id);
create table public.bookmarks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 collection_id uuid,
 url text not null check(url ~ '^https?://'), normalized_url text not null,
 title text not null check(length(title)<=300), description text not null default '' check(length(description)<=2000),
 hostname text not null, favicon_url text, preview_image_url text,
 tags text[] not null default '{}' check(cardinality(tags)<=20),
 personal_note text not null default '' check(length(personal_note)<=5000),
 status text not null default 'To Explore' check(status in ('To Explore','In Use','Reference')),
 is_favorite boolean not null default false, is_archived boolean not null default false,
 open_count integer not null default 0 check(open_count>=0), last_opened_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 search_document tsvector,
 unique(user_id,normalized_url),
 foreign key(collection_id,user_id) references public.collections(id,user_id) on delete set null (collection_id)
);
create index bookmark_owner_date on public.bookmarks(user_id,created_at desc);
create index bookmark_collection on public.bookmarks(collection_id,user_id);
create index bookmark_status on public.bookmarks(user_id,status) where not is_archived;
create index bookmark_search on public.bookmarks using gin(search_document);
create index bookmark_tags on public.bookmarks using gin(tags);
create table public.extension_tokens (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 token_hash text not null unique check(length(token_hash)=64),
 created_at timestamptz not null default now(), expires_at timestamptz not null
);
create index extension_token_owner on public.extension_tokens(user_id);
create function public.update_resource_search() returns trigger language plpgsql set search_path='' as $$
begin
 new.updated_at=now();
 new.search_document=to_tsvector('simple',coalesce(new.title,'')||' '||coalesce(new.description,'')||' '||coalesce(new.hostname,'')||' '||coalesce(new.personal_note,'')||' '||array_to_string(new.tags,' '));
 return new;
end $$;
create trigger resource_search before insert or update on public.bookmarks for each row execute function public.update_resource_search();
create function public.validate_collection_tree() returns trigger language plpgsql set search_path='' as $$
declare depth int; cyclic boolean;
begin
 -- Serialize hierarchy writes per owner, avoiding concurrent cycle insertion.
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 new.updated_at=now();
 if new.parent_id is not null then
  with recursive ancestors as (
   select id,parent_id,1 as level from public.collections where id=new.parent_id and user_id=new.user_id
   union all select c.id,c.parent_id,a.level+1 from public.collections c join ancestors a on c.id=a.parent_id where a.level<10
  ) select max(level),bool_or(id=new.id) into depth,cyclic from ancestors;
  if depth is null or depth>=3 or cyclic then raise exception 'Invalid collection hierarchy (maximum 3 levels)'; end if;
  -- Moving an existing subtree must also respect the maximum depth.
  with recursive descendants as (
   select id,1 as level from public.collections where parent_id=new.id and user_id=new.user_id
   union all select c.id,d.level+1 from public.collections c join descendants d on c.parent_id=d.id where d.level<10
  ) select coalesce(max(level),0)+depth into depth from descendants;
  if depth>=3 then raise exception 'Subtree exceeds maximum depth'; end if;
 end if;
 return new;
end $$;
create trigger collection_tree before insert or update on public.collections for each row execute function public.validate_collection_tree();
-- Invoker privileges preserve RLS. Extension requests use a server-only service role,
-- and explicitly pass their validated token's owner. Counts increment atomically.
create function public.record_open(bookmark_id uuid,owner_id uuid) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 update public.bookmarks set open_count=open_count+1,last_opened_at=now() where id=bookmark_id and user_id=owner_id returning to_jsonb(bookmarks.*) into result;
 return result;
end $$;
alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.bookmarks enable row level security;
alter table public.extension_tokens enable row level security;
create policy own_profile on public.profiles for all to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
create policy own_collections on public.collections for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own_bookmarks on public.bookmarks for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own_extension_tokens on public.extension_tokens for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,insert,update,delete on public.profiles,public.collections,public.bookmarks,public.extension_tokens to authenticated;
grant all on public.profiles,public.collections,public.bookmarks,public.extension_tokens to service_role;
revoke all on function public.record_open(uuid,uuid) from public;
grant execute on function public.record_open(uuid,uuid) to authenticated,service_role;
