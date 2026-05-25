import postgres from 'postgres';
import { env } from '$env/dynamic/private';

// Lazily initialize the connection so the module loads safely during
// build-time analysis even when DATABASE_URL isn't in the environment.
let _sql = null;

function getSql() {
  if (_sql) return _sql;
  const url = env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL environment variable.');
  _sql = postgres(url, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
    types: {
      // Support pgvector type round-tripping
      bigint: postgres.BigInt
    }
  });
  return _sql;
}

// Proxy that forwards tagged-template calls and property access to the lazily
// created postgres instance. This keeps all call sites (sql`...`, sql.unsafe,
// sql.begin, etc.) working without changes.
const sql = new Proxy(
  function sql(...args) {
    return getSql()(...args);
  },
  {
    get(_target, prop) {
      return getSql()[prop];
    }
  }
);

export default sql;
