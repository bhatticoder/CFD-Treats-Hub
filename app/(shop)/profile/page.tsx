import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { LogoutButton } from "@/components/logout-button";
import type { Profile } from "@/lib/types/models";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*, campuses(name)")
    .eq("id", user.id)
    .maybeSingle();
  const p = data as (Profile & { campuses?: { name: string } }) | null;

  return (
    <PageContainer max="max-w-xl">
      <h1 className="mb-4 text-2xl font-extrabold text-text">Profile</h1>
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-black text-on-primary">
              {(p?.full_name ?? "U")[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-text">{p?.full_name ?? "Student"}</p>
              <p className="text-sm text-text-muted">{p?.email}</p>
            </div>
          </div>
          <Field label="Phone" value={p?.phone ?? "—"} />
          <Field label="Campus" value={p?.campuses?.name ?? "—"} />
          <Field
            label="Default address"
            value={`Room ${p?.room_number ?? "?"}, ${p?.block ?? ""} Block`}
          />
          <div className="pt-2">
            <LogoutButton />
          </div>
        </CardBody>
      </Card>
    </PageContainer>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-t border-border pt-3 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}
