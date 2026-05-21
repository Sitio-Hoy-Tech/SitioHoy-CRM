export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!login|api/auth|api/webhooks|api/client|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)",
  ],
};
