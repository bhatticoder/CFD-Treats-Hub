import { AdminShell } from "@/components/admin-shell";
import { myCampus } from "@/lib/db/server-helpers";

export const dynamic = "force-dynamic";

/**
 * Temporary UI preview mode.
 *
 * This intentionally skips the database-backed admin authorization check so
 * the admin screens remain accessible while the database is being rebuilt.
 * Do not use this deployment for real administration or production data.
 */
export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let campus: Awaited<ReturnType<typeof myCampus>> = null;

  try {
    campus = await myCampus();
  } catch (error) {
    console.warn("[v0] Admin UI preview: campus lookup unavailable", error);
  }

  return (
    <AdminShell logoUrl={campus?.logo_url} themeColor={campus?.theme_color}>
      {children}
    </AdminShell>
  );
}

