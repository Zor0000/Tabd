-- Cover the composite parent foreign key and descendant lookups.
create index collection_parent on public.collections(parent_id,user_id);
