import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, postsTable, commentsTable, usersTable, tagsTable, postTagsTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/stats/dashboard", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const [{ totalPosts }] = await db
    .select({ totalPosts: sql<number>`cast(count(*) as integer)` })
    .from(postsTable)
    .where(eq(postsTable.authorId, user.id));

  const [{ publishedPosts }] = await db
    .select({ publishedPosts: sql<number>`cast(count(*) as integer)` })
    .from(postsTable)
    .where(eq(postsTable.authorId, user.id) && eq(postsTable.status, "published"));

  const [{ draftPosts }] = await db
    .select({ draftPosts: sql<number>`cast(count(*) as integer)` })
    .from(postsTable)
    .where(eq(postsTable.authorId, user.id) && eq(postsTable.status, "draft"));

  const authorPosts = await db
    .select({ id: postsTable.id })
    .from(postsTable)
    .where(eq(postsTable.authorId, user.id));

  const postIds = authorPosts.map((p) => p.id);

  let totalComments = 0;
  if (postIds.length > 0) {
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`cast(count(*) as integer)` })
      .from(commentsTable)
      .where(sql`${commentsTable.postId} = any(${JSON.stringify(postIds)}::int[])`);
    totalComments = cnt ?? 0;
  }

  const recentPosts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.authorId, user.id))
    .orderBy(desc(postsTable.updatedAt))
    .limit(5);

  const recentActivity = recentPosts.map((p) => ({
    type: p.status === "published" ? "post_published" : "post_created",
    description: p.status === "published"
      ? `Published: ${p.title}`
      : `Draft saved: ${p.title}`,
    postId: p.id,
    postTitle: p.title,
    createdAt: p.updatedAt.toISOString(),
  }));

  res.json({
    totalPosts: totalPosts ?? 0,
    publishedPosts: publishedPosts ?? 0,
    draftPosts: draftPosts ?? 0,
    totalComments,
    recentActivity,
  });
});

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const [{ totalPosts }] = await db
    .select({ totalPosts: sql<number>`cast(count(*) as integer)` })
    .from(postsTable)
    .where(eq(postsTable.status, "published"));

  const [{ totalAuthors }] = await db
    .select({ totalAuthors: sql<number>`cast(count(distinct ${postsTable.authorId}) as integer)` })
    .from(postsTable)
    .where(eq(postsTable.status, "published"));

  const [{ totalComments }] = await db
    .select({ totalComments: sql<number>`cast(count(*) as integer)` })
    .from(commentsTable);

  const topTags = await db
    .select({
      id: tagsTable.id,
      name: tagsTable.name,
      slug: tagsTable.slug,
      postCount: sql<number>`cast(count(${postTagsTable.postId}) as integer)`,
    })
    .from(tagsTable)
    .leftJoin(postTagsTable, eq(tagsTable.id, postTagsTable.tagId))
    .groupBy(tagsTable.id, tagsTable.name, tagsTable.slug)
    .orderBy(sql`count(${postTagsTable.postId}) desc`)
    .limit(10);

  res.json({
    totalPosts: totalPosts ?? 0,
    totalAuthors: totalAuthors ?? 0,
    totalComments: totalComments ?? 0,
    topTags: topTags.map((t) => ({ ...t, postCount: t.postCount ?? 0 })),
  });
});

export default router;
