create table _whitelisted_domain (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  domain text not null
);