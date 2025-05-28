insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider) values 
('claude-opus-4', '^(.*claude-opus-4.*)$', 'TOKENS', 15, 75, 'anthropic', 'anthropic'),
('claude-sonnet-4', '^(.*claude-sonnet-4.*)$', 'TOKENS', 3, 15, 'anthropic', 'anthropic');