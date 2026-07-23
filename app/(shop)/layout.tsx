import { CustomerShell } from "@/components/customer-shell";
import { NotificationPrompt } from "@/components/notification-prompt";
import { myCampus } from "@/lib/db/server-helpers";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const campus = await myCampus();
  return (
    <CustomerShell logoUrl={campus?.logo_url} themeColor={campus?.theme_color}>
      {children}
      <NotificationPrompt />
    </CustomerShell>
  );
}
