create index on run using gin ((input::text) gin_trgm_ops);
create index on run using gin ((output::text) gin_trgm_ops);
create index on run using gin ((error::text) gin_trgm_ops);