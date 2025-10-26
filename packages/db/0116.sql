insert into _db_migration_async (name, operation, statement) values
  (
    'run_tool_not_deleted_project_created_at_desc_idx',
    'create',
    $$create index concurrently if not exists
      run_tool_not_deleted_project_created_at_desc_idx
    on run (project_id, created_at desc)
    where type = 'tool' and is_deleted = false$$
  ),
  (
    'run_retriever_not_deleted_project_created_at_desc_idx',
    'create',
    $$create index concurrently if not exists
      run_retriever_not_deleted_project_created_at_desc_idx
    on run (project_id, created_at desc)
    where type = 'retriever' and is_deleted = false$$
  );
r