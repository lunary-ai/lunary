drop index if exists run_project_id_external_user_id_idx1;
create index on run using gin (metadata);
analyze run;
drop materialized view if exists metadata_cache; 
