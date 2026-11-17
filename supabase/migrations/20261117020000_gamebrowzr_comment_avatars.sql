begin;

-- Only return allowlisted preset identifiers for authors who have posted on this game.
create function public.gamebrowzr_discussion_avatars(target_game text, authors uuid[])
returns table(author_id uuid, avatar text)
language sql stable security definer set search_path = ''
as $$
  select u.id,
    case when u.raw_user_meta_data ->> 'gamebrowzr_avatar' in
      ('orbit', 'pilot', 'mech', 'duelist', 'night', 'specter')
    then u.raw_user_meta_data ->> 'gamebrowzr_avatar'
    else 'orbit' end
  from auth.users u
  where cardinality(authors) <= 1000
    and u.id = any(authors)
    and exists (
      select 1 from public.gamebrowzr_comments c
      where c.game_id = target_game and c.author_id = u.id
    );
$$;

revoke all on function public.gamebrowzr_discussion_avatars(text, uuid[]) from public, anon, authenticated;
grant execute on function public.gamebrowzr_discussion_avatars(text, uuid[]) to anon, authenticated;

commit;
