drop table if exists log;
create extension if not exists btree_gin;

-- !!!WARNING!!! statement below moved to the new index creation system in 0059.sql, but it's kept as a reference for users who have already run this migration

-- drop index if exists run_input_idx;
-- drop index if exists run_output_idx;
-- drop index if exists run_error_idx;
-- create index run_project_id_input_idx on run using gin (project_id, ((input)::text) gin_trgm_ops);
-- create index run_project_id_output_idx on run using gin (project_id, ((output)::text) gin_trgm_ops);