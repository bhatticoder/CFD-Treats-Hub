import { ManagerShell } from "@/components/manager-shell";

const demoCampus = {
  name: "Boys Hostel",
  logo_url: null,
  theme_color: null,
};

export default function ManagerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ManagerShell
      logoUrl={demoCampus.logo_url}
      themeColor={demoCampus.theme_color}
    >
      {children}
    </ManagerShell>
  );
}
