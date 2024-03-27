create materialized view metadata_cache as  
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
    jsonb_object_keys(run.metadata);

create unique index on metadata_cache (project_id, type, key);
create index on metadata_cache(project_id);

create materialized view feedback_cache as  
select 
    run.project_id,
    run.type,
    run.feedback,
    now() as refreshed_at
from 
    run
where 
    run.feedback is not null
group by 
    run.project_id, 
    run.type,
    run.feedback;

create unique index on feedback_cache (project_id, type, feedback);
create index on feedback_cache(project_id);
