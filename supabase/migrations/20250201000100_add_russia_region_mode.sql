--------------------------------------------------------------------------------
-- Extend search_region_mode enum with RUSSIA option and seed profile settings
--------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_type where typname = 'search_region_mode') then
    begin
      alter type search_region_mode add value if not exists 'RUSSIA';
    exception
      when duplicate_object then
        null;
    end;
  end if;
end $$;
