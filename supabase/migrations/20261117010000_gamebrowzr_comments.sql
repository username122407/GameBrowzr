begin;

create table public.gamebrowzr_comments (
  id uuid primary key default gen_random_uuid(),
  game_id text not null check (game_id ~ '^([1-9][0-9]{0,15}|demo-[0-9]{1,10})$'),
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default 'Player' check (char_length(author_name) between 1 and 48),
  body text not null check (char_length(body) <= 1000 and body ~ '[^[:space:]]'),
  created_at timestamptz not null default now()
);

create index gamebrowzr_comments_game_feed on public.gamebrowzr_comments (game_id, created_at desc, id desc);
create index gamebrowzr_comments_author on public.gamebrowzr_comments (author_id);

create function public.gamebrowzr_comment_author() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  new.author_name := coalesce(
    (select nullif(btrim(display_name), '') from public.gamebrowzr_profiles
     where user_id = (select auth.uid())),
    'Player'
  );
  return new;
end;
$$;

create trigger gamebrowzr_comment_author before insert on public.gamebrowzr_comments
for each row execute function public.gamebrowzr_comment_author();

revoke all on function public.gamebrowzr_comment_author() from public, anon, authenticated;
revoke all on public.gamebrowzr_comments from public, anon, authenticated;
grant select on public.gamebrowzr_comments to anon, authenticated;
grant insert (game_id, body), delete on public.gamebrowzr_comments to authenticated;

alter table public.gamebrowzr_comments enable row level security;

create policy "Public can read game comments" on public.gamebrowzr_comments
  for select to anon, authenticated using (true);

create policy "Members can post their own comments" on public.gamebrowzr_comments
  for insert to authenticated with check (
    author_id = (select auth.uid()) and
    not coalesce((select auth.jwt() ->> 'is_anonymous') = 'true', false)
  );

create policy "Members can delete their own comments" on public.gamebrowzr_comments
  for delete to authenticated using (author_id = (select auth.uid()));

commit;
