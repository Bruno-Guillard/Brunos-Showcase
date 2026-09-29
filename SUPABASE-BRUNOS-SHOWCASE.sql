-- Bruno’s Showcase — accès public en lecture seule
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Ce script n'expose AUCUN prix, bénéfice, frais ni note privée.
-- Il rend publiques uniquement les fiches situées dans les dossiers
-- "En vente", "À vendre" ou "A vendre", et uniquement leurs photos.

create table if not exists public.folio_showcase_config (
  singleton boolean primary key default true check (singleton),
  owner_user_id uuid not null references auth.users(id) on delete cascade
);

alter table public.folio_showcase_config enable row level security;
revoke all on public.folio_showcase_config from anon, authenticated;

-- On rattache la vitrine au propriétaire actuel de la bibliothèque Folio.
with owner as (
  select user_id
  from public.folio_folders
  group by user_id
  order by min(created_at)
  limit 1
), fallback as (
  select id as user_id
  from auth.users
  order by created_at
  limit 1
), picked as (
  select coalesce((select user_id from owner), (select user_id from fallback)) as user_id
)
insert into public.folio_showcase_config (singleton, owner_user_id)
select true, user_id from picked where user_id is not null
on conflict (singleton) do update set owner_user_id = excluded.owner_user_id;

create or replace function public.folio_showcase_items()
returns table (
  id uuid,
  name text,
  description text,
  sort_order integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select i.id, i.name, i.description, i.sort_order, i.updated_at
  from public.folio_items i
  join public.folio_folders f on f.id = i.folder_id
  join public.folio_showcase_config c on c.singleton = true
  where i.user_id = c.owner_user_id
    and f.user_id = c.owner_user_id
    and lower(trim(f.name)) in ('en vente', 'à vendre', 'a vendre')
  order by f.sort_order asc, i.sort_order asc, i.created_at asc;
$$;

revoke all on function public.folio_showcase_items() from public;
grant execute on function public.folio_showcase_items() to anon, authenticated;

create or replace function public.folio_showcase_photos()
returns table (
  item_id uuid,
  storage_path text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.item_id, p.storage_path, p.sort_order
  from public.folio_photos p
  join public.folio_items i on i.id = p.item_id
  join public.folio_folders f on f.id = i.folder_id
  join public.folio_showcase_config c on c.singleton = true
  where i.user_id = c.owner_user_id
    and p.user_id = c.owner_user_id
    and f.user_id = c.owner_user_id
    and lower(trim(f.name)) in ('en vente', 'à vendre', 'a vendre')
  order by i.sort_order asc, p.sort_order asc, p.created_at asc;
$$;

revoke all on function public.folio_showcase_photos() from public;
grant execute on function public.folio_showcase_photos() to anon, authenticated;

create or replace function public.folio_showcase_photo_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.folio_photos p
    join public.folio_items i on i.id = p.item_id
    join public.folio_folders f on f.id = i.folder_id
    join public.folio_showcase_config c on c.singleton = true
    where p.storage_path = object_name
      and p.user_id = c.owner_user_id
      and i.user_id = c.owner_user_id
      and f.user_id = c.owner_user_id
      and lower(trim(f.name)) in ('en vente', 'à vendre', 'a vendre')
  );
$$;

revoke all on function public.folio_showcase_photo_allowed(text) from public;
grant execute on function public.folio_showcase_photo_allowed(text) to anon, authenticated;

drop policy if exists "showcase_read_selected_photos" on storage.objects;
create policy "showcase_read_selected_photos"
on storage.objects
for select
to anon
using (
  bucket_id = 'folio-photos'
  and public.folio_showcase_photo_allowed(name)
  and storage.allow_any_operation(array['object.get_authenticated_info', 'object.get_authenticated'])
);

notify pgrst, 'reload schema';
