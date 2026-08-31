import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { currentUser } from "@/lib/db/server-helpers";
import type { Item, Voucher } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      p_room_number,
      p_block,
      p_payment_method,
      p_payment_screenshot_url,
      p_items, // { item_id, quantity }[]
      p_promo_code,
      p_additional_note,
      isPreorder
    } = body;

    if (!p_items || p_items.length === 0) {
      return NextResponse.json({ error: "Order must contain items" }, { status: 400 });
    }

    const profileDoc = await getAdminDb().collection("profiles").doc(user.id).get();
    const profile = profileDoc.data();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    const campusId = profile.campus_id;

    if (!campusId) return NextResponse.json({ error: "User is not assigned to a campus" }, { status: 400 });

    const campusDoc = await getAdminDb().collection("campuses").doc(campusId).get();
    const campus = campusDoc.data();
    if (!campus) return NextResponse.json({ error: "Campus not found" }, { status: 400 });

    if (!campus.shift_active && !isPreorder) {
      return NextResponse.json({ error: "ALL FINISHED FOR TODAY" }, { status: 400 });
    }

    // Process order in a transaction to ensure stock is updated safely
    const result = await getAdminDb().runTransaction(async (t) => {
      // 1. Fetch Items
      const itemDocs = await Promise.all(
        p_items.map((line: any) => t.get(getAdminDb().collection("items").doc(line.item_id)))
      );

      const items: Item[] = itemDocs.map((doc, idx) => {
        if (!doc.exists) throw new Error(`Item ${p_items[idx].item_id} not found`);
        return { id: doc.id, ...doc.data() } as Item;
      });

      // 2. Validate Stock and Calculate Prices
      let subtotal = 0;
      let deliveryFee = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const line = p_items[i];
        
        if (!item.is_available) throw new Error(`${item.name} is not available`);
        if (item.stock_quantity !== -1 && item.stock_quantity < line.quantity) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }

        const price = item.discounted_price ?? item.price;
        subtotal += price * line.quantity;
        deliveryFee += (item.delivery_fee || 0) * line.quantity;
      }

      // 3. Apply Voucher
      let discountAmount = 0;
      if (p_promo_code) {
        const vQuery = await t.get(
          getAdminDb().collection("vouchers")
            .where("campus_id", "==", campusId)
            .where("code", "==", p_promo_code)
            .where("is_active", "==", true)
            .limit(1)
        );
        if (!vQuery.empty) {
          const v = vQuery.docs[0].data() as Voucher;
          const platformFee = isPreorder ? (campus.preorder_platform_fee || 5) : (campus.regular_platform_fee || 5);
          const codCharge = p_payment_method === "cod" ? (isPreorder ? (campus.preorder_cod_charge || 10) : (campus.regular_cod_charge || 10)) : 0;
          const preDiscTotal = subtotal + deliveryFee + platformFee + codCharge;
          
          if (preDiscTotal >= v.min_order_value) {
            discountAmount = v.discount_type === "percentage" 
              ? preDiscTotal * (v.discount_value / 100) 
              : v.discount_value;
            if (discountAmount > preDiscTotal) discountAmount = preDiscTotal;
          }
        }
      }

      const platformFee = isPreorder ? (campus.preorder_platform_fee || 5) : (campus.regular_platform_fee || 5);
      const codCharge = p_payment_method === "cod" ? (isPreorder ? (campus.preorder_cod_charge || 10) : (campus.regular_cod_charge || 10)) : 0;
      
      const discountedSub = subtotal + deliveryFee + platformFee + codCharge - discountAmount;
      const gstRate = isPreorder ? (campus.preorder_gst || 5) : (campus.regular_gst || 5);
      const gst = discountedSub * (gstRate / 100);
      const total = discountedSub + gst;

      // 4. Generate Order Number
      // Find highest order number for today
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const ordersRef = getAdminDb().collection("orders");
      
      // We can't query and sort cleanly in transaction if we haven't read yet, 
      // but order numbers can just be a random short ID or timestamp based for safety
      const orderNumber = Math.floor(1000 + Math.random() * 9000).toString(); 

      // 5. Update Stock
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const line = p_items[i];
        if (item.stock_quantity !== -1) {
          t.update(itemDocs[i].ref, { stock_quantity: item.stock_quantity - line.quantity });
        }
      }

      // 6. Create Order Items structure (embedded)
      const orderItems = p_items.map((line: any, i: number) => ({
        id: getAdminDb().collection("order_items").doc().id, // Generate an ID just in case
        item_id: items[i].id,
        name: items[i].name,
        quantity: line.quantity,
        unit_price: items[i].discounted_price ?? items[i].price,
        total_price: (items[i].discounted_price ?? items[i].price) * line.quantity,
        created_at: new Date().toISOString(),
        items: {
          name: items[i].name,
          image_url: items[i].image_url,
          custom_instruction: items[i].custom_instruction
        }
      }));

      const orderRef = getAdminDb().collection("orders").doc();
      const newOrder = {
        id: orderRef.id,
        order_number: `ORD-${orderNumber}`,
        customer_id: user.id,
        campus_id: campusId,
        room_number: p_room_number,
        block: p_block,
        payment_method: p_payment_method,
        payment_screenshot_url: p_payment_screenshot_url,
        payment_status: p_payment_method === "cod" ? "pending" : "verifying",
        order_status: "new",
        subtotal,
        delivery_fee: deliveryFee,
        platform_fee: platformFee,
        cod_fee: codCharge,
        gst,
        discount_amount: discountAmount,
        total,
        promo_code: p_promo_code,
        additional_note: p_additional_note,
        is_preorder: isPreorder,
        created_at: new Date().toISOString(),
        order_items: orderItems,
        // denormalized profile
        profiles: {
           full_name: profile.full_name,
           phone: profile.phone
        },
        // denormalized campus
        campuses: {
           name: campus.name,
           gender: campus.gender
        }
      };

      t.set(orderRef, newOrder);
      
      // To mimic the previous DB behavior, we also save order_items to a separate collection
      // but it's redundant. We'll do it to avoid breaking other views.
      for (const oi of orderItems) {
         t.set(getAdminDb().collection("order_items").doc(oi.id), {
           ...oi,
           order_id: orderRef.id
         });
      }

      return newOrder;
    });

    return NextResponse.json({ success: true, order: result });
  } catch (error: any) {
    console.error("Order placement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
