insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider) values 
('gemini-2.0-flash-lite', '^(gemini-2.0-flash-lite-.*)$', 'CHARACTERS', 0.075, 0.30, 'google', 'google'),
('gemini-2.0-flash', '^(gemini-2.0-flash-.*)$', 'CHARACTERS', 0.10, 0.40, 'google', 'google'),
('gemini-2.5-pro-preview', '^(gemini-2.5-pro-preview.*)$', 'CHARACTERS', 1.25, 10, 'google', 'google'),
('gemini-2.5-flash-preview', '^(gemini-2.5-flash-preview.*)$', 'CHARACTERS', 0.15, 3.50, 'google', 'google'),
('gemini-2.5-pro-exp', '^(gemini-2.5-pro-exp-.*)$', 'CHARACTERS', 1.25, 2.50, 'google', 'google');