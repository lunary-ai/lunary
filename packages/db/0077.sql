insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider, input_caching_cost_reduction) values 
('o4-mini', '^(o4-mini)$', 'TOKENS', 1.10, 4.4, 'openai', 'openai', 4),
('o3', '^(o3)$', 'TOKENS', 10, 40, 'openai', 'openai', 4),
('o3-mini', '^(o3-mini)$', 'TOKENS', 1.10, 4.40, 'openai', 'openai', 4);