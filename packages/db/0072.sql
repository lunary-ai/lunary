insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, start_date, provider) values 
('gpt-4.5-preview', '^(gpt-4.5-preview)$', 'TOKENS', 75, 150, 'openai', null, 'openai'),
('gpt-4o-realtime-preview', '^(gpt-4o-realtime-preview)$', 'TOKENS', 40, 80, 'openai', null, 'openai');