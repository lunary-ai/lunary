DROP MATERIALIZED VIEW IF EXISTS feedback_cache;

create materialized view feedback_cache as  
select
  run.project_id,
  jsonb_build_object ('thumbs',
    feedback::json ->> 'thumbs') as feedback
from
  run
where
  feedback::json ->> 'thumbs' is not null
group by
  run.project_id,
  feedback::json ->> 'thumbs'
union
select
  run.project_id,
  jsonb_build_object ('emoji',
    feedback::json ->> 'emoji') as feedback
from
  run
where
  feedback::json ->> 'emoji' is not null
group by
  run.project_id,
  feedback::json ->> 'emoji'
union
select
  run.project_id,
  jsonb_build_object ('rating',
    CAST(feedback::json ->> 'rating' as INT)) as feedback
from
  run
where
  feedback::json ->> 'rating' is not null
group by
  run.project_id,
  CAST(feedback::json ->> 'rating' as INT)
union
select
  run.project_id,
  jsonb_build_object ('retried',
    CAST(feedback::json ->> 'retried' as boolean)) as feedback
from
  run
where
  feedback::json ->> 'retried' is not null
group by
  run.project_id,
  CAST(feedback::json ->> 'retried' as boolean)
union
select
  run.project_id,
  jsonb_build_object ('comment', '') as feedback
from
  run
where
  feedback::json ->> 'comment' is not null
group by
  run.project_id,
  feedback::json ->> 'comment';

create unique index on feedback_cache (project_id, feedback);
create index on feedback_cache(project_id);

create index if not exists idx_run_id_parent_run_id on run (id, parent_run_id);
create index if not exists idx_run_feedback_null ON run (id, parent_run_id) WHERE feedback IS NULL;
create index if not exists idx_run_parent_run_id_feedback ON run (parent_run_id, feedback);
CREATE INDEX if not exists idx_run_id_parent_run_id_feedback ON run (id, parent_run_id, feedback);

create materialized view run_parent_feedback_cache as
WITH RECURSIVE run_feedback AS (
    SELECT
        r.id,
        r.parent_run_id,
        r.feedback,
        1 AS depth
    FROM
        run r
    UNION ALL
    SELECT
        rf.id,
        r.parent_run_id,
        COALESCE(r.feedback, rf.feedback),
        rf.depth + 1
    FROM
        run_feedback rf
        JOIN run r ON rf.parent_run_id = r.id
    WHERE
        rf.depth < 5 AND rf.feedback IS NULL
)
SELECT
    id,
    feedback
FROM
    run_feedback
WHERE
    feedback IS NOT NULL;

create unique index on run_parent_feedback_cache(id);
