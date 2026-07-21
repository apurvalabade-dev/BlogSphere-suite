import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetMyProfileResponse,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkId = clerkId;
  next();
};

router.get("/auth/profile", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

  if (!user) {
    const auth = getAuth(req);
    const email = (auth as any)?.sessionClaims?.email as string | undefined ?? `${clerkId}@unknown.com`;
    const name = (auth as any)?.sessionClaims?.name as string | undefined ?? "New User";

    [user] = await db
      .insert(usersTable)
      .values({ clerkId, email, name, role: "author" })
      .returning();
  }

  res.json(GetMyProfileResponse.parse({
    ...user,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
  }));
});

router.patch("/auth/profile", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;

  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.bio != null) updates.bio = parsed.data.bio;
  if (parsed.data.avatarUrl != null) updates.avatarUrl = parsed.data.avatarUrl;

  [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  res.json(UpdateMyProfileResponse.parse({
    ...user,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
  }));
});

export { requireAuth };
export default router;
