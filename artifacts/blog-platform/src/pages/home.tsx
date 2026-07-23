import { useGetFeaturedPosts, useGetPlatformStats, useListTags } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PenTool, Users, MessageSquare } from "lucide-react";

export default function HomePage() {
  const { data: featuredPosts, isLoading: isLoadingPosts } = useGetFeaturedPosts();
  const { data: stats, isLoading: isLoadingStats } = useGetPlatformStats();
  const { data: tags, isLoading: isLoadingTags } = useListTags();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background border-b border-border/40 pt-20 pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-6 rounded-full px-4 py-1 text-sm font-medium bg-background border-primary/20 text-primary">
            A sanctuary for considered writing
          </Badge>
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-foreground max-w-4xl leading-tight mb-6">
            Where ideas take <span className="text-primary italic">root</span> and stories flourish.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Inkwell is a premium digital magazine and personal notebook. Discover brilliant writing from thoughtful minds, or start crafting your own.
          </p>
          <div className="flex items-center gap-4">
            <Button size="lg" asChild className="rounded-full px-8 font-semibold text-md h-12">
              <Link href="/sign-up">Start Writing</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full px-8 font-semibold text-md h-12 bg-background">
              <Link href="/search">Explore Stories</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/20 border-b border-border/40">
        <div className="container mx-auto px-4">
          {isLoadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="flex flex-col items-center justify-center p-6 bg-background rounded-xl border border-border/50 shadow-sm">
                <PenTool className="w-6 h-6 text-primary mb-3" />
                <div className="text-3xl font-serif font-bold">{stats.totalPosts.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Published Works</div>
              </div>
              <div className="flex flex-col items-center justify-center p-6 bg-background rounded-xl border border-border/50 shadow-sm">
                <Users className="w-6 h-6 text-primary mb-3" />
                <div className="text-3xl font-serif font-bold">{stats.totalAuthors.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Thoughtful Writers</div>
              </div>
              <div className="flex flex-col items-center justify-center p-6 bg-background rounded-xl border border-border/50 shadow-sm">
                <MessageSquare className="w-6 h-6 text-primary mb-3" />
                <div className="text-3xl font-serif font-bold">{stats.totalComments.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">Conversations</div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Featured Posts & Tags */}
      <section className="py-20 container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-2/3">
            <h2 className="text-3xl font-serif font-bold mb-10 flex items-center gap-3">
              <span className="w-8 h-px bg-primary inline-block"></span>
              Featured Writing
            </h2>
            
            <div className="space-y-12">
              {isLoadingPosts ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-6">
                    <Skeleton className="w-full sm:w-1/3 aspect-[4/3] rounded-lg" />
                    <div className="flex-1 space-y-4 py-2">
                      <Skeleton className="h-8 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))
              ) : featuredPosts?.length ? (
                featuredPosts.map((post) => (
                  <article key={post.id} className="group flex flex-col sm:flex-row gap-6 md:gap-10">
                    {post.coverImageUrl && (
                      <Link href={`/blog/${post.slug}`} className="w-full sm:w-1/3 md:w-[280px] shrink-0 overflow-hidden rounded-lg block">
                        <img 
                          src={post.coverImageUrl} 
                          alt={post.title} 
                          className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </Link>
                    )}
                    <div className="flex flex-col justify-center flex-1">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border border-border/50">
                            <AvatarImage src={post.authorAvatarUrl || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {post.authorName?.substring(0, 2).toUpperCase() || 'UN'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{post.authorName}</span>
                        </div>
                        <span>•</span>
                        <time dateTime={post.publishedAt || post.createdAt}>
                          {format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy')}
                        </time>
                      </div>
                      
                      <Link href={`/blog/${post.slug}`}>
                        <h3 className="text-2xl font-serif font-bold text-foreground group-hover:text-primary transition-colors leading-tight mb-3">
                          {post.title}
                        </h3>
                      </Link>
                      
                      <p className="text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                        {post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...'}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-auto">
                        <div className="flex flex-wrap gap-2">
                          {post.tags?.slice(0, 2).map((tag) => (
                            <Link key={tag.id} href={`/tags/${tag.slug}`}>
                              <Badge variant="secondary" className="hover:bg-secondary/80 font-normal bg-muted/50 transition-colors">
                                {tag.name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                        {post.readingTimeMinutes && (
                          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                            {post.readingTimeMinutes} min read
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                  No featured posts yet.
                </div>
              )}
            </div>
          </div>
          
          <aside className="lg:w-1/3">
            <Card className="sticky top-24 border-border/50 shadow-sm bg-background/50 backdrop-blur-sm">
              <CardContent className="p-6 md:p-8">
                <h3 className="text-lg font-serif font-bold mb-6">Discover Topics</h3>
                
                {isLoadingTags ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-16 md:w-24 rounded-full" />
                    ))}
                  </div>
                ) : tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Link key={tag.id} href={`/tags/${tag.slug}`}>
                        <Badge 
                          variant="outline" 
                          className="rounded-full px-3 py-1.5 text-sm font-normal hover:border-primary hover:text-primary transition-colors bg-background"
                        >
                          {tag.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No topics found.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}
