create table org_invitation (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  org_id uuid not null,
  role user_role not null,
  token text not null,
  email_verified boolean,
  constraint org_invitation_account_id_fkey foreign key (org_id) references org(id) on delete cascade
  primary key (id)
);