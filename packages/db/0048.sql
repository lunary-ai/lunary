insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, start_date) values 
  ('gemini-1.5-pro', '^(gemini-1.5-pro)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 1.25, 5, 'google', '2024-10-01'), 
  ('gemini-1.5-pro-002', '^(gemini-1.5-pro-002)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 1.25, 5, 'google', '2024-10-01'),
  ('gemini-1.5-flash', '^(gemini-1.5-flash)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.075, 0.3, 'google', '2024-10-01'),
  ('gemini-1.5-flash-8b', '^(gemini-1.5-flash-8b)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.075, 0.3, 'google', '2024-10-01');