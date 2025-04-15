drop extension if exists bree_gin;

insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider, input_caching_cost_reduction) values 
('gpt-4.1', '^(gpt-4.1)$', 'TOKENS', 2, 8, 'openai', 'openai', 0.25),
('gpt-4.1-mini', '^(gpt-4.1-mini)$', 'TOKENS', 0.4, 1.60, 'openai', 'openai', 0.25),
('gpt-4.1-nano', '^(gpt-4.1-nano)$', 'TOKENS', 0.15, 0.4, 'openai', 'openai', 0.25);