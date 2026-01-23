--------------------------------------------------------------------------------
-- Expand EU_BASE to include wider Europe (align with app-side geo logic)
--------------------------------------------------------------------------------

insert into public.region_sets (id, country_codes)
values (
  'EU_BASE',
  array[
    'AL','AD','AM','AT','AZ','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','DE',
    'GR','HU','IS','IE','IT','KZ','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO',
    'PL','PT','RO','SM','RS','SK','SI','ES','SE','CH','TR','UA','GB','VA'
  ]
)
on conflict (id) do update
set country_codes = excluded.country_codes;
