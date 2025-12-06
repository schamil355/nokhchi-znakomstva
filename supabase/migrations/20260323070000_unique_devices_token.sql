--------------------------------------------------------------------------------
-- Ensure each push token is only associated with a single user
--------------------------------------------------------------------------------

create unique index if not exists devices_token_unique on public.devices(token);
