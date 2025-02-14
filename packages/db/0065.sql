insert into _db_migration_async (name, operation, statement) values
('run', 'alter-table',  
`update run
set
	feedback = (feedback - 'thumbs') || jsonb_build_object('thumb', feedback ->> 'thumbs')
where
	feedback ->> 'thumbs' is not null;`),
('run', 'create', 'create index concurrently run_project_id_type_feedback_idx on run (project_id, type, (feedback->>'thumb'))')