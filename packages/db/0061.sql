insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, start_date) values 
          ('claude-3-5-sonnet', '^(claude-3.5-sonnet|claude-3-5-sonnet)$', 'TOKENS', 3, 15, 'anthropic', null),
          ('claude-3-5-haiku', '^(claude-3.5-sonnet|claude-3-5-sonnet)$', 'TOKENS', 3, 15, 'anthropic', null); 