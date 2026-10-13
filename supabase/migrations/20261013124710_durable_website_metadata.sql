alter table public.bookmarks
  add column metadata_status text not null default 'pending'
    check (metadata_status in ('pending','fetching','ready','retry','blocked')),
  add column metadata_attempts integer not null default 0 check (metadata_attempts >= 0),
  add column metadata_next_retry_at timestamptz default now(),
  add column metadata_checked_at timestamptz,
  add column metadata_snapshot jsonb not null default '{}'::jsonb;

create index bookmark_metadata_due on public.bookmarks(user_id,metadata_next_retry_at)
  where metadata_status in ('pending','retry','fetching');

-- URL edits invalidate derived values and in-flight work. Custom copy survives.
create function public.reset_bookmark_metadata() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.url is distinct from old.url then
    if new.title = old.title and
      (old.title = old.hostname or old.title = old.metadata_snapshot->>'title') then
      new.title = new.hostname;
    end if;
    if new.description = old.description and old.description = old.metadata_snapshot->>'description' then
      new.description = '';
    end if;
    if new.favicon_url is not distinct from old.favicon_url then new.favicon_url = null; end if;
    if new.preview_image_url is not distinct from old.preview_image_url then new.preview_image_url = null; end if;
    new.metadata_status = 'pending';
    new.metadata_attempts = 0;
    new.metadata_next_retry_at = now();
    new.metadata_checked_at = null;
    if new.metadata_snapshot is not distinct from old.metadata_snapshot then new.metadata_snapshot = '{}'::jsonb; end if;
  end if;
  return new;
end $$;
-- Run before the search-document trigger so search sees the final derived copy.
create trigger bookmark_metadata_reset before update of url on public.bookmarks
  for each row execute function public.reset_bookmark_metadata();

-- Atomic completion preserves manual edits made while the network request ran.
-- SECURITY INVOKER keeps the existing bookmark ownership RLS in force.
create function public.complete_bookmark_metadata(
  bookmark_id uuid, owner_id uuid, expected_url text, expected_attempt integer,
  fetched_title text, fetched_description text, fetched_favicon text, fetched_image text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  update public.bookmarks set
    title = case when title = hostname or title = '' or title = metadata_snapshot->>'title' then coalesce(nullif(fetched_title,''),title) else title end,
    description = case when description = '' or description = metadata_snapshot->>'description' then coalesce(fetched_description,'') else description end,
    favicon_url = case when favicon_url is null or favicon_url = metadata_snapshot->>'favicon_url' then coalesce(fetched_favicon,favicon_url) else favicon_url end,
    preview_image_url = case when preview_image_url is null or preview_image_url = metadata_snapshot->>'preview_image_url' then coalesce(fetched_image,preview_image_url) else preview_image_url end,
    metadata_status = 'ready', metadata_checked_at = now(), metadata_next_retry_at = null,
    metadata_snapshot = jsonb_strip_nulls(jsonb_build_object(
      'title',case when title = hostname or title = '' or title = metadata_snapshot->>'title' then coalesce(nullif(fetched_title,''),title) else null end,
      'description',case when description = '' or description = metadata_snapshot->>'description' then coalesce(fetched_description,'') else null end,
      'favicon_url',case when favicon_url is null or favicon_url = metadata_snapshot->>'favicon_url' then coalesce(fetched_favicon,favicon_url) else null end,
      'preview_image_url',case when preview_image_url is null or preview_image_url = metadata_snapshot->>'preview_image_url' then coalesce(fetched_image,preview_image_url) else null end
    ))
  where id = bookmark_id and user_id = owner_id and url = expected_url
    and metadata_attempts = expected_attempt and metadata_status = 'fetching'
  returning to_jsonb(bookmarks.*) into result;
  return result;
end $$;
revoke all on function public.complete_bookmark_metadata(uuid,uuid,text,integer,text,text,text,text) from public,anon;
grant execute on function public.complete_bookmark_metadata(uuid,uuid,text,integer,text,text,text,text) to authenticated,service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('website-previews','website-previews',false,2097152,array['image/jpeg'])
on conflict(id) do nothing;

-- A deleted bookmark's object becomes inaccessible immediately; cleanup can
-- remove orphaned blobs later without a database trigger touching Storage data.
create policy own_website_previews on storage.objects for all to authenticated
using (
  bucket_id = 'website-previews' and
  split_part(name,'/',1) = (select auth.uid())::text and
  exists(select 1 from public.bookmarks b where b.id::text = split_part(name,'/',2) and b.user_id = (select auth.uid()))
)
with check (
  bucket_id = 'website-previews' and
  split_part(name,'/',1) = (select auth.uid())::text and
  exists(select 1 from public.bookmarks b where b.id::text = split_part(name,'/',2) and b.user_id = (select auth.uid()))
);
