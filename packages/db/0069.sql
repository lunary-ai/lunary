create table audit_log (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    org_id uuid not null,
    resource_type text not null,
    resource_id text,
    action text not null,
    user_id uuid not null,
    user_name text,
    user_email text,
    project_id uuid,
    project_name text,
    ip_address text,
    user_agent text,
    constraint fk_audit_log_org_id foreign key (org_id) references org(id) on delete cascade
);

create index audit_log_org_id_created_at_idx on audit_log(org_id, created_at desc);