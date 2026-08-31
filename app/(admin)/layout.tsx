import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { myCampus, myProfile } from "@/lib/db/server-helpers";

export const dynamic = "force-dynamic";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await myProfile();
  
  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const campus = await myCampus();
  return (
    <AdminShell logoUrl={campus?.logo_url} themeColor={campus?.theme_color}>
      {children}
    </AdminShell>
  );
}
