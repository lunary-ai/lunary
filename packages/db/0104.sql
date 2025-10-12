insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider, input_caching_cost_reduction) values 
('gpt-5-pro', '^(gpt-5-pro)$', 'TOKENS', 15, 120, 'openai', 'openai', 0),
('claude-sonnet-4.5', '^(.*claude-sonnet-4\.5.*)$', 'TOKENS', 3, 15, 'anthropic', 'anthropic', null);
