-- Serverless-safe sliding-window rate limiting (see lib/rate-limit.ts).
-- One row per request hit; counts within a window decide allow/deny.
create table if not exists public.rate_limit_hits (
  id          bigint generated always as identity primary key,
  bucket      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_time_idx
  on public.rate_limit_hits (bucket, created_at);

grant all on public.rate_limit_hits to service_role;
