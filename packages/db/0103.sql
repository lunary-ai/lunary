insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider, input_caching_cost_reduction) values 
('gpt-5', '^(gpt-5)$', 'TOKENS', 1.25, 10, 'openai', 'openai', 0.1),
('gpt-5-mini', '^(gpt-5-mini)$', 'TOKENS', 0.25, 2, 'openai', 'openai', 0.1),
('gpt-5-nano', '^(gpt-5-nano)$', 'TOKENS', 0.05, 0.4, 'openai', 'openai', 0.1);