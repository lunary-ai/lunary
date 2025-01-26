import sql from "./utils/db";

// TODO: rename to "async migration" or something like this
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
        _db_migration_async
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
            _db_migration_async
          set 
            status = 'in-progress'
           where 
            id = ${id}
        `;

        await sql.unsafe(statement);

        // TODO: rename to "create_index" and "drop_index"
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
              _db_migration_async
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
              _db_migration_async
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
                _db_migration_async
              set 
                status = 'done'
              where 
                id = ${id}
            `;
            console.log(`Index drop "${name}" completed successfully.`);
          } else {
            await sql`
              update 
                _db_migration_async
              set 
                status = 'failed'
              where 
                id = ${id}
        `;
            console.warn(`Index drop "${name}" failed; index still exists.`);
          }
        } else if (operation === "create-materialized-view") {
          await sql`
            update 
              _db_migration_async
            set 
              status = 'done'
            where 
              id = ${id}
          `;
          console.log(
            `Materialized view migration "${name}" completed successfully.`,
          );
        }
      } catch (err) {
        console.error(`Index migration "${name}" errored:`, err);
        await sql.unsafe(`drop index if exists ${name}`); // TODO: only drop if it was an index, not a materialized views
        await sql`
          update 
            _db_migration_async
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
