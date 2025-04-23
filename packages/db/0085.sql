drop index if exists idx_run_project_id_duration;
drop index if exists run_project_id_duration_idx;

insert into _db_migration_async (name, operation, statement) values
('run_project_id_duration_desc_idx', 'create', 'create index concurrently if not exists run_project_id_duration_desc_idx on run (project_id, duration desc nulls last)'),
('run_project_id_duration_asc_idx', 'create', 'create index concurrently if not exists run_project_id_duration_asc_idx on run (project_id, duration)'),
('run_project_total_tokens_desc_idx', 'create', 'create index concurrently if not exists run_project_total_tokens_desc_idx on run (project_id, (prompt_tokens + completion_tokens) desc nulls last)'),
('run_project_total_tokens_asc_idx', 'create', 'create index concurrently if not exists run_project_total_tokens_asc_idx on run (project_id, (prompt_tokens + completion_tokens) asc)'),
('run_project_cost_desc_idx', 'create', 'create index concurrently if not exists run_project_cost_desc_idx on run (project_id, cost desc nulls last)'),
('run_project_cost_asc_idx', 'create', 'create index concurrently if not exists run_project_cost_asc_idx on run (project_id, cost asc)');