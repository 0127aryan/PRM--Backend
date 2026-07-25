# TypeORM migrations (PostgreSQL / Supabase)

Run against your Supabase database:

```bash
npm run migration:run
```

`synchronize` is off — the API never auto-alters tables.

The initial migration creates the **v5** schema (users + resources model). Add data via the admin UI after migrating.
