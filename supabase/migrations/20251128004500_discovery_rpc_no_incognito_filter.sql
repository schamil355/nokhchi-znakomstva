--------------------------------------------------------------------------------
-- Recreate discovery RPC with params and without hiding incognito profiles
--------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_discovery_profiles(integer, integer, text[], text[], integer, integer, numeric, numeric, numeric, numeric);
DROP FUNCTION IF EXISTS public.get_discovery_profiles(integer, integer);

CREATE OR REPLACE FUNCTION public.get_discovery_profiles(
  p_limit integer,
  p_offset integer DEFAULT 0,
  p_genders text[] DEFAULT NULL,
  p_intentions text[] DEFAULT NULL,
  p_min_age integer DEFAULT NULL,
  p_max_age integer DEFAULT NULL,
  p_min_distance_km numeric DEFAULT NULL,
  p_max_distance_km numeric DEFAULT NULL,
  p_origin_lat numeric DEFAULT NULL,
  p_origin_lng numeric DEFAULT NULL
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  viewer uuid := auth.uid();
  safe_limit integer := greatest(coalesce(p_limit, 50), 1);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  viewer_geohash text;
BEGIN
  IF viewer IS NULL THEN
    RETURN;
  END IF;

  SELECT location_geohash INTO viewer_geohash
  FROM public.profiles
  WHERE id = viewer;

  RETURN QUERY
  SELECT p.*
  FROM public.profiles p
  WHERE p.id <> viewer
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_id = viewer
        AND b.blocked_id = p.id
    )
    AND (
      p_genders IS NULL OR array_length(p_genders,1) IS NULL OR p.gender = ANY(p_genders)
    )
    AND (
      p_intentions IS NULL OR array_length(p_intentions,1) IS NULL OR p.intention = ANY(p_intentions)
    )
  ORDER BY
    CASE
      WHEN viewer_geohash IS NOT NULL
           AND p.location_geohash IS NOT NULL
           AND p.location_geohash = viewer_geohash THEN 0
      WHEN viewer_geohash IS NOT NULL
           AND p.location_geohash IS NOT NULL THEN 1
      ELSE 2
    END,
    p.updated_at DESC NULLS LAST,
    p.location_geohash DESC NULLS LAST
  LIMIT safe_limit
  OFFSET safe_offset;
END;
$$;
