create table view (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    data jsonb not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    owner_id uuid not null,
    project_id uuid not null,
    columns jsonb,
    constraint fk_checklist_owner_id foreign key (owner_id) references account(id) on delete set null,
    constraint fk_checklist_project_id foreign key (project_id) references project(id) on delete cascade
);

