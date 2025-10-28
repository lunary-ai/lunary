create table dataset_v2_evaluator_run (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references dataset_v2(id) on delete cascade,
  version_id uuid references dataset_v2_version(id) on delete set null,
  created_by uuid references account(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  total_items integer not null,
  updated_item_count integer not null
);

create index dataset_v2_evaluator_run_dataset_id_idx
  on dataset_v2_evaluator_run (dataset_id, created_at desc);

create table dataset_v2_evaluator_run_slot (
  run_id uuid not null references dataset_v2_evaluator_run(id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  evaluator_id uuid references evaluator(id) on delete set null,
  evaluator_name text,
  evaluator_kind text,
  evaluator_type text,
  pass_count integer not null default 0,
  fail_count integer not null default 0,
  unknown_count integer not null default 0,
  evaluated_count integer not null default 0,
  pass_rate numeric,
  coverage numeric,
  config jsonb,
  primary key (run_id, slot)
);

create index dataset_v2_evaluator_run_slot_evaluator_idx
  on dataset_v2_evaluator_run_slot (evaluator_id);
