drop index if exists run_project_id_cost_idx;
drop index if exists run_project_id_type_feedback_idx;

insert into _db_migration_async (name, operation, statement) values
('run_project_id_template_version_id_idx', 'create', 'create index concurrently if not exists run_project_id_template_version_id_idx on run (project_id, template_version_id)'),
('run_project_name_created_at_desc_idx', 'create', 'create index concurrently if not exists run_project_name_created_at_desc_idx on run (project_id, name, created_at desc nulls last)');
