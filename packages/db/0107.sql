insert into model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, provider, input_caching_cost_reduction) values
('claude-haiku-4.5', '^(.*claude-haiku-4[.-]5.*)$', 'TOKENS', 1, 5, 'anthropic', 'anthropic', null);
