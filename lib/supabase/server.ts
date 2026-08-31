import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { currentUser } from "@/lib/db/server-helpers";

class QueryBuilder {
  constructor(private table: string) {}
  
  private conditions: any[] = [];
  private orderFields: any[] = [];
  private limitCount: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private selectClause: string = "*";
  private countMode: string | null = null;

  select(columns: string = "*", options?: { count?: string; head?: boolean }) {
    this.selectClause = columns;
    if (options && options.count) {
      this.countMode = options.count;
    }
    return this;
  }

  eq(column: string, value: any) {
    this.conditions.push({ column, operator: '==', value });
    return this;
  }

  neq(column: string, value: any) {
    this.conditions.push({ column, operator: '!=', value });
    return this;
  }

  in(column: string, values: any[]) {
    this.conditions.push({ column, operator: 'in', value: values });
    return this;
  }

  gte(column: string, value: any) {
    this.conditions.push({ column, operator: '>=', value });
    return this;
  }

  lte(column: string, value: any) {
    this.conditions.push({ column, operator: '<=', value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderFields.push({ column, direction: options?.ascending === false ? 'desc' : 'asc' });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this;
  }

  gt(column: string, value: any) {
    this.conditions.push({ column, operator: '>', value });
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.payload = data;
    return this;
  }

  insert(data: any | any[]) {
    this.action = 'insert';
    this.payload = data;
    return this;
  }

  upsert(data: any | any[]) {
    this.action = 'insert';
    this.payload = data;
    return this;
  }

  private action: 'select' | 'delete' | 'update' | 'insert' = 'select';
  private payload: any = null;

  private async fetchRelationalJoins(data: any[]) {
    if (!this.selectClause.includes("(")) return;
    
    const joins = this.selectClause.match(/(\w+)\((.*?)\)/g);
    if (!joins) return;

    for (const row of data) {
      for (const join of joins) {
        const [table, cols] = join.split("(");
        
        if (table === "order_items") {
          // 1-to-many relationship
          const itemsQuery = await getAdminDb().collection("order_items").where("order_id", "==", row.id).get();
          row.order_items = itemsQuery.docs.map(d => ({ id: d.id, ...d.data() }));
          continue;
        }

        let fk = "";
        if (table === "campuses" && row.campus_id) fk = row.campus_id;
        else if (table === "profiles" && row.customer_id) fk = row.customer_id;
        else if (table === "restaurants" && row.restaurant_id) fk = row.restaurant_id;
        
        if (fk) {
          const doc = await getAdminDb().collection(table).doc(fk).get();
          if (doc.exists) {
            row[table] = { id: doc.id, ...doc.data() };
          } else {
            row[table] = null;
          }
        }
      }
    }
  }

  // Make the QueryBuilder awaitable
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    try {
      if (this.action === 'insert') {
        const batch = getAdminDb().batch();
        const isArray = Array.isArray(this.payload);
        const arr = isArray ? this.payload : [this.payload];
        const results = [];
        for (const item of arr) {
          const ref = item.id ? getAdminDb().collection(this.table).doc(item.id.toString()) : getAdminDb().collection(this.table).doc();
          batch.set(ref, { ...item, id: ref.id });
          results.push({ ...item, id: ref.id });
        }
        await batch.commit();
        return { data: isArray ? results : results[0], error: null };
      }

      let query: any = getAdminDb().collection(this.table);

      // Handle 'in' chunks for Firebase limits
      const inCondition = this.conditions.find(c => c.operator === 'in');
      if (inCondition && inCondition.value.length > 10) {
          query = getAdminDb().collection(this.table);
          this.conditions = this.conditions.filter(c => c.operator !== 'in');
      }

      for (const cond of this.conditions) {
        if (cond.operator !== 'in' || (cond.operator === 'in' && cond.value.length <= 10)) {
           query = query.where(cond.column, cond.operator, cond.value);
        }
      }

      if (this.action === 'delete') {
        const snapshot = await query.get();
        const batch = getAdminDb().batch();
        snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
        return { data: null, error: null };
      }

      if (this.action === 'update') {
        const snapshot = await query.get();
        const batch = getAdminDb().batch();
        snapshot.docs.forEach((doc: any) => batch.update(doc.ref, this.payload));
        await batch.commit();
        return { data: null, error: null };
      }

      for (const order of this.orderFields) {
        query = query.orderBy(order.column, order.direction);
      }

      if (this.limitCount) {
        query = query.limit(this.limitCount);
      }

      const snapshot = await query.get();
      let results = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      if (inCondition && inCondition.value.length > 10) {
          results = results.filter((r: any) => inCondition.value.includes(r[inCondition.column]));
      }

      await this.fetchRelationalJoins(results);

      if (this.isSingle) {
        if (results.length === 0) return { data: null, error: new Error("Row not found") };
        return { data: results[0], error: null };
      }

      if (this.isMaybeSingle) {
        return { data: results.length > 0 ? results[0] : null, error: null };
      }

      return { data: results, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }
}

export const createClient = () => {
  return {
    from: (table: string) => new QueryBuilder(table),
    rpc: async (fn: string, params: any): Promise<{ data: any; error: any }> => {
       // Mock for rpc calls like start_shift, etc.
       return { data: null, error: null };
    },
    auth: {
      getUser: async () => {
        const u = await currentUser();
        return { data: { user: u }, error: null };
      },
      exchangeCodeForSession: async () => {},
      verifyOtp: async () => {},
    }
  };
};
