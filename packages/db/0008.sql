

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

create materialized view run_parent_feedback_cache as
WITH RECURSIVE run_feedback AS (
    SELECT
        r.id,
        r.parent_run_id,
        r.feedback,
        r.id AS feedback_run_id
    FROM
        run r
    UNION
    SELECT
        rf.id,
        r.parent_run_id,
        COALESCE(r.feedback, rf.feedback),
        CASE WHEN r.feedback IS NOT NULL THEN r.id ELSE rf.feedback_run_id END
    FROM
        run_feedback rf
        JOIN run r ON rf.parent_run_id = r.id
)
SELECT
    id,
    feedback,
    feedback_run_id
FROM
    run_feedback
WHERE feedback is not null and feedback_run_id != id
GROUP BY
    id,
    feedback,
    feedback_run_id;

create unique index on run_parent_feedback_cache(id);

