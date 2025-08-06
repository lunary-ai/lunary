insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider) values 
('claude-opus-4.1', '^(.*claude-opus-4\.1.*)$', 'TOKENS', 15, 75, 'anthropic', 'anthropic');