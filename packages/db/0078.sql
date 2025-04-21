update model_mapping set start_date = '2020-01-01 00:00:00+00' where start_date is null;
alter table model_mapping alter column start_date set not null;
alter table model_mapping alter column start_date set default '2020-01-01 00:00:00+00';


insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider, input_caching_cost_reduction) values 
('claude-3-7-sonnet', '^(claude-3-7-sonnet-.*)$', 'TOKENS', 3, 15, 'anthropic', 'anthropic', null);