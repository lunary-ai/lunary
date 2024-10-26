create table dashboard (
    id uuid default uuid_generate_v4 () primary key,
    name text not null,
    description text null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    owner_id uuid not null,
    project_id uuid not null,
    charts jsonb not null,
    constraint fk_checklist_owner_id foreign key (owner_id) references account (id) on delete set null,
    constraint fk_checklist_project_id foreign key (project_id) references project (id) on delete cascade
);

create table chart (
    id uuid default uuid_generate_v4 () primary key,
    name text not null,
    type text not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    owner_id uuid not null,
    project_id uuid not null,
    config jsonb not null,
    constraint fk_checklist_owner_id foreign key (owner_id) references account (id) on delete set null,
    constraint fk_checklist_project_id foreign key (project_id) references project (id) on delete cascade
);
