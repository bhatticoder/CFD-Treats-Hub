import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Role } from "@/lib/domain/constants";

// Next.js 16 "Proxy" (formerly Middleware). Refreshes the Supabase session on
// every request and applies an OPTIMISTIC RBAC redirect. The database RLS is
// the real security gate — this only steers navigation.

const AUTH_PATHS = ["/login", "/register", "/verify", "/auth"];

function homeFor(role: Role | null): string {
  if (role === "admin") return "/admin";
  if (role === "manager") return "/manager";
  return "/";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPath = AUTH_PATHS.some((p) => path.startsWith(p));

  // Unauthenticated → only auth pages allowed.
  if (!user) {
    if (isAuthPath) return response;
    return redirect(request, "/login");
  }

  // Authenticated: resolve role/profile (self-select allowed by RLS).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  // No profile row yet → must complete registration.
  if (!profile) {
    return path === "/register" ? response : redirect(request, "/register");
  }
  // Deactivated account → end the session for real. signOut()'s cleared cookies
  // don't survive onto a fresh redirect response, so clear them explicitly.
  if (profile.is_active === false) {
    const res = redirect(request, "/login?reason=deactivated");
    for (const c of request.cookies.getAll()) {
      if (c.name.startsWith("sb-") && c.name.includes("-auth-token")) {
        res.cookies.set(c.name, "", { maxAge: 0, path: "/" });
      }
    }
    return res;
  }

  const role = profile.role as Role;
  const home = homeFor(role);

  // Bounce away from auth pages once logged in.
  if (isAuthPath) return redirect(request, home);

  // Section guards.
  if (path.startsWith("/admin") && role !== "admin") return redirect(request, home);
  if (path.startsWith("/manager") && role !== "manager") return redirect(request, home);
  // Customer (shop) area is everything else; keep staff out of it.
  const inStaffArea = path.startsWith("/admin") || path.startsWith("/manager");
  if (!inStaffArea && role !== "customer") return redirect(request, home);

  return response;
}

function redirect(request: NextRequest, to: string) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
