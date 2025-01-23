import sql from "./utils/db";

export async function createIndexes() {
  await sql`select pg_advisory_lock(123456789)`;

  try {
    const migrations = await sql`
      select 
        id, 
        name, 
        operation,
        statement
      from 
        _db_migration_index
       where 
        status in ('pending', 'failed')
       order 
        by id;
    `;

    for (const migration of migrations) {
      const { id, name, operation, statement } = migration;

      try {
        await sql`
          update 
            _db_migration_index
          set 
            status = 'in-progress'
           where 
            id = ${id}
        `;

        await sql.unsafe(statement);

        if (operation === "create") {
          const [validCheck] = await sql`
          select 
            c.relname, 
            i.indisvalid
          from 
            pg_class c
            join pg_index i on c.oid = i.indexrelid
           where 
            c.relname = ${name}
            and i.indisvalid = true
        `;

          if (validCheck) {
            await sql`
            update 
              _db_migration_index
            set 
              status = 'done'
            where 
              id = ${id}
          `;
            console.log(`Index migration "${name}" completed successfully.`);
          } else {
            await sql.unsafe(`drop index if exists ${name}`);
            await sql`
            update 
              _db_migration_index
            set 
              status = 'failed'
            where 
              id = ${id}
          `;
            console.warn(
              `Index migration "${name}" failed; dropped partial index.`,
            );
          }
        } else if (operation === "drop") {
          const [stillExists] = await sql`
            select 
              c.relname
            from 
              pg_class c
              join pg_index i on c.oid = i.indexrelid
            where c.relname = ${name}
          `;

          if (!stillExists) {
            await sql`
              update 
                _db_migration_index
              set 
                status = 'done'
              where 
                id = ${id}
            `;
            console.log(`Index drop "${name}" completed successfully.`);
          } else {
            await sql`
              update 
                _db_migration_index
              set 
                status = 'failed'
              where 
                id = ${id}
        `;
            console.warn(`Index drop "${name}" failed; index still exists.`);
          }
        }
      } catch (err) {
        console.error(`Index migration "${name}" errored:`, err);
        await sql.unsafe(`drop index if exists ${name}`);
        await sql`
          update 
            _db_migration_index
          set 
            status = 'failed'
          where 
            id = ${id}
        `;
      }
    }
  } finally {
    await sql`select pg_advisory_unlock(123456789)`;
  }
}
