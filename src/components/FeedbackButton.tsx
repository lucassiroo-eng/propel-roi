import { useState, useRef, useEffect } from "react";
import { MessageCircleWarning, Send, Loader2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface Props {
  sessionId?: string | null;
  page?: string;
  step?: number;
}

export function FeedbackButton({ sessionId, page = "", step }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleSend() {
    if (!message.trim() || !user) return;
    setSending(true);
    await supabase.from("feedback_reports").insert({
      user_id: user.id,
      user_email: user.email ?? "",
      session_id: sessionId || null,
      page,
      step: step ?? null,
      message: message.trim(),
    });
    setSending(false);
    setSent(true);
    setMessage("");
    setTimeout(() => { setSent(false); setOpen(false); }, 1500);
  }

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40">
      {open && (
        <div className="absolute bottom-14 right-0 w-80 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <span className="text-sm font-semibold text-foreground">{t("feedback.title", "Report an issue")}</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground">{t("feedback.sent", "Thanks! We'll look into it.")}</p>
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t("feedback.placeholder", "Describe the issue...")}
                  className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-muted-foreground">
                    {sessionId ? t("feedback.attached", "Attached to this ROI") : t("feedback.general", "General feedback")}
                  </span>
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {t("feedback.send", "Send")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className={`group h-9 rounded-full shadow-md flex items-center gap-0 transition-all duration-200 ${
          open
            ? "bg-foreground text-background px-3"
            : "bg-background border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:shadow-lg w-9 hover:w-auto hover:px-3"
        }`}
      >
        <MessageCircleWarning className="h-4 w-4 flex-shrink-0" />
        <span className={`text-xs font-medium overflow-hidden transition-all duration-200 whitespace-nowrap ${
          open ? "ml-1.5 max-w-[120px] opacity-100" : "max-w-0 opacity-0 group-hover:ml-1.5 group-hover:max-w-[120px] group-hover:opacity-100"
        }`}>
          {t("feedback.title", "Report an issue")}
        </span>
      </button>
    </div>
  );
}
