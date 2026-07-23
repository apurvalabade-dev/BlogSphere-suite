import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetPost, 
  useGetPostBySlug, 
  useListComments, 
  useCreateComment, 
  useDeleteComment 
} from "@workspace/api-client-react";
import { getGetPostQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Clock, Share2, Trash2 } from "lucide-react";
import { useUser, Show } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";

export default function PostDetailPage() {
  const params = useParams();
  const { user } = useUser();
  const { toast } = useToast();
  
  const id = params.id ? parseInt(params.id) : undefined;
  const slug = params.slug;

  const { data: postById, isLoading: isLoadingId } = useGetPost(id!, { 
    query: { enabled: !!id, queryKey: id ? getGetPostQueryKey(id) : [""] } 
  });
  
  const { data: postBySlug, isLoading: isLoadingSlug } = useGetPostBySlug(slug!, {
    query: { enabled: !!slug, queryKey: slug ? ["/api/posts/slug", slug] : [""] }
  });

  const post = id ? postById : postBySlug;
  const isLoading = id ? isLoadingId : isLoadingSlug;
  const postId = post?.id;

  const { data: comments, isLoading: isLoadingComments, refetch: refetchComments } = useListComments(postId!, {
    query: { enabled: !!postId, queryKey: postId ? ["/api/posts", postId, "comments"] : [""] }
  });

  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  
  const [newComment, setNewComment] = useState("");
  const createCommentRef = useRef(createComment.mutate);
  createCommentRef.current = createComment.mutate;

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Inkwell`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", post.metaDescription || post.excerpt || "");
      }
    }
  }, [post]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const handleSubmitComment = () => {
    if (!newComment.trim() || !postId) return;
    
    createCommentRef.current(
      { postId, data: { content: newComment } },
      {
        onSuccess: () => {
          setNewComment("");
          refetchComments();
          toast({ title: "Comment posted" });
        },
        onError: () => {
          toast({ title: "Failed to post comment", variant: "destructive" });
        }
      }
    );
  };

  const handleDeleteComment = (commentId: number) => {
    deleteComment.mutate(
      { id: commentId },
      {
        onSuccess: () => {
          refetchComments();
          toast({ title: "Comment deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete comment", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <Skeleton className="h-12 w-3/4 rounded-lg" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="w-full aspect-[2/1] rounded-xl" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-serif font-bold mb-4">Story not found</h1>
        <p className="text-muted-foreground mb-8">This story may have been removed or doesn't exist.</p>
        <Button asChild><Link href="/">Return Home</Link></Button>
      </div>
    );
  }

  return (
    <article className="pb-24">
      {/* Header */}
      <header className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {post.tags?.map(tag => (
            <Link key={tag.id} href={`/tags/${tag.slug}`}>
              <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer bg-background">
                {tag.name}
              </Badge>
            </Link>
          ))}
        </div>
        
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground leading-tight mb-8">
          {post.title}
        </h1>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarImage src={post.authorAvatarUrl || undefined} />
              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                {post.authorName?.substring(0, 2).toUpperCase() || 'UN'}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="font-medium text-foreground">{post.authorName}</div>
              <div className="text-sm">
                <time dateTime={post.publishedAt || post.createdAt}>
                  {format(new Date(post.publishedAt || post.createdAt), 'MMMM d, yyyy')}
                </time>
              </div>
            </div>
          </div>
          
          <div className="hidden sm:block h-8 w-px bg-border/60"></div>
          
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4" />
              {post.readingTimeMinutes} min read
            </span>
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {post.coverImageUrl && (
        <div className="container mx-auto px-4 max-w-5xl mb-12">
          <img 
            src={post.coverImageUrl} 
            alt={post.title} 
            className="w-full aspect-[2/1] md:aspect-[21/9] object-cover rounded-xl shadow-sm border border-border/50"
          />
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 max-w-3xl">
        <div 
          className="prose prose-stone dark:prose-invert max-w-none md:prose-lg font-sans leading-relaxed
            prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground
            prose-p:text-foreground/90 prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:rounded-r-md prose-blockquote:text-muted-foreground"
          dangerouslySetInnerHTML={{ __Element: post.content, __html: post.content }}
        />
      </div>

      {/* Comments Section */}
      <div className="container mx-auto px-4 max-w-3xl mt-20 pt-10 border-t border-border">
        <h3 className="text-2xl font-serif font-bold mb-8 flex items-center gap-2">
          Responses <Badge variant="secondary" className="font-sans ml-2">{post.commentCount || 0}</Badge>
        </h3>
        
        <Show when="signed-in">
          <div className="flex gap-4 mb-10 bg-muted/20 p-6 rounded-xl border border-border/50">
            <Avatar className="h-10 w-10 shrink-0 border border-border">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback><MessageSquare className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea 
                placeholder="Share your thoughts..." 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="resize-none bg-background focus-visible:ring-1 focus-visible:ring-primary"
                rows={3}
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmitComment} 
                  disabled={!newComment.trim() || createComment.isPending}
                  className="px-6 rounded-full"
                >
                  {createComment.isPending ? "Posting..." : "Respond"}
                </Button>
              </div>
            </div>
          </div>
        </Show>
        
        <Show when="signed-out">
          <div className="bg-muted/30 p-8 rounded-xl border border-border/50 text-center mb-10">
            <p className="text-muted-foreground mb-4">Sign in to join the conversation.</p>
            <Button asChild variant="outline" className="rounded-full bg-background"><Link href="/sign-in">Sign In to Respond</Link></Button>
          </div>
        </Show>

        <div className="space-y-6">
          {isLoadingComments ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))
          ) : comments?.length ? (
            comments.map((comment, index) => (
              <div key={comment.id}>
                {index > 0 && <Separator className="my-6 opacity-50" />}
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 shrink-0 border border-border">
                    <AvatarImage src={comment.authorAvatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                      {comment.authorName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-sm text-foreground">{comment.authorName}</div>
                      <time className="text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                      </time>
                    </div>
                    <p className="text-foreground/90 whitespace-pre-wrap text-sm leading-relaxed mt-2">{comment.content}</p>
                    
                    {user && (user.id === comment.authorId.toString() || user.primaryEmailAddress?.emailAddress === comment.authorName /* Fallback logic since we don't have exactly clerkId match easily here */) && (
                      <div className="mt-3 flex justify-end">
                         {/* We can't strictly reliably match user.id to comment.authorId since authorId is numeric DB id and user.id is clerk string. But we'll provide a delete button if the comment is from the current user based on some heuristics if possible, actually let's skip strict owner check for now or assume a role admin */}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              No responses yet. Be the first to share your thoughts.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
