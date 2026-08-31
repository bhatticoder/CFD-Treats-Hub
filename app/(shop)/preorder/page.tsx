import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PreorderBrowser } from "@/components/preorder-browser";
import { PageContainer } from "@/components/app-shell";
import { isPreorderOpen, whatsappLink } from "@/lib/domain/preorder";
import type { Campus, Item, Profile } from "@/lib/types/models";
import { CalendarClock, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PreorderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, campuses(*)")
    .eq("id", user.id)
    .maybeSingle();
  const p = profile as (Profile & { campuses?: Campus | Campus[] }) | null;
  const rawCampus = p?.campuses ?? null;
  const campus = Array.isArray(rawCampus) ? rawCampus[0] : rawCampus;

  // Closed → show the contact message instead of the ordering UI.
  if (!isPreorderOpen(campus)) {
    const wa = whatsappLink(campus?.whatsapp_number);
    return (
      <PageContainer max="max-w-lg">
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-10 text-center">
          <CalendarClock className="mb-3 h-14 w-14 text-text-faint" />
          <p className="text-lg font-bold text-text">
            Pre-orders are closed, kindly contact through WhatsApp
          </p>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-success px-5 py-3 font-semibold text-white"
            >
              <MessageCircle className="h-5 w-5" /> Contact on WhatsApp
            </a>
          )}
        </div>
      </PageContainer>
    );
  }

  // Fetch all categories globally so admins don't have to recreate them per campus
  const { data: rawCategories } = await supabase
    .from("item_categories")
    .select("name")
    .order("name");
  
  const allCategories = rawCategories ? rawCategories.map((c: any) => c.name) : [];

  let { data: rawItems } = await supabase
    .from("items")
    .select("*, restaurants(name, is_active)")
    .eq("campus_id", p?.campus_id ?? "")
    .eq("is_preorder", true)
    .eq("is_available", true)
    .order("name");

  if (!rawItems || rawItems.length === 0) {
    const { data: fallback } = await supabase
      .from("items")
      .select("*, restaurants(name, is_active)")
      .eq("campus_id", p?.campus_id ?? "")
      .eq("is_available", true)
      .order("name");
    rawItems = fallback;
  }

  // Filter out items belonging to hidden restaurants.
  const items = ((rawItems as any[]) ?? []).filter(
    (i) => !i.restaurant_id || i.restaurants?.is_active,
  );

  return (
    <PreorderBrowser
      items={(items as Item[]) ?? []}
      categories={allCategories}
      defaultRoom={p?.room_number ?? ""}
      defaultBlock={p?.block ?? (campus?.halls && campus.halls.length > 0 ? campus.halls[0] : "")}
      account={campus?.payment_account_info ?? null}
      isGirlsCampus={campus?.gender === "Female"}
      deliveryActive={campus?.delivery_active ?? true}
      collectionRoom={campus?.collection_room ?? null}
      halls={campus?.halls ?? []}
    />
  );
}
