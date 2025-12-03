
--------------------------------------------------------------------------------
-- Cleanup legacy feed RPC so new definition can be applied
--------------------------------------------------------------------------------

drop function if exists public.get_feed_candidates(uid uuid, lim int);

