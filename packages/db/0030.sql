drop index if exists run_created_at_idx1;
drop index if exists run_created_at_idx3;
drop index if exists run_cost_idx;
drop index if exists run_cost_idx1;
drop index if exists run_created_at_project_id_idx;
drop index if exists run_expr_idx1;
drop index if exists run_expr_idx2;
drop index if exists run_type_external_user_id_idx;
drop index if exists run_type_idx;
drop index if exists run_type_parent_run_id_idx;

create index on run (project_id, created_at);
create index on run (project_id, cost);
create index on run (project_id, external_user_id);
create index on run (project_id, (error is not null));

create index on run (project_id, created_at desc nulls last);
create index on run (project_id, created_at asc nulls last);
create index on run (project_id, duration desc nulls last);
create index on run (project_id, duration asc nulls last);
create index on run (project_id, (prompt_tokens + completion_tokens) desc nulls last);
create index on run (project_id, (prompt_tokens + completion_tokens) asc nulls last);
create index on run (project_id, cost desc nulls last);
create index on run (project_id, cost asc nulls last);


analyze;