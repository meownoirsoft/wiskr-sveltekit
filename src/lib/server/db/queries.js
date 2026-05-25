/**
 * Supabase-compatible query builder that translates chained method calls
 * into raw SQL executed via the `postgres` driver.
 *
 * Usage mirrors Supabase:
 *   const { data, error } = await db.from('cards').select('*').eq('id', someId).single();
 *   const { data, error } = await db.rpc('match_facts', { p_project_id: id, p_query: vec });
 */
import sql from '../db.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeIdentifier(id) {
  // double-quote identifier to handle reserved words / special chars
  return `"${id.replace(/"/g, '""')}"`;
}

function parseStar(columns) {
  if (!columns || columns === '*') return '*';
  // Handle Supabase-style selects like 'id, name, description'
  // and nested selects like 'id, cards(id, title)' — nested joins are not
  // supported by this thin wrapper; they are returned as-is (callers that
  // use nested selects should be rewritten to use explicit joins).
  return columns;
}

// ---------------------------------------------------------------------------
// QueryBuilder
// ---------------------------------------------------------------------------

class QueryBuilder {
  constructor(table) {
    this._table = table;
    this._operation = 'select';
    this._columns = '*';
    this._filters = [];
    this._orFilters = [];
    this._orderClauses = [];
    this._limitVal = null;
    this._isSingle = false;
    this._countMode = null; // 'exact' | null
    this._insertPayload = null;
    this._updatePayload = null;
    this._returningColumns = null;
    this._textSearchClauses = [];
  }

  // ---- Operation starters ------------------------------------------------

  select(columns, opts) {
    this._operation = 'select';
    this._columns = parseStar(columns);
    if (opts?.count === 'exact') {
      this._countMode = 'exact';
    }
    return this;
  }

