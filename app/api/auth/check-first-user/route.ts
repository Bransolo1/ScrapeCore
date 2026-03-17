import { prisma } from "@/lib/db";

export async function GET() {
  const count = await prisma.user.count();
  return Response.json({ isFirstUser: count === 0 });
}
