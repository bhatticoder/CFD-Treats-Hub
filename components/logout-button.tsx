"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" /> Logout
    </Button>
  );
}
