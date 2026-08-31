"use server";

import { createClient } from "./server";

export async function proxyAction(
  table: string, 
  action: string, 
  payload: any, 
  conditions: any[], 
  orderFields: any[],
  limitCount: number | null,
  isSingle: boolean,
  isMaybeSingle: boolean,
  selectClause: string
) {
  const supabase = createClient();
  let query: any = supabase.from(table);

  if (selectClause) {
    query = query.select(selectClause);
  }

  for (const cond of conditions) {
    if (cond.operator === '==') query = query.eq(cond.column, cond.value);
    if (cond.operator === '>=') query = query.gte(cond.column, cond.value);
    if (cond.operator === '<=') query = query.lte(cond.column, cond.value);
    if (cond.operator === 'in') query = query.in(cond.column, cond.value);
    if (cond.operator === '!=') query = query.neq(cond.column, cond.value);
  }

  for (const order of orderFields) {
    query = query.order(order.column, { ascending: order.direction === 'asc' });
  }

  if (limitCount) {
    query = query.limit(limitCount);
  }

  if (isSingle) query = query.single();
  if (isMaybeSingle) query = query.maybeSingle();

  try {
    let res: any;
    if (action === "update") {
      res = await query.update(payload);
    } else if (action === "insert") {
      res = await query.insert(payload);
    } else if (action === "upsert") {
      res = await query.upsert(payload);
    } else if (action === "delete") {
      res = await query.delete();
    } else if (action === "select") {
      res = await query; // it executes automatically because the server proxy is awaitable
    }
    
    // Server proxy returns { data, error } where error might be an Error object.
    // Error objects cannot be returned from Server Actions easily, so we serialize it.
    if (res.error) {
       return { data: null, error: { message: res.error.message || String(res.error) } };
    }
    return { data: res.data, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e.message || String(e) } };
  }
}

export async function proxyAuthAction(action: string) {
  // Just mock auth actions for now if they are used on client (e.g. signOut).
  return { error: null };
}
