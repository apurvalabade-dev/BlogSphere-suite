import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useGetPost, useCreatePost, useUpdatePost } from "@workspace/api-client-react";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Image as ImageIcon, Save, Send, Settings, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function PostEditorPage() {
  const params = useParams();
  const isNew = !params.id || params.id === "new";
  const postId = !isNew ? parseInt(params.id!) : undefined;
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: post, isLoading: isLoadingPost } = useGetPost(postId as number, { 
    query: { 
      enabled: !!postId, 
      queryKey: postId ? ["/api/posts", postId.toString()] : [""] 
    } 
  });

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  
  const createMutateRef = useRef(createPost.mutate);
  createMutateRef.current = createPost.mutate;
  
  const updateMutateRef = useRef(updatePost.mutate);
  updateMutateRef.current = updatePost.mutate;

  const initializedForId = useRef<number | string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  useEffect(() => {
    if (isNew) {
      if (initializedForId.current !== "new") {
        setTitle("");
        setContent("");
        setExcerpt("");
        setCoverImageUrl("");
        setTags([]);
        setMetaTitle("");
        setMetaDescription("");
        initializedForId.current = "new";
      }
    } else if (post && initializedForId.current !== postId) {
      setTitle(post.title || "");
      setContent(post.content || "");
      setExcerpt(post.excerpt || "");
      setCoverImageUrl(post.coverImageUrl || "");
      setTags(post.tags?.map(t => t.name) || []);
      setMetaTitle(post.metaTitle || "");
      setMetaDescription(post.metaDescription || "");
      initializedForId.current = postId as number;
    }
  }, [isNew, post, postId]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = (publish: boolean) => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!content.trim() || content === '<p></p>') {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }

    const payload = {
      title,
      content,
      excerpt: excerpt || undefined,
      coverImageUrl: coverImageUrl || undefined,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      tagNames: tags,
      status: (publish ? "published" : "draft") as "published" | "draft"
    };

    if (isNew) {
      createMutateRef.current({ data: payload }, {
        onSuccess: (newPost) => {
          toast({ title: publish ? "Post published!" : "Draft saved" });
          setLocation(`/posts/${newPost.id}/edit`);
        },
        onError: () => {
          toast({ title: "Failed to save post", variant: "destructive" });
        }
      });
    } else {
      updateMutateRef.current({ id: postId!, data: payload }, {
        onSuccess: () => {
          toast({ title: publish ? "Post published!" : "Changes saved" });
          if (publish && post?.slug) {
            setLocation(`/blog/${post.slug}`);
          }
        },
        onError: () => {
          toast({ title: "Failed to update post", variant: "destructive" });
        }
      });
    }
  };

  if (!isNew && isLoadingPost) {
    return <div className="p-12 text-center text-muted-foreground">Loading editor...</div>;
  }

  const isSaving = createPost.isPending || updatePost.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground" onClick={() => setLocation('/dashboard')}>
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle className="font-serif">Post Settings</SheetTitle>
                <SheetDescription>Configure metadata and cover image.</SheetDescription>
              </SheetHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Cover Image URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={coverImageUrl} 
                      onChange={e => setCoverImageUrl(e.target.value)} 
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  {coverImageUrl && (
                    <div className="mt-2 relative rounded-md overflow-hidden bg-muted aspect-video border border-border">
                      <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Excerpt</Label>
                  <Textarea 
                    value={excerpt} 
                    onChange={e => setExcerpt(e.target.value)} 
                    placeholder="A brief summary of your post..."
                    className="resize-none h-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1 font-normal">
                        {tag}
                        <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                  <Input 
                    value={tagInput} 
                    onChange={e => setTagInput(e.target.value)} 
                    onKeyDown={handleAddTag}
                    placeholder="Add tags (press Enter or comma)"
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-4 text-sm uppercase tracking-wider text-muted-foreground">SEO</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Meta Title</Label>
                      <Input 
                        value={metaTitle} 
                        onChange={e => setMetaTitle(e.target.value)} 
                        placeholder={title || "Title for search engines"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meta Description</Label>
                      <Textarea 
                        value={metaDescription} 
                        onChange={e => setMetaDescription(e.target.value)} 
                        placeholder={excerpt || "Description for search engines"}
                        className="resize-none h-24"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <Button variant="outline" className="gap-2" onClick={() => handleSave(false)} disabled={isSaving}>
            <Save className="w-4 h-4" /> Save Draft
          </Button>
          <Button className="gap-2" onClick={() => handleSave(true)} disabled={isSaving}>
            <Send className="w-4 h-4" /> Publish
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New Story Title"
          className="w-full text-4xl md:text-5xl font-serif font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 text-foreground py-2"
        />
        
        <TipTapEditor 
          content={content} 
          onChange={setContent} 
        />
      </div>
    </div>
  );
}
