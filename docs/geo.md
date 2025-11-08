## Importing Real Chechnya Polygons

The seeded geometry in `public.geo_regions` is only a circular approximation around Grozny for quick local testing. When you source accurate boundaries later on, follow these steps to load a real polygon:

1. Obtain an official or trusted Chechnya polygon (GeoJSON). A reliable source is the Russian administrative boundaries dataset from GADM or Natural Earth.
2. Upload the GeoJSON into Supabase storage or keep it locally and run the SQL below via the SQL editor or `supabase db remote commit`.
3. Replace the existing `CHECHNYA` row by converting the GeoJSON to a `geography` multipolygon:

```sql
-- Example: load precise Chechnya polygon
WITH geo AS (
  SELECT ST_SetSRID(
           ST_GeomFromGeoJSON(:chechnya_geojson),
           4326
         ) AS geom
)
UPDATE public.geo_regions
SET geom = ST_Multi(geo.geom)::geography,
    centroid = ST_Centroid(geo.geom)::geography,
    name = 'Chechnya'
FROM geo
WHERE id = 'CHECHNYA';
```

- Use a bind variable `:chechnya_geojson` (or `jsonb_build_object(...)`) to pass the full GeoJSON string.
- `ST_Multi` ensures the geometry is stored as a multipolygon even if the dataset only contains a single polygon.
- `ST_Centroid` computes an accurate centroid for map previews and proximity lookups.

After the update, rerun any region-based caching or tile generation jobs so the new geometry propagates everywhere.
