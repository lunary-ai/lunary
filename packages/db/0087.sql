alter table dataset_prompt add column ground_truth text;

create table evaluation_v2 (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    name text not null,
    dataset_id uuid not null,
    foreign key (dataset_id) references dataset (id) on delete cascade
);