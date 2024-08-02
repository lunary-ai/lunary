drop index if exists external_user_project_id_last_seen_idx;
drop index if exists external_user_last_seen_idx;
drop index if exists external_user_created_at_idx;

create index on external_user (project_id, created_at desc nulls last);
create index on external_user (project_id, created_at asc nulls last);
create index on external_user (project_id, last_seen desc nulls last);
create index on external_user (project_id, last_seen asc nulls last);

analyze;