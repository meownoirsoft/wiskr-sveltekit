import postgres from 'postgres';
import { readFileSync } from 'fs';

const sql = postgres('postgresql://alb3rt:zwnzx9BXgxub3H2fUh9O@api.meownoirsoft.com:6432/wiskr3?sslmode=require', {
  ssl: 'require'
});

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/run-migration.js <file.sql>'); process.exit(1); }

const migration = readFileSync(file, 'utf8');
const statements = migration
  .split(';')
  .map(s => s.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim())
  .filter(s => s.length > 0);

console.log(`Running ${statements.length} statements from ${file}...\n`);

for (const stmt of statements) {
  try {
    await sql.unsafe(stmt);
    console.log('✅', stmt.slice(0, 80).replace(/\s+/g, ' '));
  } catch (e) {
    console.error('❌', stmt.slice(0, 80).replace(/\s+/g, ' '));
    console.error('   ', e.message);
  }
}

await sql.end();
console.log('\nDone.');
