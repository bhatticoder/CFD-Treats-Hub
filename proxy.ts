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

  // Temporary UI-only mode: the database is being rebuilt, so all role
  // surfaces are public for screenshots and manual UI review. Authentication
  // pages are intentionally bypassed and redirect to the customer surface.
  if (isAuthPath) {
    return redirect(request, "/");
  }

  // APIs remain available to their own handlers. The preview pages use dummy
  // data and do not require a Firebase session cookie.
  if (path.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow the customer, manager, admin, and any supporting UI routes without
  // invoking the login flow. This is temporary and must be removed before
  // production because it disables route-level authentication.
  if (sessionCookie || isAdminPreviewPath || isManagerPreviewPath || isCustomerPreviewPath) {
    return NextResponse.next();
  }

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
