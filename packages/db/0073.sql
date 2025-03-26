alter table model_mapping add column input_caching_cost_reduction smallint not null default 0;

update model_mapping
set
	input_caching_cost_reduction = 0.5
where
	name in (
		'gpt-4.5-preview',
		'gpt-4o',
		'gpt-4o-mini',
		'gpt-4o-realtime-preview',
		'o1-preview',
		'o1-mini'
	)
	and org_id is null;

alter table run add column cached_prompt_tokens int4 not null default 0;