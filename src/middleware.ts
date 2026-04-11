export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Proteger todas las rutas excepto login, api/auth, y archivos estáticos
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
