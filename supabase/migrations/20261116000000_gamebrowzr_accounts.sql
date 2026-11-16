begin;

create table public.gamebrowzr_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 48),
  spotlight_autoplay boolean not null default true
);

create table public.gamebrowzr_collections (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('wishlist', 'library')),
  game_id text not null check (game_id ~ '^([1-9][0-9]{0,15}|demo-[0-9]{1,10})$'),
  game jsonb not null check (
    jsonb_typeof(game) = 'object' and octet_length(game::text) <= 16384
    and (game->>'id' = game_id) is true
    and (char_length(trim(game->>'name')) between 1 and 256) is true
  ),
  status text,
  added_at timestamptz not null default now(),
  primary key (user_id, kind, game_id),
  check ((kind = 'wishlist' and status is null)
      or (kind = 'library' and status is not null and status in ('playing', 'completed')))
);

alter table public.gamebrowzr_profiles enable row level security;
alter table public.gamebrowzr_collections enable row level security;

revoke all on public.gamebrowzr_profiles, public.gamebrowzr_collections from public, anon, authenticated;
grant select, insert, update on public.gamebrowzr_profiles to authenticated;
grant select, insert, update, delete on public.gamebrowzr_collections to authenticated;

create policy profile_select_own on public.gamebrowzr_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profile_insert_own on public.gamebrowzr_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy profile_update_own on public.gamebrowzr_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy collection_select_own on public.gamebrowzr_collections for select to authenticated
  using ((select auth.uid()) = user_id);
create policy collection_insert_own on public.gamebrowzr_collections for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy collection_update_own on public.gamebrowzr_collections for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy collection_delete_own on public.gamebrowzr_collections for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
