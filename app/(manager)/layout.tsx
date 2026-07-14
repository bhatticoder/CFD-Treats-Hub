import { ManagerShell } from "@/components/manager-shell";
import { myCampus } from "@/lib/db/server-helpers";

export default async function ManagerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const campus = await myCampus();
  return (
    <ManagerShell logoUrl={campus?.logo_url} themeColor={campus?.theme_color}>
      {children}
    </ManagerShell>
  );
}
