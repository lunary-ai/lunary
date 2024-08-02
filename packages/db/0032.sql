create unique index on feedback_cache (project_id, feedback);
create index on run (project_id, type, name);
drop materialized view if exists model_name_cache;
analyze run;