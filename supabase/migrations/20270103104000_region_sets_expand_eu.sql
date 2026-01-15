--------------------------------------------------------------------------------
-- Expand EU_BASE region set to include all EU countries
--------------------------------------------------------------------------------

insert into public.region_sets (id, country_codes)
values (
  'EU_BASE',
  array[
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
    'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
  ]
)
on conflict (id) do update
set country_codes = excluded.country_codes;
