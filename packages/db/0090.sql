insert into _db_migration_async (name, operation, statement) values
('run_name_is_deleted_idx', 'create', 'create index concurrently if not exists run_name_is_deleted_idx on run (name, is_deleted)');