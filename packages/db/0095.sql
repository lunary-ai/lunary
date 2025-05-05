alter table template drop column if exists name;
alter table template drop column if exists "group";
alter table template alter column slug set not null; 