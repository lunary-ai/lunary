alter type user_role
	add value 'owner';

alter type user_role
	add value 'viewer';

alter type user_role
	add value 'prompt_editor';

alter type user_role
	add value 'billing';

create type user_role_new as enum ( 
	'owner',
	'admin',
	'member',
	'viewer',
	'prompt_editor',
	'billing'
);

alter table account alter column role type user_role_new
using role::text::user_role_new;

drop type user_role;

alter type user_role_new rename to user_role;

update
	account
set
	role = 'owner'
where
	role = 'admin';
