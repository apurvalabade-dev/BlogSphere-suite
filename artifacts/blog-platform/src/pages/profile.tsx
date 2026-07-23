import { useState, useEffect, useRef } from "react";
import { useGetMyProfile, useUpdateMyProfile, useListMyPosts } from "@workspace/api-client-react";
import { getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, User, FileText, Settings, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function ProfilePage() {
  const { data: profile, isLoading, refetch } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey() }
  });
  
  const { data: posts, isLoading: isLoadingPosts } = useListMyPosts(
    { status: "published", limit: 5 },
    { query: { queryKey: ["/api/posts/my", "published", "recent"] } }
  );

  const updateProfile = useUpdateMyProfile();
  const updateMutateRef = useRef(updateProfile.mutate);
  updateMutateRef.current = updateProfile.mutate;

  const { toast } = useToast();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (profile && !initialized.current) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
      initialized.current = true;
    }
  }, [profile]);

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    
    updateMutateRef.current(
      { data: { name, bio, avatarUrl } },
      {
        onSuccess: () => {
          toast({ title: "Profile updated successfully" });
          refetch();
        },
        onError: () => {
          toast({ title: "Failed to update profile", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl min-h-screen">
      <h1 className="text-3xl font-serif font-bold mb-8 text-foreground">Author Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm border-border/50 sticky top-24">
            <CardContent className="pt-8 flex flex-col items-center text-center">
              <Avatar className="h-32 w-32 mb-6 border-4 border-background shadow-md">
                <AvatarImage src={avatarUrl || profile?.avatarUrl || undefined} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                  {name ? name.substring(0, 2).toUpperCase() : <User className="w-12 h-12" />}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-1">{name || profile?.name}</h2>
              <p className="text-muted-foreground text-sm mb-4">{profile?.email}</p>
              
              <div className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/30 py-2 rounded-lg">
                <Calendar className="w-4 h-4" /> 
                Joined {profile?.createdAt ? format(new Date(profile.createdAt), 'MMMM yyyy') : 'Unknown'}
              </div>
              
              <p className="text-sm text-foreground/80 leading-relaxed text-left w-full whitespace-pre-wrap">
                {bio || profile?.bio || "No bio written yet."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form & Recent Activity */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-muted-foreground" /> 
                Profile Settings
              </CardTitle>
              <CardDescription>Update your public author identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input 
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your public name"
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input 
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Author Bio</Label>
                <Textarea 
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell readers about yourself and your writing..."
                  className="min-h-[120px] resize-y bg-background"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {bio.length} characters
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-border/40 pt-6">
              <Button 
                onClick={handleSave} 
                disabled={updateProfile.isPending}
                className="gap-2 rounded-full px-6"
              >
                <Save className="w-4 h-4" /> 
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" /> 
                Recent Published Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : posts?.posts?.length ? (
                <div className="divide-y divide-border/40">
                  {posts.posts.map(post => (
                    <div key={post.id} className="py-4 first:pt-0 last:pb-0">
                      <Link href={`/blog/${post.slug}`}>
                        <h3 className="font-semibold text-lg hover:text-primary transition-colors mb-1 line-clamp-1">
                          {post.title}
                        </h3>
                      </Link>
                      <div className="text-xs text-muted-foreground flex gap-3">
                        <span>{format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy')}</span>
                        {post.readingTimeMinutes && <span>{post.readingTimeMinutes} min read</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No published works yet.
                  <div className="mt-4">
                    <Button asChild variant="outline" size="sm" className="rounded-full">
                      <Link href="/posts/new">Write something</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            {posts?.posts && posts.posts.length > 0 && (
              <CardFooter className="border-t border-border/40 pt-4">
                <Button asChild variant="ghost" className="w-full text-muted-foreground">
                  <Link href="/dashboard">View all in Dashboard</Link>
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
