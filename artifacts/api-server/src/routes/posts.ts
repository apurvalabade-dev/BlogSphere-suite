import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, ilike, sql, desc, inArray } from "drizzle-orm";
import { db, postsTable, usersTable, tagsTable, postTagsTable, commentsTable } from "@workspace/db";
import {
  ListPostsQueryParams,
  ListMyPostsQueryParams,
  CreatePostBody,
  UpdatePostBody,
  UpdatePostParams,
  DeletePostParams,
  GetPostParams,
  PublishPostParams,
  PublishPostBody,
  GetPostBySlugParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

function readingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

async function getOrCreateTags(tagNames: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of tagNames) {
    const slug = slugify(name);
    let [tag] = await db.select().from(tagsTable).where(eq(tagsTable.slug, slug));
    if (!tag) {
      [tag] = await db.insert(tagsTable).values({ name, slug }).returning();
    }
    ids.push(tag.id);
  }
  return ids;
}

async function enrichPost(post: any, authorUser: any) {
  const tags = await db
    .select({ id: tagsTable.id, name: tagsTable.name, slug: tagsTable.slug })
    .from(postTagsTable)
    .innerJoin(tagsTable, eq(postTagsTable.tagId, tagsTable.id))
    .where(eq(postTagsTable.postId, post.id));

  const [{ commentCount }] = await db
    .select({ commentCount: sql<number>`cast(count(*) as integer)` })
    .from(commentsTable)
    .where(eq(commentsTable.postId, post.id));

  return {
    ...post,
    excerpt: post.excerpt ?? null,
    coverImageUrl: post.coverImageUrl ?? null,
    metaTitle: post.metaTitle ?? null,
    metaDescription: post.metaDescription ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    authorName: authorUser?.name ?? "Unknown",
    authorAvatarUrl: authorUser?.avatarUrl ?? null,
    tags: tags.map(t => ({ ...t, postCount: 0 })),
    commentCount: commentCount ?? 0,
    readingTimeMinutes: readingTime(post.content),
  };
}

router.get("/posts", async (req, res): Promise<void> => {
  const parsed = ListPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, tag, authorId, page = 1, limit = 12 } = parsed.data;
  const offset = (page - 1) * limit;

  let query = db
    .selectDistinct({
      id: postsTable.id,
      title: postsTable.title,
      slug: postsTable.slug,
      content: postsTable.content,
      excerpt: postsTable.excerpt,
      coverImageUrl: postsTable.coverImageUrl,
      status: postsTable.status,
      authorId: postsTable.authorId,
      metaTitle: postsTable.metaTitle,
      metaDescription: postsTable.metaDescription,
      publishedAt: postsTable.publishedAt,
      createdAt: postsTable.createdAt,
      updatedAt: postsTable.updatedAt,
    })
    .from(postsTable)
    .leftJoin(postTagsTable, eq(postsTable.id, postTagsTable.postId))
    .leftJoin(tagsTable, eq(postTagsTable.tagId, tagsTable.id))
    .where(
      and(
        eq(postsTable.status, "published"),
        search ? ilike(postsTable.title, `%${search}%`) : undefined,
        tag ? eq(tagsTable.slug, tag) : undefined,
        authorId ? eq(postsTable.authorId, parseInt(authorId as string)) : undefined,
      ),
    )
    .orderBy(desc(postsTable.publishedAt))
    .limit(limit)
    .offset(offset) as any;

  const posts = await query;

  const authorIds = [...new Set(posts.map((p: any) => p.authorId))];
  const authors = authorIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds as number[]))
    : [];
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a]));

  const enriched = await Promise.all(posts.map((p: any) => enrichPost(p, authorMap[p.authorId])));

  const [{ total }] = await db
    .select({ total: sql<number>`cast(count(distinct ${postsTable.id}) as integer)` })
    .from(postsTable)
    .leftJoin(postTagsTable, eq(postsTable.id, postTagsTable.postId))
    .leftJoin(tagsTable, eq(postTagsTable.tagId, tagsTable.id))
    .where(
      and(
        eq(postsTable.status, "published"),
        search ? ilike(postsTable.title, `%${search}%`) : undefined,
        tag ? eq(tagsTable.slug, tag) : undefined,
        authorId ? eq(postsTable.authorId, parseInt(authorId as string)) : undefined,
      ),
    );

  res.json({ posts: enriched, total: total ?? 0, page, limit });
});

