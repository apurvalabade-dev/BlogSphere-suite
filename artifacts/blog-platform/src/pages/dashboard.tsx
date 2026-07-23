import { useGetDashboardStats, useListMyPosts, useUpdatePost, useDeletePost } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { FileText, MessageSquare, Eye, Edit3, MoreVertical, Trash, Send, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DashboardPage() {
  const { data: stats, isLoading: isLoadingStats } = useGetDashboardStats();
  const { data: allPosts, isLoading: isLoadingPosts, refetch: refetchPosts } = useListMyPosts();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [postToDelete, setPostToDelete] = useState<number | null>(null);

  const handlePublishToggle = (id: number, currentStatus: string) => {
    updatePost.mutate(
      { id, data: { status: currentStatus === 'draft' ? 'published' : 'draft' as any } },
      {
        onSuccess: () => {
          refetchPosts();
          toast({
            title: currentStatus === 'draft' ? "Post published" : "Post moved to drafts",
            description: "The post status has been updated.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update post status.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleDelete = () => {
    if (!postToDelete) return;
    deletePost.mutate(
      { id: postToDelete },
      {
        onSuccess: () => {
          setPostToDelete(null);
          refetchPosts();
          toast({
            title: "Post deleted",
            description: "The post has been permanently removed.",
          });
        },
        onError: () => {
          setPostToDelete(null);
          toast({
            title: "Error",
            description: "Failed to delete post.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your writing and track your audience.</p>
        </div>
        <Button asChild className="gap-2 rounded-full">
          <Link href="/posts/new">
            <Edit3 className="w-4 h-4" /> New Story
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{stats?.publishedPosts || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Edit3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{stats?.draftPosts || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{stats?.totalComments || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-serif font-bold">Your Stories</h2>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
              </TabsList>
            </div>
            
            {["all", "published", "drafts"].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-0">
                <Card className="shadow-sm">
                  <CardContent className="p-0 divide-y divide-border/50">
                    {isLoadingPosts ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4 flex gap-4">
                          <Skeleton className="h-16 w-24 rounded-md" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/4" />
                          </div>
                        </div>
                      ))
                    ) : allPosts?.posts?.length ? (
                      allPosts.posts
                        .filter(p => tab === "all" || (tab === "published" && p.status === "published") || (tab === "drafts" && p.status === "draft"))
                        .map(post => (
                        <div key={post.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-muted/20 transition-colors">
                          <div className="flex-1 min-w-0 w-full">
                            <Link href={post.status === 'published' ? `/blog/${post.slug}` : `/posts/${post.id}/edit`}>
                              <h3 className="font-semibold text-lg truncate hover:text-primary transition-colors cursor-pointer">
                                {post.title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <Badge variant={post.status === "published" ? "default" : "secondary"} className="font-normal uppercase text-[10px] px-2 py-0">
                                {post.status}
                              </Badge>
                              <span>•</span>
                              <span>{format(new Date(post.updatedAt), 'MMM d, yyyy')}</span>
                              {post.status === 'published' && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> {post.commentCount || 0}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end mt-2 sm:mt-0">
                            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                              <Link href={`/posts/${post.id}/edit`}>Edit</Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setLocation(`/posts/${post.id}/edit`)}>
                                  <Edit3 className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                {post.status === 'published' && (
                                  <DropdownMenuItem onClick={() => setLocation(`/blog/${post.slug}`)}>
                                    <Eye className="w-4 h-4 mr-2" /> View
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePublishToggle(post.id, post.status)}>
                                  {post.status === 'draft' ? (
                                    <><Send className="w-4 h-4 mr-2" /> Publish</>
                                  ) : (
                                    <><FileText className="w-4 h-4 mr-2" /> Unpublish</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setPostToDelete(post.id)}>
                                  <Trash className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                        <FileText className="w-10 h-10 mb-3 text-muted/50" />
                        <p>No stories found.</p>
                        {tab === "all" && (
                          <Button variant="link" asChild className="mt-2 text-primary">
                            <Link href="/posts/new">Write your first story</Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div>
          <Card className="shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentActivity?.length ? (
                <div className="space-y-6">
                  {stats.recentActivity.map((activity, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="mt-0.5 shrink-0 bg-muted rounded-full p-1.5 h-8 w-8 flex items-center justify-center">
                        {activity.type === 'post_published' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                         activity.type === 'comment_received' ? <MessageSquare className="w-4 h-4 text-blue-500" /> :
                         <FileText className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div>
                        <p className="text-foreground">{activity.description}</p>
                        <time className="text-xs text-muted-foreground block mt-1">
                          {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No recent activity.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your story and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePost.isPending ? "Deleting..." : "Delete Story"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
