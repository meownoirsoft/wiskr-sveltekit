/**
 * DB proxy endpoint — executes queries on behalf of authenticated client-side code.
 * Replaces Supabase PostgREST for client components that use supabase.from().
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/queries.js';

export async function POST({ request, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Handle RPC calls
    if (body.rpc) {
      const { data, error } = await db.rpc(body.rpc, body.params || {});
      if (error) return json({ data: null, error: { message: error.message || String(error) } });
      return json({ data, error: null });
    }

    // Handle table queries
    const { table, operation, columns, filters, order, limit, single, payload, returning } = body;
    if (!table) {
      return json({ data: null, error: { message: 'Missing table name' } }, { status: 400 });
    }

    let query;

    switch (operation) {
      case 'select':
        query = db.from(table).select(columns || '*');
        break;
      case 'insert':
        query = db.from(table).insert(payload);
        if (returning) query = query.select(returning);
        break;
      case 'update':
        query = db.from(table).update(payload);
        if (returning) query = query.select(returning);
        break;
      case 'delete':
        query = db.from(table).delete();
        if (returning) query = query.select(returning);
        break;
      default:
        return json({ data: null, error: { message: `Unknown operation: ${operation}` } }, { status: 400 });
    }

    // Apply filters
    if (filters && Array.isArray(filters)) {
      for (const f of filters) {
        switch (f.op) {
          case 'eq': query = query.eq(f.col, f.val); break;
          case 'neq': query = query.neq(f.col, f.val); break;
          case 'gt': query = query.gt(f.col, f.val); break;
          case 'gte': query = query.gte(f.col, f.val); break;
          case 'lt': query = query.lt(f.col, f.val); break;
          case 'lte': query = query.lte(f.col, f.val); break;
          case 'in': query = query.in(f.col, f.val); break;
          case 'ilike': query = query.ilike(f.col, f.val); break;
          case 'or': query = query.or(f.val); break;
          case 'textSearch': query = query.textSearch(f.col, f.val); break;
          case 'is': query = query.is(f.col, f.val); break;
          case 'contains': query = query.contains(f.col, f.val); break;
        }
      }
    }

    // Apply order
    if (order && Array.isArray(order)) {
      for (const o of order) {
        query = query.order(o.col, { ascending: o.ascending });
      }
    }

    // Apply limit
    if (limit != null) {
      query = query.limit(limit);
    }

    // Apply single
    if (single) {
      query = query.single();
    }

    const result = await query;
    return json(result);
  } catch (err) {
    console.error('DB proxy error:', err);
    return json({ data: null, error: { message: err.message || 'Internal error' } }, { status: 500 });
  }
}
