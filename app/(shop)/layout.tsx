import { CustomerShell } from "@/components/customer-shell";

export const dynamic = "force-static";

/** Temporary UI-only customer preview. Remove before production. */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerShell logoUrl={null} themeColor={null}>
      {children}
    </CustomerShell>
  );
}