  insert(payload) {
    this._operation = 'insert';
    this._insertPayload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(payload) {
    this._operation = 'update';
    this._updatePayload = payload;
    return this;
  }

  delete() {
    this._operation = 'delete';
    return this;
  }

  // ---- Filters -----------------------------------------------------------

  eq(column, value) {
    this._filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column, value) {
    this._filters.push({ type: 'neq', column, value });
    return this;
  }

  gt(column, value) {
    this._filters.push({ type: 'gt', column, value });
    return this;
  }

  gte(column, value) {
    this._filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column, value) {
    this._filters.push({ type: 'lt', column, value });
    return this;
  }

  lte(column, value) {
    this._filters.push({ type: 'lte', column, value });
    return this;
  }

  in(column, values) {
    this._filters.push({ type: 'in', column, value: values });
    return this;
  }

  is(column, value) {
    this._filters.push({ type: 'is', column, value });
    return this;
  }

  ilike(column, pattern) {
    this._filters.push({ type: 'ilike', column, value: pattern });
    return this;
  }

  like(column, pattern) {
    this._filters.push({ type: 'like', column, value: pattern });
    return this;
  }

  contains(column, value) {
    this._filters.push({ type: 'contains', column, value });
    return this;
  }

  /**
   * Supabase `.or('col1.eq.val1,col2.eq.val2')` syntax.
   * We parse the mini-DSL into SQL OR conditions.
   */
  or(expr) {
    this._orFilters.push(expr);
    return this;
  }

  /**
   * Full-text search: `.textSearch('column', 'term1 & term2')`
   */
  textSearch(column, query, opts) {
    const type = opts?.type || 'plain';
    this._textSearchClauses.push({ column, query, type });
    return this;
  }

  // ---- Modifiers ---------------------------------------------------------

  order(column, opts) {
    const direction = opts?.ascending === false ? 'DESC' : 'ASC';
    const nulls = opts?.nullsFirst ? 'NULLS FIRST' : '';
    this._orderClauses.push(`${escapeIdentifier(column)} ${direction} ${nulls}`.trim());
    return this;
  }

  limit(n) {
    this._limitVal = n;
    return this;
  }

  single() {
    this._isSingle = true;
    this._limitVal = 1;
    return this;
  }

  maybeSingle() {
    this._isSingle = true;
    this._limitVal = 1;
    return this;
  }

  // ---- Returning (for insert/update/delete) ------------------------------

  /**
   * Corresponds to Supabase `.select('*')` chained after `.insert()` / `.update()`.
   * We treat a second `.select()` call on a mutation as RETURNING.
   */
  _applyReturning(columns) {
    this._returningColumns = parseStar(columns);
    return this;
  }

  // Override: if the operation is already insert/update/delete and .select()
  // is called, treat it as RETURNING.
  _chainSelect(columns) {
    if (this._operation !== 'select') {
      return this._applyReturning(columns);
    }
    this._columns = parseStar(columns);
    return this;
  }

  // ---- Build SQL ---------------------------------------------------------

  _buildWhere(paramIndex = 1) {
    const parts = [];
    const values = [];
    let idx = paramIndex;

    for (const f of this._filters) {
      const col = escapeIdentifier(f.column);
      switch (f.type) {
        case 'eq':
          if (f.value === null) {
            parts.push(`${col} IS NULL`);
          } else {
            parts.push(`${col} = $${idx++}`);
            values.push(f.value);
          }
          break;
        case 'neq':
          if (f.value === null) {
            parts.push(`${col} IS NOT NULL`);
          } else {
            parts.push(`${col} != $${idx++}`);
            values.push(f.value);
          }
          break;
        case 'gt':
          parts.push(`${col} > $${idx++}`);
          values.push(f.value);
          break;
        case 'gte':
          parts.push(`${col} >= $${idx++}`);
          values.push(f.value);
          break;
        case 'lt':
          parts.push(`${col} < $${idx++}`);
          values.push(f.value);
          break;
        case 'lte':
          parts.push(`${col} <= $${idx++}`);
          values.push(f.value);
          break;
        case 'in':
          if (f.value && f.value.length > 0) {
            const placeholders = f.value.map(() => `$${idx++}`).join(', ');
            parts.push(`${col} IN (${placeholders})`);
            values.push(...f.value);
          } else {
            parts.push('FALSE'); // empty IN → no match
          }
          break;
        case 'is':
          if (f.value === null) {
            parts.push(`${col} IS NULL`);
          } else if (f.value === true) {
            parts.push(`${col} IS TRUE`);
          } else if (f.value === false) {
            parts.push(`${col} IS FALSE`);
          }
          break;
        case 'ilike':
          parts.push(`${col} ILIKE $${idx++}`);
          values.push(f.value);
          break;
        case 'like':
          parts.push(`${col} LIKE $${idx++}`);
          values.push(f.value);
          break;
        case 'contains':
          parts.push(`${col} @> $${idx++}`);
          values.push(f.value);
          break;
      }
    }

    // .or() filters  — parse Supabase mini-DSL
    for (const expr of this._orFilters) {
      const { orSql, orValues } = this._parseOrExpr(expr, idx);
      parts.push(`(${orSql})`);
      values.push(...orValues);
      idx += orValues.length;
    }

    // textSearch
    for (const ts of this._textSearchClauses) {
      parts.push(`to_tsvector('english', ${escapeIdentifier(ts.column)}) @@ to_tsquery('english', $${idx++})`);
      values.push(ts.query);
    }

    return { where: parts.length ? parts.join(' AND ') : '1=1', values, nextIndex: idx };
  }

  /**
   * Parse Supabase `.or()` mini-DSL like:
   *   "title.ilike.%foo%,content.ilike.%foo%"
   */
  _parseOrExpr(expr, startIdx) {
    const conditions = [];
    const values = [];
    let idx = startIdx;

    // Split by comma, but be careful of values containing commas
    // Supabase .or() format: col.operator.value
    const parts = expr.split(',');
    for (const part of parts) {
      const dotIndex = part.indexOf('.');
      if (dotIndex === -1) continue;

      const column = part.substring(0, dotIndex);
      const rest = part.substring(dotIndex + 1);
      const opIndex = rest.indexOf('.');
      if (opIndex === -1) continue;

      const op = rest.substring(0, opIndex);
      const value = rest.substring(opIndex + 1);
      const col = escapeIdentifier(column);

      switch (op) {
        case 'eq':
          conditions.push(`${col} = $${idx++}`);
          values.push(value);
          break;
        case 'neq':
          conditions.push(`${col} != $${idx++}`);
          values.push(value);
          break;
        case 'ilike':
          conditions.push(`${col} ILIKE $${idx++}`);
          values.push(value);
          break;
        case 'like':
          conditions.push(`${col} LIKE $${idx++}`);
          values.push(value);
          break;
        case 'gt':
          conditions.push(`${col} > $${idx++}`);
          values.push(value);
          break;
        case 'gte':
          conditions.push(`${col} >= $${idx++}`);
          values.push(value);
          break;
        case 'lt':
          conditions.push(`${col} < $${idx++}`);
          values.push(value);
          break;
        case 'lte':
          conditions.push(`${col} <= $${idx++}`);
          values.push(value);
          break;
        case 'is':
          if (value === 'null') conditions.push(`${col} IS NULL`);
          else if (value === 'true') conditions.push(`${col} IS TRUE`);
          else if (value === 'false') conditions.push(`${col} IS FALSE`);
          break;
      }
    }

    return {
      orSql: conditions.join(' OR ') || 'TRUE',
      orValues: values
    };
  }

  // ---- Execute -----------------------------------------------------------

  async then(resolve, reject) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err });
    }
  }

  async _execute() {
    try {
      switch (this._operation) {
        case 'select':
          return await this._execSelect();
        case 'insert':
          return await this._execInsert();
        case 'update':
          return await this._execUpdate();
        case 'delete':
          return await this._execDelete();
        default:
          return { data: null, error: new Error(`Unknown operation: ${this._operation}`) };
      }
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async _execSelect() {
    const table = escapeIdentifier(this._table);
    const { where, values } = this._buildWhere();
    const orderBy = this._orderClauses.length ? `ORDER BY ${this._orderClauses.join(', ')}` : '';
    const limit = this._limitVal != null ? `LIMIT ${Number(this._limitVal)}` : '';

    const query = `SELECT ${this._columns} FROM ${table} WHERE ${where} ${orderBy} ${limit}`;
    const rows = await sql.unsafe(query, values);

    if (this._isSingle) {
      if (rows.length === 0) {
        return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
      }
      return { data: rows[0], error: null };
    }

    if (this._countMode === 'exact') {
      return { data: rows, error: null, count: rows.length };
    }

    return { data: rows, error: null };
  }

  async _execInsert() {
    const table = escapeIdentifier(this._table);
    const payloads = this._insertPayload;
    if (!payloads || payloads.length === 0) {
      return { data: null, error: new Error('No insert payload') };
    }

    const columns = Object.keys(payloads[0]);
    const colNames = columns.map(escapeIdentifier).join(', ');
    const valuePlaceholders = [];
    const allValues = [];
    let idx = 1;

    for (const row of payloads) {
      const rowPlaceholders = columns.map(col => {
        const val = row[col];
        if (val !== undefined) {
          allValues.push(Array.isArray(val) ? JSON.stringify(val) : val);
          return `$${idx++}`;
        }
        return 'DEFAULT';
      });
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const returning = this._returningColumns ? `RETURNING ${this._returningColumns}` : '';
    const query = `INSERT INTO ${table} (${colNames}) VALUES ${valuePlaceholders.join(', ')} ${returning}`;
    const rows = await sql.unsafe(query, allValues);

    if (this._isSingle) {
      return { data: rows[0] || null, error: null };
    }
    return { data: rows.length === 1 && !Array.isArray(this._insertPayload) ? rows[0] : rows, error: null };
  }

  async _execUpdate() {
    const table = escapeIdentifier(this._table);
    const payload = this._updatePayload;
    if (!payload) {
      return { data: null, error: new Error('No update payload') };
    }

    const columns = Object.keys(payload);
    const setClauses = [];
    const allValues = [];
    let idx = 1;

    for (const col of columns) {
      const val = payload[col];
      if (val !== undefined) {
        setClauses.push(`${escapeIdentifier(col)} = $${idx++}`);
        allValues.push(Array.isArray(val) ? JSON.stringify(val) : val);
      }
    }

    const setStr = setClauses.join(', ');
    const { where, values: whereValues } = this._buildWhere(idx);
    allValues.push(...whereValues);

    const returning = this._returningColumns ? `RETURNING ${this._returningColumns}` : '';
    const query = `UPDATE ${table} SET ${setStr} WHERE ${where} ${returning}`;
    const rows = await sql.unsafe(query, allValues);

    if (this._isSingle) {
      if (rows.length === 0) {
        return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
      }
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }

  async _execDelete() {
    const table = escapeIdentifier(this._table);
    const { where, values } = this._buildWhere();
    const returning = this._returningColumns ? `RETURNING ${this._returningColumns}` : '';
    const query = `DELETE FROM ${table} WHERE ${where} ${returning}`;
    const rows = await sql.unsafe(query, values);

    if (this._isSingle) {
      return { data: rows[0] || null, error: null };
    }
    return { data: rows, error: null };
  }
}

// ---------------------------------------------------------------------------
// Wrap .select() to handle RETURNING for mutation chains
// ---------------------------------------------------------------------------

const originalSelect = QueryBuilder.prototype.select;
QueryBuilder.prototype.select = function (columns, opts) {
  if (this._operation === 'insert' || this._operation === 'update' || this._operation === 'delete') {
    return this._applyReturning(columns || '*');
  }
  return originalSelect.call(this, columns, opts);
};

// ---------------------------------------------------------------------------
// Database client (drop-in replacement for supabase client)
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase-compatible database client.
 * @returns {{ from: (table: string) => QueryBuilder, rpc: (fn: string, params: object) => Promise<{data, error}> }}
 */
export function createDbClient() {
  return {
    from(table) {
      return new QueryBuilder(table);
    },

    /**
     * Call a PostgreSQL function (replaces supabase.rpc()).
     * Translates `rpc('fn_name', { arg1: val1, arg2: val2 })`
     * into `SELECT * FROM fn_name(arg1 := $1, arg2 := $2)`.
     */
    async rpc(fnName, params = {}) {
      try {
        const keys = Object.keys(params);
        const values = keys.map(k => params[k]);
        const argList = keys.map((k, i) => `${k} := $${i + 1}`).join(', ');
        const query = `SELECT * FROM ${escapeIdentifier(fnName)}(${argList})`;
        const rows = await sql.unsafe(query, values);
        return { data: rows, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },

    /**
     * Direct access to the raw `postgres` tagged-template driver
     * for queries that don't fit the builder pattern.
     */
    sql
  };
}

// Singleton for server-side usage (replaces supabaseAdmin)
export const db = createDbClient();
