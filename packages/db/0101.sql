insert into _db_migration_async (name, operation, statement) values
(
  'run_project_id_external_user_id_idx',
  'drop',
  $$drop index concurrently run_project_id_external_user_id_idx$$
),
(
  'run_project_user_cost_idx',
  'create',
  $$create index concurrently run_project_user_cost_idx on run (project_id, external_user_id) include (cost)$$
);