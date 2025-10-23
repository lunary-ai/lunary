alter table org
  add column dataset_v2_enabled boolean not null default false;

create table dataset_v2 (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    project_id uuid not null references project(id) on delete cascade,
    owner_id uuid references account(id) on delete set null,
    name text not null,
    description text,
    unique (project_id, name)
);

create index dataset_v2_project_id_created_at_idx
    on dataset_v2 (project_id, created_at desc);

create table dataset_v2_item (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    dataset_id uuid not null references dataset_v2(id) on delete cascade,
    input text not null default '',
    ground_truth text
);

create index dataset_v2_item_dataset_id_idx
    on dataset_v2_item (dataset_id);

create index dataset_v2_item_dataset_id_created_at_idx
    on dataset_v2_item (dataset_id, created_at);

create index dataset_v2_item_input_idx
    on dataset_v2_item using gin (((input)::text) gin_trgm_ops);

create index dataset_v2_item_ground_truth_idx
    on dataset_v2_item using gin (((ground_truth)::text) gin_trgm_ops);
    