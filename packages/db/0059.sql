insert into _db_migration_index (name, operation, statement) values
('run_input_idx', 'drop', 'drop index concurrently if exists run_input_idx'),
('run_output_idx', 'drop', 'drop index concurrently if exists run_output_idx'),
('run_error_idx', 'drop', 'drop index concurrently if exists run_error_idx'),
('run_project_id_input_idx', 'create', 'create index concurrently if not exists run_project_id_input_idx on run using gin (project_id, ((input)::text) gin_trgm_ops)'),
('run_project_id_output_idx', 'create', 'create index concurrently if not exists run_project_id_output_idx on run using gin (project_id, ((output)::text) gin_trgm_ops)');
