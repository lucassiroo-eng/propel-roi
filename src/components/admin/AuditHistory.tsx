import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function AuditHistory({ tableName }: { tableName: string }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit_history", tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reference_data_audit")
        .select("*")
        .eq("table_name", tableName)
        .order("changed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (!logs?.length) return <p className="text-sm text-muted-foreground text-center py-8">No audit history yet.</p>;

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant={log.action === "delete" ? "destructive" : log.action === "insert" ? "default" : "secondary"} className="text-[10px]">
                {log.action}
              </Badge>
              <span className="font-mono text-muted-foreground">{log.row_id}</span>
              <span className="ml-auto text-muted-foreground">
                {log.changed_at ? formatDistanceToNow(new Date(log.changed_at), { addSuffix: true }) : "—"}
              </span>
            </div>
            {log.reason && <p className="text-xs text-muted-foreground mt-1">{log.reason}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
