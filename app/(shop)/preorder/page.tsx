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
  const p = profile as (Profile & { campuses?: Campus }) | null;
  const campus = p?.campuses ?? null;

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

  let { data: items } = await supabase
    .from("items")
    .select("*, restaurants(name)")
    .eq("campus_id", p?.campus_id ?? "")
    .eq("is_preorder", true)
    .eq("is_available", true)
    .order("name");

  if (!items || items.length === 0) {
    const { data: fallback } = await supabase
      .from("items")
      .select("*, restaurants(name)")
      .eq("campus_id", p?.campus_id ?? "")
      .eq("is_available", true)
      .order("name");
    items = fallback;
  }

  return (
    <PreorderBrowser
      items={(items as Item[]) ?? []}
      defaultRoom={p?.room_number ?? ""}
      defaultBlock={p?.block ?? "Iqbal"}
      account={campus?.payment_account_info ?? null}
    />
  );
}
