create table ingestion_rule (
    id uuid not null default uuid_generate_v4(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    project_id uuid not null,
    type bpchar,
    filters jsonb,
    constraint ingestion_rule_project_id_fkey foreign key (project_id) REFERENCES project(id) on delete cascade,
    primary key (id)
);