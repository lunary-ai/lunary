insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, start_date) values 
('gpt-4o', '^(gpt-4o)$', 'TOKENS', 2.5, 10, 'openai', '2023-10-02'),
('o1-preview', '^(o1-preview)$', 'TOKENS', 15, 60, 'openai', null),
('o1-preview-2024-09-12', '^(o1-preview-2024-09-12)$', 'TOKENS', 15, 60, 'openai', null),
('o1-mini', '^(o1-mini)$', 'TOKENS', 3, 12, 'openai', null),
('o1-mini-2024-09-12', '^(o1-mini-2024-09-12)$', 'TOKENS', 3, 12, 'openai', null);
