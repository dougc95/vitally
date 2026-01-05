# Database Migrations Guide

This project uses [Drizzle ORM](https://orm.drizzle.team/) for database schema management and migrations.

## Available Commands

| Command               | Description                                      |
| --------------------- | ------------------------------------------------ |
| `npm run db:generate` | Generate SQL migration files from schema changes |
| `npm run db:migrate`  | Apply pending migrations to the database         |
| `npm run db:push`     | Push schema changes directly (development only)  |
| `npm run db:studio`   | Open Drizzle Studio to browse/edit database      |

## Migration Workflow

### 1. Making Schema Changes

Edit the schema files in `shared/models/` or `shared/schema.ts`:

```typescript
// Example: Adding a new field to users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  // Add new field here
  newField: varchar("new_field"),
});
```

### 2. Generate Migration

```bash
npm run db:generate
```

This creates a new SQL file in the `migrations/` directory with the necessary `ALTER TABLE` statements.

### 3. Review Migration

Always review the generated SQL before applying:

```bash
cat migrations/XXXX_migration_name.sql
```

### 4. Apply Migration

```bash
npm run db:migrate
```

## Best Practices

1. **Never edit migration files after they've been applied** - Create new migrations instead
2. **Use descriptive names** - When generating, use `--name=add_user_roles` style names
3. **Test migrations locally first** - Always run on a development database before production
4. **Backup before migrating production** - Take a database snapshot before applying migrations
5. **Keep migrations small** - One logical change per migration

## Rollback Strategy

Drizzle doesn't have automatic rollback. For rollbacks:

1. **Create a reverse migration** - Generate a new migration that undoes the changes
2. **Restore from backup** - If critical, restore from a database backup
3. **Manual SQL** - Write and execute reverse SQL statements manually

### Example Rollback

If you added a column and need to remove it:

```sql
-- Reverse migration
ALTER TABLE users DROP COLUMN new_field;
```

## Troubleshooting

### Migration fails with "relation already exists"

The migration may have been partially applied. Check the database state and:

- Skip the migration if changes are already present
- Manually fix the state and mark migration as complete

### Schema out of sync

If your schema and database are out of sync:

```bash
# Check current database state
npm run db:studio

# For development, you can push directly (destructive!)
npm run db:push
```

### Connection issues

Verify your `DATABASE_URL` environment variable:

```bash
echo $DATABASE_URL
# Should output: postgresql://user:pass@host:port/database
```

## Migration Files

Migration files are stored in the `migrations/` directory:

```
migrations/
├── 0000_baseline_schema.sql
├── 0001_add_user_password.sql
└── meta/
    └── _journal.json
```

The `meta/_journal.json` file tracks which migrations have been applied.
