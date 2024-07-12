

create table view (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    data jsonb not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    owner_id uuid not null,
    project_id uuid not null,
    columns jsonb,
    constraint fk_checklist_owner_id foreign key (owner_id) references account(id) on delete set null,
    constraint fk_checklist_project_id foreign key (project_id) references project(id) on delete cascade
);

ALTER TABLE view ADD COLUMN icon text;


CREATE TYPE model_unit AS ENUM ('CHARACTERS', 'TOKENS', 'MILLISECONDS', 'IMAGES');

create table model_mapping (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    pattern text not null,
    unit model_unit not null,
    input_cost float check (input_cost >= 0),
    output_cost float check (output_cost >= 0),
    tokenizer text not null,
    start_date timestamp with time zone null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    org_id uuid,
    constraint fk_model_org_id foreign key (org_id) references org(id) on delete cascade
)


INSERT INTO model_mapping (name, pattern, unit, input_cost, output_cost, tokenizer, start_date)
VALUES
('gpt-4-preview', '^(gpt-4-preview)$', 'TOKENS', 10, 30, 'openai', NULL),
('babbage-002', '^(babbage-002)$', 'TOKENS', 0.4, 1.6, 'openai', NULL),
('chat-bison', '^(chat-bison)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, 'google', NULL),
('chat-bison-32k', '^(chat-bison-32k)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, 'google', NULL),
('claude-1.1', '^(claude-1.1)$', 'TOKENS', 8, 24, 'anthropic', NULL),
('claude-1.2', '^(claude-1.2)$', 'TOKENS', 8, 24, 'anthropic', NULL),
('claude-1.3', '^(claude-1.3)$', 'TOKENS', 8, 24, 'anthropic', NULL),
('claude-2.0', '^(claude-2.0)$', 'TOKENS', 8, 24, 'anthropic', NULL),
('claude-2.1', '^(claude-2.1)$', 'TOKENS', 8, 24, 'anthropic', NULL),
('claude-3-5-sonnet-20240620', '^(claude-3-5-sonnet|anthropic.claude-3-5-sonnet-20240620-v1:0|claude-3-5-sonnet@20240620)$', 'TOKENS', 3, 15, 'anthropic', NULL),
('claude-3-haiku-20240307', '^(claude-3-haiku|anthropic.claude-3-haiku-20240307-v1:0|claude-3-haiku@20240307)$', 'TOKENS', 0.25, 1.25, 'anthropic', NULL),
('claude-3-opus-20240229', '^(claude-3-opus|anthropic.claude-3-opus-20240229-v1:0|claude-3-opus@20240229)$', 'TOKENS', 15, 75, 'anthropic', NULL),
('claude-3-sonnet-20240229', '^(claude-3-sonnet|anthropic.claude-3-sonnet-20240229-v1:0|claude-3-sonnet@20240229)$', 'TOKENS', 3, 15, 'anthropic', NULL),
('claude-instant-1', '^(claude-instant-1)$', 'TOKENS', 1.63, 5.51, 'anthropic', NULL),
('claude-instant-1.2', '^(claude-instant-1.2)$', 'TOKENS', 1.63, 5.51, 'anthropic', NULL),
('code-bison', '^(code-bison)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, 'google', NULL),
('code-bison-32k', '^(code-bison-32k)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, 'google', NULL),
('code-gecko', '^(code-gecko)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, 'google', NULL),
('codechat-bison', '^(codechat-bison)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, 'google', NULL),
('codechat-bison-32k', '^(codechat-bison-32k)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, 'google', NULL),
('davinci-002', '^(davinci-002)$', 'TOKENS', 6, 12, 'openai', NULL),
('ft:babbage-002', '^(ft:)(babbage-002:)(.+)(:)(.*)(:)(.+)$$', 'TOKENS', 1.6, 1.6, 'openai', NULL),
('ft:davinci-002', '^(ft:)(davinci-002:)(.+)(:)(.*)(:)(.+)$$', 'TOKENS', 12, 12, 'openai', NULL),
('ft:gpt-3.5-turbo-0613', '^(ft:)(gpt-3.5-turbo-0613:)(.+)(:)(.*)(:)(.+)$', 'TOKENS', 12, 16, 'openai', NULL),
('ft:gpt-3.5-turbo-1106', '^(ft:)(gpt-3.5-turbo-1106:)(.+)(:)(.*)(:)(.+)$', 'TOKENS', 3, 6, 'openai', NULL),
('gemini-1.0-pro', '^(gemini-1.0-pro)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.125, 0.375, 'google', '2024-02-15'),
('gemini-1.0-pro-001', '^(gemini-1.0-pro-001)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.125, 0.375, 'google', '2024-02-15'),
('gemini-1.0-pro-latest', '^(gemini-1.0-pro-latest)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, 'google', NULL),
('gemini-1.5-flash', '^(gemini-1.5-flash)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.125, 0.375, 'google', NULL),
('gemini-1.5-pro', '^(gemini-1.5-pro)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 1.25, 3.75, 'google', NULL),
('gemini-1.5-pro-latest', '^(gemini-1.5-pro-latest)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 2.5, 7.5, 'google', NULL),
('gemini-pro', '^(gemini-pro)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.125, 0.375, 'google', '2024-02-15'),
('gemini-pro', '^(gemini-pro)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, 'google', NULL),
('gpt-3.5-turbo', '^(gpt-)(35|3.5)(-turbo)$', 'TOKENS', 0.5, 1.5, 'openai', '2024-02-16'),
('gpt-3.5-turbo', '^(gpt-)(35|3.5)(-turbo)$', 'TOKENS', 1, 2, 'openai', '2023-11-06'),
('gpt-3.5-turbo', '^(gpt-)(35|3.5)(-turbo)$', 'TOKENS', 1.5, 2, 'openai', '2023-06-27'),
('gpt-3.5-turbo', '^(gpt-)(35|3.5)(-turbo)$', 'TOKENS', 2, 2, 'openai', NULL),
('gpt-3.5-turbo-0125', '^(gpt-)(35|3.5)(-turbo-0125)$', 'TOKENS', 0.5, 1.5, 'openai', NULL),
('gpt-3.5-turbo-0301', '^(gpt-)(35|3.5)(-turbo-0301)$', 'TOKENS', 2, 2, 'openai', NULL),
('gpt-3.5-turbo-0613', '^(gpt-)(35|3.5)(-turbo-0613)$', 'TOKENS', 1.5, 2, 'openai', NULL),
('gpt-3.5-turbo-1106', '^(gpt-)(35|3.5)(-turbo-1106)$', 'TOKENS', 1, 2, 'openai', NULL),
('gpt-3.5-turbo-16k', '^(gpt-)(35|3.5)(-turbo-16k)$', 'TOKENS', 0.5, 1.5, 'openai', '2024-02-16'),
('gpt-3.5-turbo-16k', '^(gpt-)(35|3.5)(-turbo-16k)$', 'TOKENS', 3, 4, 'openai', NULL),
('gpt-3.5-turbo-16k-0613', '^(gpt-)(35|3.5)(-turbo-16k-0613)$', 'TOKENS', 3, 4, 'openai', NULL),
('gpt-3.5-turbo-instruct', '^(gpt-)(35|3.5)(-turbo-instruct)$', 'TOKENS', 1.5, 2, 'openai', NULL),
('gpt-4', '^(gpt-4)$', 'TOKENS', 30, 60, 'openai', NULL),
('gpt-4-0125-preview', '^(gpt-4-0125-preview)$', 'TOKENS', 10, 30, 'openai', NULL),
('gpt-4-0314', '^(gpt-4-0314)$', 'TOKENS', 30, 60, 'openai', NULL),
('gpt-4-0613', '^(gpt-4-0613)$', 'TOKENS', 30, 60, 'openai', NULL),
('gpt-4-1106-preview', '^(gpt-4-1106-preview)$', 'TOKENS', 10, 30, 'openai', NULL),
('gpt-4-32k', '^(gpt-4-32k)$', 'TOKENS', 60, 120, 'openai', NULL),
('gpt-4-32k-0314', '^(gpt-4-32k-0314)$', 'TOKENS', 60, 120, 'openai', NULL),
('gpt-4-32k-0613', '^(gpt-4-32k-0613)$', 'TOKENS', 60, 120, 'openai', NULL),
('gpt-4-turbo', '^(gpt-4-turbo)$', 'TOKENS', 10, 30, 'openai', NULL),
('gpt-4-turbo-2024-04-09', '^(gpt-4-turbo-2024-04-09)$', 'TOKENS', 10, 30, 'openai', NULL),
('gpt-4-turbo-preview', '^(gpt-4-turbo-preview)$', 'TOKENS', 10, 30, 'openai', '2023-11-06'),
('gpt-4-turbo-preview', '^(gpt-4-turbo-preview)$', 'TOKENS', 30, 60, 'openai', NULL),
('gpt-4-turbo-vision', '^(gpt-4(-d{4})?-vision-preview)$', 'TOKENS', 10, 30, 'openai', NULL),
('gpt-4o', '^(gpt-4o)$', 'TOKENS', 5, 15, 'openai', NULL),
('gpt-4o-2024-05-13', '^(gpt-4o-2024-05-13)$', 'TOKENS', 5, 15, 'openai', NULL),
('text-ada-001', '^(text-ada-001)$', 'TOKENS', 4, 4, 'openai', NULL),
('text-babbage-001', '^(text-babbage-001)$', 'TOKENS', 0.5, 0.5, 'openai', NULL),
('text-bison', '^(text-bison)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, '', NULL),
('text-bison-32k', '^(text-bison-32k)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.25, 0.5, '', NULL),
('text-curie-001', '^(text-curie-001)$', 'TOKENS', 20, 20, 'openai', NULL),
('text-davinci-001', '^(text-davinci-001)$', 'TOKENS', 20, 20, 'openai', NULL),
('text-davinci-002', '^(text-davinci-002)$', 'TOKENS', 20, 20, 'openai', NULL),
('text-davinci-003', '^(text-davinci-003)$', 'TOKENS', 20, 20, 'openai', NULL),
('text-embedding-3-small', '^(text-embedding-3-small)$', 'TOKENS', 0.02, NULL, 'openai', NULL),
('text-embedding-ada-002', '^(text-embedding-ada-002)$', 'TOKENS', 0.1, NULL, 'openai', '2022-12-06'),
('text-embedding-ada-002-v2', '^(text-embedding-ada-002-v2)$', 'TOKENS', 0.1, NULL, 'openai', '2022-12-06'),
('text-embedding-ada-002-v2', '^(text-embedding-3-large)$', 'TOKENS', 0.13, NULL, 'openai', NULL),
('text-unicorn', '^(text-unicorn)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 2.5, 7.5, '', NULL),
('textembedding-gecko', '^(textembedding-gecko)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.1, NULL, '', NULL),
('textembedding-gecko-multilingual', '^(textembedding-gecko-multilingual)(@[a-zA-Z0-9]+)?$', 'CHARACTERS', 0.1, NULL, '', NULL),
('mistral-tiny', '^(mistral-tiny)$', 'TOKENS', 0.14, 0.42, 'mistral', NULL),
('mistral-small', '^(mistral-small)$', 'TOKENS', 0.6, 1.8, 'mistral', NULL),
('mistral-medium', '^(mistral-medium)$', 'TOKENS', 0.6, 1.8, 'mistral', NULL),
('mistral-large-2402', '^(mistral-large-2402)$', 'TOKENS', 4, 10, 'mistral', NULL),
('codestral-2405', '^(codestral-2405)$', 'TOKENS', 1, 3, 'mistral', NULL),
('open-mixtral-8x22b', '^(open-mixtral-8x22b)$', 'TOKENS', 2, 6, '', NULL),
('open-mixtral-8x7b', '^(open-mixtral-8x7b)$', 'TOKENS', 0.7, 0.7, '', NULL);



-- Index on evaluator table
CREATE INDEX idx_evaluator_type ON evaluator (type);

-- Index on evaluation_result_v2 table
CREATE INDEX idx_evaluation_result_v2_result_jsonb ON evaluation_result_v2 USING GIN (result);