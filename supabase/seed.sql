-- Demo seed: create auth users + profiles for local development.

create extension if not exists pgcrypto;

create temporary table seed_users (
  id uuid primary key,
  email text not null,
  password text not null,
  display_name text not null,
  gender text not null,
  orientation text not null,
  birthday date not null,
  country text not null,
  region_code text not null,
  bio text,
  photo_url text,
  interests text[] not null,
  verified_at timestamptz,
  latitude double precision,
  longitude double precision
) on commit drop;

insert into seed_users (
  id,
  email,
  password,
  display_name,
  gender,
  orientation,
  birthday,
  country,
  region_code,
  bio,
  photo_url,
  interests,
  verified_at,
  latitude,
  longitude
) values
  (
    'c11f9a37-c0d3-4aef-9571-ddc2f2580df8',
    'amina.eu@example.com',
    'Demo1234!',
    'Amina',
    'female',
    'men',
    '1997-04-12',
    'DE',
    'EUROPE',
    'UX Designerin, liebt Third-Wave-Kaffee und Spaziergaenge am Fluss.',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    array['Reisen','Kunst','Musik'],
    now(),
    null,
    null
  ),
  (
    '0573d7fb-7986-4589-ad9d-78d2a929e775',
    'fatima.eu@example.com',
    'Demo1234!',
    'Fatima',
    'female',
    'men',
    '1995-09-03',
    'FR',
    'EUROPE',
    'Foodie, testet neue Bistros und sammelt Rezepte aus Paris.',
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80',
    array['Kulinarik','Reisen','Natur'],
    null,
    null,
    null
  ),
  (
    '31ba563a-1b65-41c5-8436-d1d38d4c1b42',
    'elena.eu@example.com',
    'Demo1234!',
    'Elena',
    'female',
    'men',
    '1998-01-21',
    'ES',
    'EUROPE',
    'Liebt Strandlaeufe, Tapas und kleine Fototouren.',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    array['Fotografie','Reisen','Sport'],
    null,
    null,
    null
  ),
  (
    'c5e6104f-6ca8-493d-90a7-da571f9b0f4b',
    'sofia.eu@example.com',
    'Demo1234!',
    'Sofia',
    'female',
    'men',
    '1996-06-15',
    'IT',
    'EUROPE',
    'Kocht gern italienisch, plant Citytrips und geht gern ins Museum.',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    array['Kunst','Reisen','Kulinarik'],
    null,
    null,
    null
  ),
  (
    '7ee0dce7-9975-40ec-84dd-ece412b31436',
    'mila.eu@example.com',
    'Demo1234!',
    'Mila',
    'female',
    'men',
    '1999-11-02',
    'NL',
    'EUROPE',
    'Radelt durch die Stadt, mag Designmaerkte und Eiskaffee.',
    'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&w=800&q=80',
    array['Sport','Kunst','Reisen'],
    null,
    null,
    null
  ),
  (
    '0a726505-eb6b-4f67-be60-2c3450d6cc9b',
    'klara.eu@example.com',
    'Demo1234!',
    'Klara',
    'female',
    'men',
    '1994-05-09',
    'AT',
    'EUROPE',
    'Laeuft morgens im Park, hoert Podcasts und arbeitet im Marketing.',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    array['Sport','Natur','Technologie'],
    now(),
    null,
    null
  ),
  (
    '42e9ae1a-8f25-449b-9b5d-c631d9ce65c7',
    'nora.eu@example.com',
    'Demo1234!',
    'Nora',
    'female',
    'men',
    '2000-02-18',
    'SE',
    'EUROPE',
    'Nordlicht, gern im Sauna-Club und bei langen Fahrradtouren.',
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80',
    array['Wellness','Sport','Natur'],
    null,
    null,
    null
  ),
  (
    'ce3f342b-157a-412d-b05d-7e38bba220c2',
    'lea.eu@example.com',
    'Demo1234!',
    'Lea',
    'female',
    'men',
    '1995-12-11',
    'BE',
    'EUROPE',
    'Verbringt Wochenenden in den Bergen und liebt Buchlaeden.',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    array['Natur','Lesen','Reisen'],
    now(),
    null,
    null
  ),
  (
    'f559bf97-9d7a-4935-962e-ac275746514d',
    'jana.eu@example.com',
    'Demo1234!',
    'Jana',
    'female',
    'men',
    '1997-07-08',
    'CZ',
    'EUROPE',
    'Data Analystin, mag Yoga, Jazz und gemuetliche Cafes.',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    array['Musik','Wellness','Technologie'],
    null,
    null,
    null
  ),
  (
    'e3a7e4de-8092-452c-b661-9c3969f0bccf',
    'maja.eu@example.com',
    'Demo1234!',
    'Maja',
    'female',
    'men',
    '1993-03-30',
    'PL',
    'EUROPE',
    'Product Ownerin, liebt Roadtrips und Street-Food.',
    'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&w=800&q=80',
    array['Reisen','Kulinarik','Startups'],
    null,
    null,
    null
  ),
  (
    '110a7497-2d82-4912-a731-c430934393a9',
    'sara.eu@example.com',
    'Demo1234!',
    'Sara',
    'female',
    'men',
    '1998-08-27',
    'PT',
    'EUROPE',
    'Reist gern ans Meer, sammelt Vinyl und singt im Chor.',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    array['Musik','Reisen','Natur'],
    null,
    null,
    null
  ),
  (
    'fed5ba5b-6a55-44ad-9222-0cf231d8ee11',
    'lara.eu@example.com',
    'Demo1234!',
    'Lara',
    'female',
    'men',
    '1996-10-10',
    'DK',
    'EUROPE',
    'Sammelt Vintage, mag Kunstausstellungen und Espresso.',
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80',
    array['Kunst','Reisen','Kulinarik'],
    null,
    null,
    null
  ),
  (
    '6958f1f9-226f-4283-b2f2-190907627bc5',
    'tessa.eu@example.com',
    'Demo1234!',
    'Tessa',
    'female',
    'men',
    '1997-01-05',
    'FI',
    'EUROPE',
    'Mag Hygge-Abende, Brettspiele und Hafenluft.',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    array['Lesen','Natur','Gaming'],
    null,
    null,
    null
  ),
  (
    '900f1592-4322-41b0-a6cf-c8e0d3410a81',
    'alina.eu@example.com',
    'Demo1234!',
    'Alina',
    'female',
    'men',
    '1994-09-19',
    'RO',
    'EUROPE',
    'Organisiert Kunst-Workshops, liebt Wochenmarkt und Weinbars.',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    array['Kunst','Kulinarik','Natur'],
    null,
    null,
    null
  ),
  (
    'd30700a5-c252-4255-ac2b-57db533d54c6',
    'petra.eu@example.com',
    'Demo1234!',
    'Petra',
    'female',
    'men',
    '1995-02-24',
    'HU',
    'EUROPE',
    'Architektur-Fan, mag Flohmaerkte und Nachtspaziergaenge.',
    'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&w=800&q=80',
    array['Kunst','Natur','Reisen'],
    null,
    null,
    null
  ),
  (
    '8f0f6a61-754b-4734-810b-683d66a373cf',
    'iris.eu@example.com',
    'Demo1234!',
    'Iris',
    'female',
    'men',
    '1999-04-06',
    'GR',
    'EUROPE',
    'Inselmaedchen, liebt Meeresrauschen und Laufstrecken am Wasser.',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    array['Natur','Sport','Reisen'],
    null,
    null,
    null
  ),
  (
    'b18641c5-4dbf-4ef4-8ac5-6fdc46a59a87',
    'noemi.eu@example.com',
    'Demo1234!',
    'Noemi',
    'female',
    'men',
    '1997-12-22',
    'IE',
    'EUROPE',
    'Mag Wochenendtrips, laeuft Halbmarathons und fotografiert gern.',
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80',
    array['Sport','Fotografie','Reisen'],
    now(),
    null,
    null
  ),
  (
    '662b393f-bef4-4b7f-999d-bf3cc325dd68',
    'daria.eu@example.com',
    'Demo1234!',
    'Daria',
    'female',
    'men',
    '1996-01-29',
    'SK',
    'EUROPE',
    'Spielt Volleyball, liebt Waldspaziergaenge und Backen.',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    array['Sport','Natur','Kochen'],
    null,
    null,
    null
  ),
  (
    '5c4cf420-7e91-433d-b5da-48f1be8a6784',
    'mira.eu@example.com',
    'Demo1234!',
    'Mira',
    'female',
    'men',
    '1998-06-03',
    'HR',
    'EUROPE',
    'Liebt Kuestenstaedte, zeichnet gern und trinkt Matcha.',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    array['Kunst','Natur','Wellness'],
    null,
    null,
    null
  ),
  (
    '938e9462-6dba-4ec0-88b4-59c522b16b63',
    'elif.eu@example.com',
    'Demo1234!',
    'Elif',
    'female',
    'men',
    '1996-03-14',
    'BG',
    'EUROPE',
    'Mag Theater, laeuft am Kanal und liebt frische Pasta.',
    'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&w=800&q=80',
    array['Kunst','Sport','Kulinarik'],
    null,
    null,
    null
  ),
  (
    'a4715fd7-6608-401c-8643-339961aa7f4f',
    'lukas.eu@example.com',
    'Demo1234!',
    'Lukas',
    'male',
    'women',
    '1993-07-21',
    'DE',
    'EUROPE',
    'Outdoor-Fan, klettert gern und kocht gern fuer Freunde.',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    array['Sport','Natur','Kochen'],
    now(),
    52.52,
    13.405
  );

