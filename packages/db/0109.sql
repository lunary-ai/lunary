alter table org
  add column billing_delinquent boolean not null default false,
  add column billing_delinquent_since timestamp with time zone;
