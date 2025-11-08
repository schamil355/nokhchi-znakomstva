-- Enable pgvector for semantic matching
create extension if not exists vector;

-- Store per-profile embeddings derived from interests/bio text
create table if not exists profile_embeddings (
  profile_id uuid primary key references profiles(id) on delete cascade,
  vector vector(1536),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Helper to upsert an embedding (expects caller to supply embedding array)
create or replace function upsert_profile_embedding(p_profile_id uuid, p_vector vector)
returns void
language plpgsql
security definer
as $$
begin
  insert into profile_embeddings(profile_id, vector)
  values (p_profile_id, p_vector)
  on conflict (profile_id)
  do update set vector = excluded.vector, updated_at = timezone('utc', now());
end;
$$;

-- Match candidates by cosine similarity against the viewer embedding
create or replace function match_candidates_by_vector(viewer_profile_id uuid, limit_count integer default 50)
returns table(candidate_id uuid, similarity double precision)
language sql
stable
as $$
  with viewer as (
    select vector from profile_embeddings where profile_id = viewer_profile_id
  )
  select pe.profile_id as candidate_id,
         1 - (viewer.vector <=> pe.vector) as similarity
  from profile_embeddings pe
  cross join viewer
  where pe.profile_id <> viewer_profile_id
  order by similarity desc
  limit coalesce(limit_count, 50);
$$;
