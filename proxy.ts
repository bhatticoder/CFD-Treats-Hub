import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 "Proxy" (formerly Middleware). 
// For Firebase, this acts as a lightweight gate. It only checks for the presence 
// of the session cookie. Strict RBAC (role validation) is handled by the 
// server components (layouts and pages) via the Firebase Admin SDK.

const AUTH_PATHS = ["/login", "/register", "/verify"];

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("firebase_session");
  const path = request.nextUrl.pathname;
  const isAuthPath = AUTH_PATHS.some((p) => path.startsWith(p));
  const isAdminPreviewPath = path === "/admin" || path.startsWith("/admin/");
  const isManagerPreviewPath = path === "/manager" || path.startsWith("/manager/");
  const isCustomerPreviewPath =
    path === "/" ||
    path === "/cart" ||
    path.startsWith("/cart/") ||
    path === "/preorder" ||
    path.startsWith("/preorder/") ||
    path === "/orders" ||
    path.startsWith("/orders/") ||
    path === "/notifications" ||
    path.startsWith("/notifications/") ||
    path === "/profile" ||
    path.startsWith("/profile/") ||
    path.startsWith("/track/");

  // Temporary UI preview: allow all three role surfaces to render while the
  // database/auth records are being rebuilt. APIs still authenticate normally.
  if (isAdminPreviewPath || isManagerPreviewPath || isCustomerPreviewPath) {
    return NextResponse.next();
  }

  // Allow API routes to handle their own auth
  if (path.startsWith("/api")) {
    return NextResponse.next();
  }

  // Unauthenticated user
  if (!sessionCookie) {
    if (isAuthPath) return NextResponse.next();
    return redirect(request, "/login");
  }

  // Authenticated user trying to access login/verify
  // We allow /register because authenticated users MUST visit /register if they have no profile!
  if ((path.startsWith("/login") || path.startsWith("/verify")) && sessionCookie) {
    return redirect(request, "/");
  }

  // Let them pass. The Server Components (e.g. app/(admin)/layout.tsx) will 
  // do the strict Firebase Admin verification and redirect if they lack permissions.
  return NextResponse.next();
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|json|webmanifest)$).*)",
  ],
};
