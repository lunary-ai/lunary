insert into _db_migration_async (name, operation, statement) values
('run', 'alter-table', 'alter table run alter column run set not null');