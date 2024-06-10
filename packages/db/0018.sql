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