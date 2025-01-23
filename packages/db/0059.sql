insert into _db_migration_index (name, operation, statement, status) values
('run_input_idx', 'drop', 'drop index if exists run_input_idx', 'done'),
('run_output_idx', 'drop', 'drop index if exists run_output_idx', 'done'),
('run_error_idx', 'drop', 'drop index if exists run_error_idx', 'done'),
('run_project_id_input_idx', 'create', 'create index if not exists run_project_id_input_idx on run using gin (project_id, ((input)::text) gin_trgm_ops)', 'done'),
('run_project_id_output_idx', 'create', 'create index if not exists run_project_id_output_idx on run using gin (project_id, ((output)::text) gin_trgm_ops)', 'done');