router.get("/posts/featured", async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.status, "published"))
    .orderBy(desc(postsTable.publishedAt))
    .limit(6);

  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const authors = authorIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a]));

  const enriched = await Promise.all(posts.map((p) => enrichPost(p, authorMap[p.authorId])));
  res.json(enriched);
});

router.get("/posts/my", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const parsed = ListMyPostsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { status, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(postsTable.authorId, user.id),
    ...(status ? [eq(postsTable.status, status as "draft" | "published")] : []),
  ];

  const posts = await db
    .select()
    .from(postsTable)
    .where(and(...conditions))
    .orderBy(desc(postsTable.updatedAt))
    .limit(limit)
    .offset(offset);

  const enriched = await Promise.all(posts.map((p) => enrichPost(p, user)));

  const [{ total }] = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(postsTable)
    .where(and(...conditions));

  res.json({ posts: enriched, total: total ?? 0, page, limit });
});

router.get("/posts/slug/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const parsed = GetPostBySlugParams.safeParse({ slug: raw });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.slug, parsed.data.slug));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId));
  res.json(await enrichPost(post, author));
});

router.get("/posts/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetPostParams.safeParse({ id: rawId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, parsed.data.id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId));
  res.json(await enrichPost(post, author));
});

router.post("/posts", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { tagNames, ...postData } = parsed.data;
  const baseSlug = slugify(postData.title);
  const uniqueSlug = `${baseSlug}-${Date.now()}`;

  const [post] = await db
    .insert(postsTable)
    .values({
      ...postData,
      slug: uniqueSlug,
      authorId: user.id,
      publishedAt: postData.status === "published" ? new Date() : null,
    })
    .returning();

  if (tagNames && tagNames.length > 0) {
    const tagIds = await getOrCreateTags(tagNames);
    await db.insert(postTagsTable).values(tagIds.map((tagId) => ({ postId: post.id, tagId })));
  }

  res.status(201).json(await enrichPost(post, user));
});

router.patch("/posts/:id", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePostParams.safeParse({ id: rawId });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Post not found" }); return; }
  if (existing.authorId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const parsed = UpdatePostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { tagNames, ...updateData } = parsed.data;
  const [post] = await db
    .update(postsTable)
    .set(updateData)
    .where(eq(postsTable.id, params.data.id))
    .returning();

  if (tagNames !== undefined) {
    await db.delete(postTagsTable).where(eq(postTagsTable.postId, post.id));
    if (tagNames.length > 0) {
      const tagIds = await getOrCreateTags(tagNames);
      await db.insert(postTagsTable).values(tagIds.map((tagId) => ({ postId: post.id, tagId })));
    }
  }

  res.json(await enrichPost(post, user));
});

router.delete("/posts/:id", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePostParams.safeParse({ id: rawId });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [existing] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Post not found" }); return; }
  if (existing.authorId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/posts/:id/publish", requireAuth, async (req: any, res): Promise<void> => {
  const clerkId: string = req.clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = PublishPostParams.safeParse({ id: rawId });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = PublishPostBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [existing] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Post not found" }); return; }
  if (existing.authorId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [post] = await db
    .update(postsTable)
    .set({
      status: body.data.published ? "published" : "draft",
      publishedAt: body.data.published ? (existing.publishedAt ?? new Date()) : null,
    })
    .where(eq(postsTable.id, params.data.id))
    .returning();

  res.json(await enrichPost(post, user));
});

export default router;
