create type granularity_type as enum('hourly', 'daily', 'weekly', 'monthly');

create table dashboard (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    owner_id uuid not null,
    project_id uuid not null,
    name text not null,
    description text null,
    checks jsonb default '["and"]' not null,
    start_date timestamptz,
    end_date timestamptz,
    granularity granularity_type,
    is_home boolean default false not null,
    constraint fk_checklist_owner_id foreign key (owner_id) references account (id) on delete set null,
    constraint fk_checklist_project_id foreign key (project_id) references project (id) on delete cascade
);

create table chart (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    project_id uuid not null,
    dashboard_id uuid,
    name text not null,
    description text,
    type text not null,
    data_key text not null,
    aggregation_method text,
    primary_dimension text,
    secondary_dimension text,
    is_custom boolean default false not null,
    sort_order integer default 0 not null,
    color text,
    constraint fk_chart_project_id foreign key (project_id) references project (id) on delete cascade,
    constraint fk_chart_dashboard_id foreign key (dashboard_id) references dashboard (id) on delete set null
);