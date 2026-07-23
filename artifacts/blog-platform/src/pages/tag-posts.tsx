import { useParams, Link } from "wouter";
import { useListPosts } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Hash, ChevronRight } from "lucide-react";

export default function TagPostsPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: postData, isLoading } = useListPosts(
    { tag: slug, limit: 20 },
    { query: { enabled: !!slug, queryKey: slug ? ["/api/posts", "tag", slug] : [""] } }
  );

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl min-h-screen">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-6">
          <Hash className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
          {slug?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </h1>
        <p className="text-muted-foreground text-lg">
          Stories and ideas exploring this topic.
        </p>
      </div>

      <div className="space-y-12">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-8 pb-12 border-b border-border/40 last:border-0">
              <Skeleton className="w-full sm:w-1/3 aspect-[4/3] rounded-lg" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))
        ) : postData?.posts?.length ? (
          postData.posts.map(post => (
            <article key={post.id} className="group flex flex-col sm:flex-row gap-8 pb-12 border-b border-border/40 last:border-0">
              {post.coverImageUrl && (
                <Link href={`/blog/${post.slug}`} className="w-full sm:w-1/3 shrink-0 overflow-hidden rounded-lg block">
                  <img 
                    src={post.coverImageUrl} 
                    alt={post.title} 
                    className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
              )}
              <div className="flex flex-col justify-center flex-1">
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  <span className="font-medium text-foreground">{post.authorName}</span>
                  <span>•</span>
                  <time dateTime={post.publishedAt || post.createdAt}>
                    {format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy')}
                  </time>
                </div>
                
                <Link href={`/blog/${post.slug}`}>
                  <h3 className="text-2xl font-serif font-bold text-foreground group-hover:text-primary transition-colors leading-tight mb-4">
                    {post.title}
                  </h3>
                </Link>
                
                <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                  {post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...'}
                </p>
                
                <div className="flex items-center gap-4 mt-auto">
                  <div className="flex flex-wrap gap-2">
                    {post.tags?.filter(t => t.slug !== slug).slice(0, 2).map((tag) => (
                      <Link key={tag.id} href={`/tags/${tag.slug}`}>
                        <Badge variant="secondary" className="hover:bg-secondary/80 font-normal bg-muted/50 transition-colors">
                          {tag.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                  <Link href={`/blog/${post.slug}`} className="ml-auto text-primary text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read Story <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border/50">
            <h3 className="text-xl font-serif mb-2">No stories found</h3>
            <p className="text-muted-foreground mb-6">There are no published stories with this tag yet.</p>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/search">Explore other topics</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
