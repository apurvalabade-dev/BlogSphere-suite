import { Router, type IRouter } from "express";
import { db, tagsTable, postTagsTable, postsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { ListTagsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tags", async (_req, res): Promise<void> => {
  const tags = await db
    .select({
      id: tagsTable.id,
      name: tagsTable.name,
      slug: tagsTable.slug,
      postCount: sql<number>`cast(count(${postTagsTable.postId}) as integer)`,
    })
    .from(tagsTable)
    .leftJoin(postTagsTable, eq(tagsTable.id, postTagsTable.tagId))
    .leftJoin(postsTable, eq(postTagsTable.postId, postsTable.id))
    .groupBy(tagsTable.id, tagsTable.name, tagsTable.slug)
    .orderBy(sql`count(${postTagsTable.postId}) desc`);

  res.json(ListTagsResponse.parse(tags.map(t => ({ ...t, postCount: t.postCount ?? 0 }))));
});

export default router;
