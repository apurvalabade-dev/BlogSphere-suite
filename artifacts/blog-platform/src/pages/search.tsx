import { useState, useEffect } from "react";
import { useListPosts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Search as SearchIcon, FileText, ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

// Custom debounce hook since it wasn't provided
function useDebounceHook<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounceHook(searchQuery, 500);
  
  const { data: postData, isLoading } = useListPosts(
    { search: debouncedSearch || undefined, limit: 20 },
    { query: { queryKey: ["/api/posts", "search", debouncedSearch || ""] } }
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif font-bold mb-6">Explore Ideas</h1>
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, topic, or keyword..."
            className="pl-12 h-14 text-lg rounded-full bg-background border-border/60 shadow-sm focus-visible:ring-primary/20"
          />
        </div>
      </div>

      <div className="space-y-8 mt-12">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-6 p-4 rounded-xl border border-transparent">
              <Skeleton className="w-full sm:w-48 aspect-video rounded-lg" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))
        ) : postData?.posts?.length ? (
          postData.posts.map(post => (
            <article key={post.id} className="group flex flex-col sm:flex-row gap-6 p-4 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/20 transition-all">
              {post.coverImageUrl && (
                <Link href={`/blog/${post.slug}`} className="w-full sm:w-48 shrink-0 overflow-hidden rounded-lg block aspect-video sm:aspect-square object-cover">
                  <img 
                    src={post.coverImageUrl} 
                    alt={post.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
              )}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="font-medium text-foreground">{post.authorName}</span>
                  <span>•</span>
                  <time>{format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy')}</time>
                </div>
                
                <Link href={`/blog/${post.slug}`}>
                  <h3 className="text-xl font-serif font-bold text-foreground group-hover:text-primary transition-colors leading-tight mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                </Link>
                
                <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                  {post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 150)}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-wrap gap-2">
                    {post.tags?.slice(0, 3).map(tag => (
                      <Link key={tag.id} href={`/tags/${tag.slug}`}>
                        <Badge variant="secondary" className="text-xs bg-background border border-border/50 hover:bg-muted font-normal">
                          {tag.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                  <Link href={`/blog/${post.slug}`} className="text-primary text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="text-center py-20 px-4">
            <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-serif font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground">Try adjusting your search terms or explore our featured posts.</p>
            <Button asChild variant="outline" className="mt-6 rounded-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
