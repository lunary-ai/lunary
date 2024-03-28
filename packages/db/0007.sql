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


-- Fix setting owner id nulls

ALTER TABLE evaluation
    ALTER COLUMN owner_id DROP NOT NULL,
    ALTER COLUMN dataset_id DROP NOT NULL;

ALTER TABLE evaluation
    DROP CONSTRAINT evaluation_owner_id_fkey,
    ADD CONSTRAINT evaluation_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES account(id) ON DELETE SET NULL;

ALTER TABLE evaluation
    DROP CONSTRAINT evaluation_dataset_id_fkey,
    ADD CONSTRAINT evaluation_dataset_id_fkey
        FOREIGN KEY (dataset_id) REFERENCES dataset(id) ON DELETE SET NULL;

ALTER TABLE checklist
    ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE checklist
    DROP CONSTRAINT fk_checklist_owner_id,
    ADD CONSTRAINT checklist_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES account(id) ON DELETE SET NULL;

ALTER TABLE dataset
    ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE dataset
    DROP CONSTRAINT dataset_owner_id_fkey,
    ADD CONSTRAINT dataset_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES account(id) ON DELETE SET NULL;