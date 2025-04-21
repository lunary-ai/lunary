update model_mapping set start_date = '2020-01-01 00:00:00+00' where start_date is null;
alter table model_mapping alter column start_date set not null;
alter table model_mapping alter column start_date set default '2020-01-01 00:00:00+00';



alter table model_mapping alter column input_caching_cost_reduction drop not null;
insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider) values 
('claude-3-7-sonnet', '^(claude-3-7-sonnet-.*)$', 'TOKENS', 3, 15, 'anthropic', 'anthropic');