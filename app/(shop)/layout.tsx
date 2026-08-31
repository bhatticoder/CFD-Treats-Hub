import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { NotificationPrompt } from "@/components/notification-prompt";
import { myCampus, myProfile } from "@/lib/db/server-helpers";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await myProfile();

  if (!profile) {
    redirect("/register");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  if (profile.role === "manager") {
    redirect("/manager");
  }

  const campus = await myCampus();
  return (
    <CustomerShell logoUrl={campus?.logo_url} themeColor={campus?.theme_color}>
      {children}
      <NotificationPrompt />
    </CustomerShell>
  );
}
