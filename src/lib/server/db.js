import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';

if (!DATABASE_URL) {
  throw new Error('Missing DATABASE_URL environment variable.');
}

const sql = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  types: {
    // Support pgvector type round-tripping
    bigint: postgres.BigInt
  }
});

export default sql;
