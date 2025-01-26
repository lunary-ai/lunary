alter table _db_migration_index rename to _db_migration_async;

insert into _db_migration_async (name, operation, statement) values
('metadata_cache', 'create-materialized-view', 
'create materialized view metadata_cache as  
select 
    run.project_id,
    run.type,
    jsonb_object_keys(run.metadata) as key,
    now() as refreshed_at
from 
    run
group by 
    run.project_id, 
    run.type,
    jsonb_object_keys(run.metadata);'
),
('metadata_cache_project_id_idx', 'create', 'create index concurrently if not exists metadata_cache_project_id_idx on metadata_cache(project_id)'),
('metadata_cache_project_id_type_key_idx', 'create', 'create unique index concurrently if not exists metadata_cache_project_id_type_key_idx on metadata_cache (project_id, type, key)');