do $$
declare
  has_instance_id boolean;
  has_provider_id boolean;
  auth_instance uuid;
begin
  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'instance_id'
  ) into has_instance_id;

  if has_instance_id then
    select id into auth_instance from auth.instances limit 1;
  end if;

  if has_instance_id then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_super_admin
    )
    select
      s.id,
      auth_instance,
      'authenticated',
      'authenticated',
      s.email,
      crypt(s.password, gen_salt('bf')),
      timezone('utc', now()),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('display_name', s.display_name),
      timezone('utc', now()),
      timezone('utc', now()),
      false
    from seed_users s
    on conflict (id) do nothing;
  else
    insert into auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_super_admin
    )
    select
      s.id,
      'authenticated',
      'authenticated',
      s.email,
      crypt(s.password, gen_salt('bf')),
      timezone('utc', now()),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('display_name', s.display_name),
      timezone('utc', now()),
      timezone('utc', now()),
      false
    from seed_users s
    on conflict (id) do nothing;
  end if;

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
  ) into has_provider_id;

  if has_provider_id then
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    select
      s.id,
      s.id,
      jsonb_build_object('sub', s.id::text, 'email', s.email),
      'email',
      s.email,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    from seed_users s
    on conflict (id) do nothing;
  else
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    select
      s.id,
      s.id,
      jsonb_build_object('sub', s.id::text, 'email', s.email),
      'email',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    from seed_users s
    on conflict (id) do nothing;
  end if;
end $$;

insert into public.profiles (
  id,
  user_id,
  display_name,
  bio,
  gender,
  orientation,
  interests,
  photos,
  country,
  region_code,
  birthday,
  latitude,
  longitude,
  verified,
  verified_at,
  created_at,
  updated_at
)
select
  s.id,
  s.id,
  s.display_name,
  s.bio,
  s.gender,
  s.orientation,
  s.interests,
  array[jsonb_build_object('url', s.photo_url)],
  s.country,
  s.region_code,
  s.birthday,
  s.latitude,
  s.longitude,
  true,
  coalesce(s.verified_at, timezone('utc', now())),
  timezone('utc', now()),
  timezone('utc', now())
from seed_users s
on conflict (id) do nothing;
