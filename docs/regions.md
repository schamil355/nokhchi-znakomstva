## Region Models Overview

### Chechnya Geometry
- Aktuell wird `geo_regions.id = 'CHECHNYA'` als gepufferter Kreis um Grozny modelliert.  
  `ST_Buffer(ST_MakePoint(45.694, 43.317)::geography, 130000)` → Radius ≈ 130 km.
- Dies dient als einfache Approximation für lokale Tests; produktiv sollte ein offizielles Polygon verwendet werden.

### Polygon-Update (z. B. offizielles ISO-3166-2 RU-CE GeoJSON)
```sql
UPDATE public.geo_regions
SET geom = ST_SetSRID(ST_GeomFromGeoJSON(:chechnya_geojson), 4326)::geography,
    centroid = ST_Centroid(ST_GeomFromGeoJSON(:chechnya_geojson))::geography,
    updated_at = timezone('utc', now())
WHERE id = 'CHECHNYA';
```
- Parameter `:chechnya_geojson` enthält das komplette GeoJSON.
- Durch `ST_SetSRID(..., 4326)::geography` bleibt das Geography-Schema bestehen; der Centroid wird nachgezogen.

### Europa-Regionen erweitern
- `region_sets.id = 'EU_BASE'` definiert die Länder für den Europa-Feed.  
- Länder ergänzen:
```sql
UPDATE public.region_sets
SET country_codes = ARRAY['FR','DE','AT','BE','NO','IT','ES','SE']  -- Beispiel
WHERE id = 'EU_BASE';
```
- Alternativ `UPSERT` via `INSERT ... ON CONFLICT`.

### Nacharbeiten & Checkliste
1. **ANALYZE** auf `geo_regions` ausführen, damit der Planner neue Statistiken nutzt:
   ```sql
   ANALYZE public.geo_regions;
   ```
2. **Index prüfen** – sicherstellen, dass `geo_regions_geom_idx` weiterhin existiert & `valid`:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'geo_regions';
   ```
3. **RPC testen** (`get_candidates_region`) für betroffene Nutzer:
   - Minimaltest via `SELECT * FROM public.get_candidates_region(:viewer_id, 'CHECHNYA', 20);`
   - Sicherstellen, dass neue Polygone korrekt filtern.
