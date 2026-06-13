import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MessageCircleWarning, ExternalLink, Check, Clock, ChevronDown, ChevronRight } from "lucide-react";

function emailToShortName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(".");
  if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " + parts[1].charAt(0).toUpperCase() + ".";
  return local;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffM = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function AdminFeedback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);

  const { data: reports = [] } = useQuery({
    queryKey: ["admin_feedback"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feedback_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("feedback_reports").update({ status: "resolved" }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_feedback"] }),
  });

  const pending = reports.filter((r: any) => r.status === "pending");
  const resolved = reports.filter((r: any) => r.status === "resolved");

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <MessageCircleWarning className="h-4 w-4 text-amber-500" />
          <span className="text-[11px] font-semibold text-foreground">Feedback</span>
          {pending.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-bold min-w-[18px]">
              {pending.length}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-border/30">
          {reports.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No feedback yet</p>
          ) : (
            reports.map((r: any) => (
              <div key={r.id} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">{emailToShortName(r.user_email)}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                      {r.page && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r.page}{r.step != null ? ` · step ${r.step}` : ""}</span>}
                      {r.status === "resolved" ? (
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5"><Check className="h-3 w-3" /> resolved</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5"><Clock className="h-3 w-3" /> pending</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{r.message}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {r.session_id && (
                      <button
                        onClick={() => navigate(`/co-creation?session=${r.session_id}`)}
                        className="h-7 px-2 rounded-md text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
                        title="Open ROI"
                      >
                        <ExternalLink className="h-3 w-3" /> ROI
                      </button>
                    )}
                    {r.status === "pending" && (
                      <button
                        onClick={() => resolve.mutate(r.id)}
                        className="h-7 px-2 rounded-md text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
