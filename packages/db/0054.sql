create index idx_evaluator_type on evaluator (type);
alter table org add column custom_dashboards_enabled boolean not null default false;

