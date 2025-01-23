create table _db_migration_index (
  id serial primary key,
  name text not null,
  statement text not null,
  operation text not null default 'create',
  status text not null default 'pending' -- "pending", "in-progress", "done", "failed"
);

