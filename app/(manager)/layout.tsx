import { ManagerShell } from "@/components/manager-shell";

export default function ManagerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerShell>{children}</ManagerShell>;
}
