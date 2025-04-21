delete from _db_migration_async where name = 'run_project_id_with_template_version';

insert into _db_migration_async (name, operation, statement) values
('run_project_id_with_template_version', 'create', 'create index concurrently run_project_id_with_template_version on run (project_id) where template_version_id is not null');