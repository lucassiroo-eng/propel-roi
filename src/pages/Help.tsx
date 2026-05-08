import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import AdminAnalytics from "@/components/settings/AdminAnalytics";

export default function Help() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  // Check if user is admin
  const { data: roles } = useQuery({
    queryKey: ["user_roles_check", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["strategy_admin", "super_admin"]);
      return (data ?? []).map((r) => r.role);
    },
    enabled: !!user,
  });

  const isAdmin = (roles?.length ?? 0) > 0;
  const isSuperAdmin = roles?.includes("super_admin") ?? false;

  const { data: docs, isLoading } = useQuery({
    queryKey: ["app_documentation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_documentation")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ slug, content }: { slug: string; content: string }) => {
      const doc = docs?.find((d) => d.slug === slug);
      if (!doc) throw new Error("Doc not found");

      // Save audit
      await supabase.from("reference_data_audit").insert({
        table_name: "app_documentation",
        row_id: slug,
        action: "update",
        before: { content_md: doc.content_md } as any,
        after: { content_md: content } as any,
        changed_by: user?.id,
      });

      const { error } = await supabase
        .from("app_documentation")
        .update({ content_md: content, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("slug", slug);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_documentation"] });
      setEditing(false);
      toast.success(t("toast.doc_updated"));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const selectedDoc = docs?.find((d) => d.slug === selectedSlug);

  // Group docs by category
  const categories = docs
    ? [...new Set(docs.map((d) => d.category))].map((cat) => ({
        category: cat,
        items: docs.filter((d) => d.category === cat),
      }))
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        {selectedDoc && (
          <Button variant="ghost" size="icon" onClick={() => { setSelectedSlug(null); setEditing(false); }}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="font-semibold text-foreground">
          {selectedDoc ? selectedDoc.title : t("help.title")}
        </h1>
        {selectedDoc && isAdmin && !editing && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => { setEditContent(selectedDoc.content_md); setEditing(true); }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {editing && (
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate({ slug: selectedSlug!, content: editContent })}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {!selectedDoc ? (
          /* Category Nav */
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat.category}>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {cat.category}
                </h2>
                <div className="space-y-2">
                  {cat.items.map((doc) => (
                    <button
                      key={doc.slug}
                      onClick={() => setSelectedSlug(doc.slug)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-lg border bg-card hover:border-primary/30 transition-colors",
                        "flex items-center justify-between"
                      )}
                    >
                      <span className="font-medium text-foreground text-sm">{doc.title}</span>
                      <Badge variant="outline" className="text-[10px]">{doc.audience}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-12">No documentation available yet.</p>
            )}
            {isSuperAdmin && (
              <div className="pt-6 border-t">
                <AdminAnalytics />
              </div>
            )}
          </div>
        ) : editing ? (
          /* Editor */
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder={t("help.write_markdown")}
            />
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Preview</h3>
              <div className="prose prose-sm max-w-none border rounded-lg p-4 bg-card">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          /* Markdown Render */
          <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-a:text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedDoc.content_md}</ReactMarkdown>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
