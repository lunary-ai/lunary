insert into _db_migration_async (name, operation, statement) values
('run_metadata_idx', 'create', 'create index concurrently run_metadata_idx on run using gin (metadata jsonb_path_ops)');