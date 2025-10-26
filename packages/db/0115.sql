alter table evaluator add column kind varchar not null default 'custom';

update evaluator
set kind = 'builtin'
where type in ('language', 'pii', 'topics', 'intent', 'toxicity');

update evaluator
set mode = 'normal'
where kind = 'builtin'
  and coalesce(mode, '') in ('', 'realtime');

insert into evaluator (name, slug, type, mode, params, filters, project_id, kind)
select
  'Language',
  'language',
  'language',
  'normal',
  '{}'::jsonb,
  '["AND"]'::jsonb,
  p.id,
  'builtin'
from project p
where not exists (
  select 1 from evaluator e where e.project_id = p.id and e.type = 'language'
);

insert into evaluator (name, slug, type, mode, params, filters, project_id, kind)
select
  'PII Detection',
  'pii-detection',
  'pii',
  'normal',
  '{}'::jsonb,
  '["AND"]'::jsonb,
  p.id,
  'builtin'
from project p
where not exists (
  select 1 from evaluator e where e.project_id = p.id and e.type = 'pii'
);

insert into evaluator (name, slug, type, mode, params, filters, project_id, kind)
select
  'Topics Detection',
  'topics-detection',
  'topics',
  'normal',
  '{}'::jsonb,
  '["AND"]'::jsonb,
  p.id,
  'builtin'
from project p
where not exists (
  select 1 from evaluator e where e.project_id = p.id and e.type = 'topics'
);

insert into evaluator (name, slug, type, mode, params, filters, project_id, kind)
select
  'Intent Detection',
  'intent-detection',
  'intent',
  'normal',
  '{}'::jsonb,
  '["AND"]'::jsonb,
  p.id,
  'builtin'
from project p
where not exists (
  select 1 from evaluator e where e.project_id = p.id and e.type = 'intent'
);

insert into evaluator (name, slug, type, mode, params, filters, project_id, kind)
select
  'Toxicity',
  'toxicity',
  'toxicity',
  'normal',
  '{}'::jsonb,
  '["AND"]'::jsonb,
  p.id,
  'builtin'
from project p
where not exists (
  select 1 from evaluator e where e.project_id = p.id and e.type = 'toxicity'
);
