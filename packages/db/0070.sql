alter table run add column if not exists is_deleted boolean default false;
alter table project add column if not exists data_retention_days integer default null;
insert into _db_migration_async (name, operation, statement) values
('run_project_id_not_deleted_idx', 'create', 'create index concurrently run_project_id_not_deleted_idx on run (project_id) where is_deleted = false');