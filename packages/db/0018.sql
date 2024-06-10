create table evaluator (
    id uuid not null default uuid_generate_v4(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    project_id uuid not null,
    owner_id uuid,
    name varchar not null,
    slug varchar not null,
    type varchar not null,
    mode varchar,
    description text,
    params jsonb,
    filters jsonb,
    constraint evaluator_owner_id_fkey foreign key (owner_id) references account(id) on delete set null,
    constraint evaluator_project_id_fkey foreign key (project_id) references project(id) on delete cascade,
    primary key (id)
);

create table evaluation_result_v2 (
    run_id uuid not null,
    evaluator_id uuid not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    result jsonb NOT NULL,
    constraint evaluation_result_evaluator_id_fkey foreign key (evaluator_id) references evaluator(id) on delete cascade, 
    constraint evaluation_result_run_id_fkey foreign key (run_id) references run(id) on delete cascade,
    primary key(run_id, evaluator_id)
);