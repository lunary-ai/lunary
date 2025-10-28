create table dataset_v2_evaluator_config (
    dataset_id uuid not null references dataset_v2(id) on delete cascade,
    slot smallint not null check (slot between 1 and 5),
    config jsonb not null,
    primary key (dataset_id, slot)
);
