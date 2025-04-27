alter table dataset_prompt add column ground_truth text;

create table evaluation_v2 (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    name text not null,
    project_id uuid not null,
    dataset_id uuid not null,
    foreign key (dataset_id) references dataset (id) on delete cascade,
    foreign key (project_id) references project (id) on delete cascade
);


create table evaluation_evaluator (
    evaluation_id uuid not null,
    evaluator_id  uuid not null,
    "order"       integer,          
    weight        numeric,          
    created_at    timestamptz default now(),
    primary key (evaluation_id, evaluator_id),
    foreign key (evaluation_id) references evaluation_v2 (id) on delete cascade,
    foreign key (evaluator_id)  references evaluator     (id) on delete cascade
);