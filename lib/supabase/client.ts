import { proxyAction, proxyAuthAction } from "./action";
import { firebaseDb } from "@/lib/firebase/config";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseStorage } from "@/lib/firebase/config";

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

const channelUnsubscribes = new Map<string, () => void>();

class RealtimeChannel {
  private _unsubscribe?: () => void;
  private _callbacks: Array<{ filter: any; callback: any }> = [];
  private _channelName: string;

  constructor(channelName: string) {
    this._channelName = channelName;
  }

  on(event: string, filter: any, callback: any) {
    this._callbacks.push({ filter, callback });
    return this;
  }

  subscribe() {
    const orderId = this._channelName.replace("order-", "");
    if (orderId && orderId !== this._channelName) {
      const orderRef = doc(firebaseDb, "orders", orderId);
      this._unsubscribe = onSnapshot(orderRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          for (const { callback } of this._callbacks) {
            callback({ new: { ...data, id: snapshot.id } });
          }
        }
      });
      channelUnsubscribes.set(this._channelName, this._unsubscribe);
    }
    return this;
  }

  unsubscribe() {
    this._unsubscribe?.();
    channelUnsubscribes.delete(this._channelName);
  }
}

export const createClient = () => {
  return {
    from: (table: string) => new ClientQueryBuilder(table),
    rpc: async (fn: string, params: any): Promise<{ data: any; error: any }> => {
      try {
        switch (fn) {
          case "mark_delivered": {
            const orderId = params?.p_order_id;
            if (!orderId) return { data: null, error: { message: "Missing p_order_id" } };
            await updateDoc(doc(firebaseDb, "orders", orderId), {
              order_status: "delivered",
              delivered_at: new Date().toISOString(),
            });
            return { data: null, error: null };
          }
          case "manager_cancel_order": {
            const orderId = params?.p_order_id;
            if (!orderId) return { data: null, error: { message: "Missing p_order_id" } };
            await updateDoc(doc(firebaseDb, "orders", orderId), {
              order_status: "cancelled",
              cancel_reason: params?.p_reason || null,
            });
            return { data: null, error: null };
          }
          case "manager_set_discount": {
            const itemId = params?.p_item_id;
            if (!itemId) return { data: null, error: { message: "Missing p_item_id" } };
            await updateDoc(doc(firebaseDb, "items", itemId), {
              discounted_price: params?.p_discounted ?? null,
            });
            return { data: null, error: null };
          }
          default:
            return { data: null, error: { message: "RPC not implemented for " + fn } };
        }
      } catch (e: any) {
        return { data: null, error: { message: e.message || String(e) } };
      }
    },
    channel: (name: string) => {
      return new RealtimeChannel(name);
    },
    removeChannel: (channel: any) => {
      if (channel && typeof channel.unsubscribe === "function") {
        channel.unsubscribe();
      }
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: any, options: any) => {
          try {
            const storageRef = ref(firebaseStorage, path);
            await uploadBytes(storageRef, file, options ? { contentType: options.contentType } : undefined);
            return { error: null as any };
          } catch (e: any) {
            return { error: { message: e.message || String(e) } };
          }
        },
        getPublicUrl: async (path: string) => {
          try {
            const storageRef = ref(firebaseStorage, path);
            const url = await getDownloadURL(storageRef);
            return { data: { publicUrl: url } };
          } catch (e: any) {
            return { data: { publicUrl: "" } };
          }
        }
      })
    },
    functions: {
      invoke: async (name: string, options: any): Promise<{ data: any; error: any }> => ({ data: null, error: null })
    },
    auth: {
       signOut: async () => {
         try {
           const { firebaseAuth } = await import("@/lib/firebase/config");
           await firebaseAuth.signOut();
         } catch (e) {
           console.error("Firebase client signOut failed:", e);
         }
         return proxyAuthAction("signOut");
       }
    }
  };
};
