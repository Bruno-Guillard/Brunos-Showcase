-- Bruno’s Showcase V1.1 — titre d'annonce + prix demandé
-- À exécuter APRES la migration Folio V6.5.
-- Cette nouvelle fonction publique ne renvoie JAMAIS le nom interne Folio,
-- ni prix d'achat, prix de vente, bénéfice, frais ou notes privées.

create or replace function public.folio_showcase_items_v2()
returns table (
  id uuid,
  listing_title text,
  asking_price numeric,
  description text,
  sort_order integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    i.id,
    i.listing_title,
    i.asking_price,
    i.description,
    i.sort_order,
    i.updated_at
  from public.folio_items i
  join public.folio_folders f on f.id = i.folder_id
  join public.folio_showcase_config c on c.singleton = true
  where i.user_id = c.owner_user_id
    and f.user_id = c.owner_user_id
    and lower(trim(f.name)) in ('en vente', 'à vendre', 'a vendre')
  order by f.sort_order asc, i.sort_order asc, i.created_at asc;
$$;

revoke all on function public.folio_showcase_items_v2() from public;
grant execute on function public.folio_showcase_items_v2() to anon, authenticated;

notify pgrst, 'reload schema';
