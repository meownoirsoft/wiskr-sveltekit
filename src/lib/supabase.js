/**
 * Client-side database proxy.
 * Replaces the Supabase browser client with a fetch-based wrapper
 * that sends queries to /api/db-proxy for execution on the server.
 *
 * This supports the same chaining API that components already use:
 *   supabase.from('table').select('*').eq('col', val).order('created_at')
 */

class ClientQueryBuilder {
  constructor(table) {
    this._table = table;
    this._op = 'select';
    this._columns = '*';
    this._filters = [];
    this._order = [];
    this._limitVal = null;
    this._isSingle = false;
    this._payload = null;
    this._returning = null;
  }

  select(columns) {
    if (this._op !== 'select' && (this._op === 'insert' || this._op === 'update' || this._op === 'delete')) {
      this._returning = columns || '*';
      return this;
    }
    this._columns = columns || '*';
    return this;
  }

  insert(payload) { this._op = 'insert'; this._payload = payload; return this; }
  update(payload) { this._op = 'update'; this._payload = payload; return this; }
  delete() { this._op = 'delete'; return this; }

  eq(col, val) { this._filters.push({ op: 'eq', col, val }); return this; }
  neq(col, val) { this._filters.push({ op: 'neq', col, val }); return this; }
  in(col, val) { this._filters.push({ op: 'in', col, val }); return this; }
  ilike(col, val) { this._filters.push({ op: 'ilike', col, val }); return this; }
  gt(col, val) { this._filters.push({ op: 'gt', col, val }); return this; }
  gte(col, val) { this._filters.push({ op: 'gte', col, val }); return this; }
  lt(col, val) { this._filters.push({ op: 'lt', col, val }); return this; }
  lte(col, val) { this._filters.push({ op: 'lte', col, val }); return this; }
  or(expr) { this._filters.push({ op: 'or', col: null, val: expr }); return this; }
  textSearch(col, val) { this._filters.push({ op: 'textSearch', col, val }); return this; }
  is(col, val) { this._filters.push({ op: 'is', col, val }); return this; }
  contains(col, val) { this._filters.push({ op: 'contains', col, val }); return this; }

  order(col, opts) { this._order.push({ col, ...opts }); return this; }
  limit(n) { this._limitVal = n; return this; }
  single() { this._isSingle = true; this._limitVal = 1; return this; }
  maybeSingle() { this._isSingle = true; this._limitVal = 1; return this; }

  async then(resolve, reject) {
    try {
      const res = await fetch('/api/db-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this._table,
          operation: this._op,
          columns: this._columns,
          filters: this._filters,
          order: this._order,
          limit: this._limitVal,
          single: this._isSingle,
          payload: this._payload,
          returning: this._returning
        })
      });
      const result = await res.json();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err });
    }
  }
}

export const supabase = {
  from(table) {
    return new ClientQueryBuilder(table);
  },
  async rpc(fnName, params) {
    try {
      const res = await fetch('/api/db-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rpc: fnName, params })
      });
      return res.json();
    } catch (err) {
      return { data: null, error: err };
    }
  }
};
