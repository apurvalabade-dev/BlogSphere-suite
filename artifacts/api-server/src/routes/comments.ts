import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, commentsTable, usersTable, postsTable } from "@workspace/db";
import {
  ListCommentsParams,
  CreateCommentParams,
  CreateCommentBody,
  UpdateCommentParams,
  UpdateCommentBody,
  DeleteCommentParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

async function enrichComment(comment: any, author: any) {
  return {
    ...comment,
    authorName: author?.name ?? "Unknown",
    authorAvatarUrl: author?.avatarUrl ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

router.get("/posts/:postId/comments", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const params = ListCommentsParams.safeParse({ postId: rawId });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const comments = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.postId, params.data.postId))
    .orderBy(asc(commentsTable.createdAt));

  const authorIds = [...new Set(comments.map((c) => c.authorId))];
  const authors = authorIds.length
    ? await db.select().from(usersTable).where(
        authorIds.length === 1
          ? eq(usersTable.id, authorIds[0])
          : eq(usersTable.id, authorIds[0])
      )
    : [];

  const allAuthors = authorIds.length > 1
    ? await db.select().from(usersTable)
    : authors;
  const authorMap = Object.fromEntries(allAuthors.map((a) => [a.id, a]));

  const enriched = await Promise.all(comments.map((c) => enrichComment(c, authorMap[c.authorId])));
  res.json(enriched);
});

router.post("/posts/:postId/comments", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const params = CreateCommentParams.safeParse({ postId: rawId });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.postId));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const body = CreateCommentBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [comment] = await db
    .insert(commentsTable)
    .values({ content: body.data.content, postId: params.data.postId, authorId: user.id })
    .returning();

  res.status(201).json(await enrichComment(comment, user));
});

router.patch("/comments/:id", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateCommentParams.safeParse({ id: rawId });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Comment not found" }); return; }
  if (existing.authorId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const body = UpdateCommentBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [comment] = await db
    .update(commentsTable)
    .set({ content: body.data.content })
    .where(eq(commentsTable.id, params.data.id))
    .returning();

  res.json(await enrichComment(comment, user));
});

router.delete("/comments/:id", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteCommentParams.safeParse({ id: rawId });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Comment not found" }); return; }
  if (existing.authorId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
