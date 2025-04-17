insert into _db_migration_async (name, operation, statement) values
('run_project_id_with_template_version', 'create', 'create index concurrently run_project_id_with_template_version on run (project_id) where template_version is not null'),
('run_project_id_with_error', 'create', 'create index concurrently run_project_id_with_error on run (project_id) where error is not null');