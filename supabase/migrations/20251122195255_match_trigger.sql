--------------------------------------------------------------------------------
-- Trigger: create match automatically when mutual likes exist
--------------------------------------------------------------------------------

create or replace function public.handle_mutual_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_match(new.liker_id, new.likee_id);
  return new;
end;
$$;

drop trigger if exists trg_like_to_match on public.likes;
create trigger trg_like_to_match
  after insert on public.likes
  for each row execute function public.handle_mutual_like();
