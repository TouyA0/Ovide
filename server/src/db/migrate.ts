import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';
import path from 'path';

migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
console.log('Migrations applied');
