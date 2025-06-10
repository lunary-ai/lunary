insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider, input_caching_cost_reduction, start_date) values 
('o3', '^(o3)$', 'TOKENS', 2, 8, 'openai', 'openai', 4, '2025-06-10 21:00:00+00'),
('o3-pro', '^(o3-pro)$', 'TOKENS', 20, 80, 'openai', 'openai', 4, '2025-10-06 22:00:00+00'),
('magistral-medium', '^(magistral-medium)$', 'TOKENS', 2, 5, 'mistral', 'mistral', NULL, DEFAULT);