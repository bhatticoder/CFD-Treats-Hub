import { redirect } from "next/navigation";
import { ManagerShell } from "@/components/manager-shell";
import { myCampus, myProfile } from "@/lib/db/server-helpers";

export default async function ManagerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await myProfile();
  
  if (!profile || profile.role !== "manager") {
    redirect("/");
  }

  const campus = await myCampus();
  return (
    <ManagerShell logoUrl={campus?.logo_url} themeColor={campus?.theme_color}>
      {children}
    </ManagerShell>
  );
}
