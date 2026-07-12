import { CustomerShell } from "@/components/customer-shell";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShell>{children}</CustomerShell>;
}
