create table run_tag(
	run_id uuid not null,
	tag text not null,
	primary key (run_id, tag),
	constraint fk_run_tag_run foreign key (run_id) references run(id) on delete cascade
);


insert into _db_migration_async (name, operation, statement) values
('run', 'migrate-data',  
'insert into run_tag (run_id, tag)
select id, t.tag
from run, LATERAL unnest(tags) as t(tag)
where tags is not null
  and t.tag is not null
on conflict do nothing;');


CREATE INDEX concurrently idx_run_project_type_name_created_at
  ON run (project_id, type, name, created_at DESC);


	-- TODO: remove the nulls last from creasted_at
	-- TODO: verify nulls last are not needed for other things than created_at