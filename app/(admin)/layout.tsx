import { AdminShell } from "@/components/admin-shell";
import { myCampus } from "@/lib/db/server-helpers";

export const dynamic = "force-dynamic";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const campus = await myCampus();
  return (
    <AdminShell logoUrl={campus?.logo_url} themeColor={campus?.theme_color}>
      {children}
    </AdminShell>
  );
}
