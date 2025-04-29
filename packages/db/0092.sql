insert into _db_migration_async (name, operation, statement) values
(
  'run_llm_error_created_at_idx',
  'create',
  $$create index concurrently if not exists run_llm_error_created_at_idx on run (created_at) where (type = 'llm' and is_deleted = false and status = 'error')$$
);