create table run_score (
	run_id uuid not null,
	label text not null,
	created_at timestamptz default now(),
  updated_at timestamptz default now(),
	value jsonb not null,
	comment text,
	primary key ("run_id", "label"),
	constraint value_type_check 
        check (
            jsonb_typeof(value) in ('number', 'string', 'boolean')
        )
);
