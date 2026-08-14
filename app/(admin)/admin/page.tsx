import { createClient } from "@/lib/supabase/server";
import { myCampus } from "@/lib/db/server-helpers";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { PreorderControl } from "@/components/admin/preorder-control";
import { money } from "@/lib/utils";
import { ShoppingBag, Wallet, Banknote, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const campus = await myCampus();
  const campusId = campus?.id ?? "";
  const supabase = await createClient();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select("payment_method, total")
    .eq("campus_id", campusId)
    .gte("created_at", startOfDay);
  const list = (orders as { payment_method: string; total: number }[]) ?? [];
  const revenue = list.reduce((s, o) => s + o.total, 0);
  const cod = list.filter((o) => o.payment_method === "cod").reduce((s, o) => s + o.total, 0);

  const { count: lowStock } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("campus_id", campusId)
    .gt("stock_quantity", 0)
    .lte("stock_quantity", 5);

  const cards = [
    { label: "Today's Orders", value: `${list.length}`, icon: ShoppingBag, tone: "text-primary" },
    { label: "Revenue", value: money(revenue), icon: Wallet, tone: "text-success" },
    { label: "COD / Pre-paid", value: `${money(cod)} / ${money(revenue - cod)}`, icon: Banknote, tone: "text-warn" },
    { label: "Low Stock Items", value: `${lowStock ?? 0}`, icon: AlertTriangle, tone: "text-error" },
  ];

  return (
    <PageContainer>
      <h1 className="mb-1 text-2xl font-extrabold text-text">Dashboard</h1>
      <p className="mb-6 text-sm text-text-muted">Today at a glance</p>
      {campus && (
        <div className="mb-4">
          <PreorderControl campus={campus} compact />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardBody>
              <c.icon className={`mb-3 h-7 w-7 ${c.tone}`} />
              <p className="text-2xl font-extrabold text-text">{c.value}</p>
              <p className="text-sm text-text-muted">{c.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
