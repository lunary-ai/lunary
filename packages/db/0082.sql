create table _job (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now(),
	ended_at timestamptz,
	org_id uuid not null,
	type text not null,
	status text not null check (status in ('pending', 'running', 'done', 'failed')),
	error text,
	progress float not null default 0,
	constraint job_org_id_fkey foreign key (org_id) references org(id) on delete cascade
);

create unique index one_active_job_per_org_and_type
  on _job (org_id, type)
  where status in ('pending','running');