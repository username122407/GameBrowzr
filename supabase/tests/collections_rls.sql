-- Run after the migration on a disposable local or staging database.
-- All fixtures and writes roll back at the end.
begin;

insert into auth.users(id) values
  ('10100000-0000-0000-0000-000000000001'),
  ('10100000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10100000-0000-0000-0000-000000000001', true);

insert into public.gamebrowzr_profiles (user_id, display_name, spotlight_autoplay)
values (auth.uid(), 'Player One', false);
insert into public.gamebrowzr_collections (user_id, kind, game_id, game, status)
values (auth.uid(), 'library', '23', '{"id":23,"name":"Example"}', 'completed');

-- An import cannot overwrite an already-tracked game.
insert into public.gamebrowzr_collections (user_id, kind, game_id, game, status)
values (auth.uid(), 'library', '23', '{"id":23,"name":"Device Example"}', 'playing')
on conflict (user_id, kind, game_id) do nothing;

do $$
begin
  if (select status from public.gamebrowzr_collections where game_id = '23') is distinct from 'completed' then
    raise exception 'Device import overwrote cloud status';
  end if;
  update public.gamebrowzr_profiles set display_name = 'Renamed' where user_id = auth.uid();
  if (select display_name from public.gamebrowzr_profiles where user_id = auth.uid()) is distinct from 'Renamed' then
    raise exception 'Owner could not update own profile';
  end if;
  begin
    update public.gamebrowzr_collections set user_id = '10100000-0000-0000-0000-000000000002';
    raise exception 'Owner transferred ownership';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '10100000-0000-0000-0000-000000000002', true);

do $$
declare affected integer;
begin
  if exists (select from public.gamebrowzr_profiles) or exists (select from public.gamebrowzr_collections) then
    raise exception 'Second user could read private rows';
  end if;
  update public.gamebrowzr_profiles set display_name = 'Cross-account update';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Second user could update private profile'; end if;
  delete from public.gamebrowzr_collections;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Second user could delete private collection'; end if;
  begin
    insert into public.gamebrowzr_collections (user_id, kind, game_id, game)
    values ('10100000-0000-0000-0000-000000000001', 'wishlist', '24', '{"id":24,"name":"Example"}');
    raise exception 'Second user inserted another owner''s row';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role anon;

do $$
begin
  begin
    perform * from public.gamebrowzr_collections;
    raise exception 'Guest read private collections';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
