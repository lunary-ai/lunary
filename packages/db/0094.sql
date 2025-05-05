 create table run_toxicity (
  run_id          uuid primary key references run(id) on delete cascade,
  toxic_input     boolean     not null,
  toxic_output    boolean     not null,
  input_labels    text[]      not null,
  output_labels   text[]      not null,
  messages        jsonb       not null 
);

create index on run_toxicity(toxic_input);
create index on run_toxicity(toxic_output);