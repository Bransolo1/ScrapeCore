import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await prisma.user.count();
  return Response.json({ isFirstUser: count === 0 });
}
