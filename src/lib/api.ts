import { auth } from "./auth";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
