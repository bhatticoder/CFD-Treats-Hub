import { proxyAction, proxyAuthAction } from "./action";

class ClientQueryBuilder {
  constructor(private table: string) {}
  
  private payload: any = null;
  private action: string = "select";
  
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

  gt(column: string, value: any) {
    this.conditions.push({ column, operator: '>', value });
    return this;
  }

  update(payload: any) {
    this.action = "update";
    this.payload = payload;
    return this;
  }
  
  insert(payload: any) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  upsert(payload: any) {
    this.action = "upsert";
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = "delete";
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

  // Make it awaitable to trigger the server action
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return proxyAction(
      this.table, 
      this.action, 
      this.payload, 
      this.conditions, 
      this.orderFields, 
      this.limitCount, 
      this.isSingle, 
      this.isMaybeSingle, 
      this.selectClause
    ).then(onfulfilled, onrejected);
  }
}

  export const createClient = () => {
  return {
    from: (table: string) => new ClientQueryBuilder(table),
    rpc: async (fn: string, params: any): Promise<{ data: any; error: any }> => {
      // Mock for client-side rpc calls to prevent crashes.
      return { data: null, error: null };
    },
    channel: (name: string) => {
      return {
        on: (event: string, filter: any, callback: any) => {
          return { subscribe: () => {} };
        },
        subscribe: () => {},
        unsubscribe: () => {}
      };
    },
    removeChannel: (channel: any) => {},
    storage: {
      from: (bucket: string) => ({
         upload: async (path: string, file: any, options: any) => ({ error: null as any }),
         getPublicUrl: (path: string) => ({ data: { publicUrl: "" } })
      })
    },
    functions: {
      invoke: async (name: string, options: any): Promise<{ data: any; error: any }> => ({ data: null, error: null })
    },
    auth: {
       signOut: async () => proxyAuthAction("signOut")
    }
  };
};
