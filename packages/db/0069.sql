create table audit_log (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz not null default now(),
    user_id uuid not null,
    user_name text not null,
    user_email text not null,
    org_id uuid not null,
    project_id uuid,
    project_name text,
    action text not null,
    resource_type text not null,
    resource_id text not null,
    ip_address text,
    user_agent text,
    constraint fk_audit_log_org_id foreign key (org_id) references org(id) on delete cascade
);

create index on audit_log(org_id, created_at desc);
create index on audit_log(user_id, created_at desc);
create index on audit_log(project_id, created_at desc);
create index on audit_log(org_id, resource_type, created_at desc);