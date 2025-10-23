insert into _db_migration_async (name, operation, statement) values
(
  'run_project_created_at_not_deleted_types_idx',
  'create',
  $$create index concurrently if not exists
    run_project_created_at_not_deleted_types_idx
  on run (project_id, created_at desc)
  where is_deleted = false
    and type in ('thread', 'chat', 'custom-event')$$
);
