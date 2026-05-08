import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "textarea";
  required?: boolean;
  editable?: boolean;
  min?: number;
  max?: number;
}

export interface TableEditorConfig {
  table: string;
  primaryKey: string;
  columns: ColumnDef[];
  defaultRow?: Record<string, any>;
  filterColumn?: string; // e.g. "country" for country tabs
}

export function useAdminTable(config: TableEditorConfig) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newData, setNewData] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const queryKey = [config.table, filter];

  const { data: rows, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase.from(config.table as any).select("*");
      if (config.filterColumn && filter) {
        q = q.eq(config.filterColumn, filter);
      }
      const { data, error } = await q.order(config.primaryKey);
      if (error) throw error;
      return data as Record<string, any>[];
    },
  });

  const filteredRows = useMemo(() => {
    if (!rows || !search) return rows ?? [];
    const s = search.toLowerCase();
    return rows.filter((r) =>
      config.columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(s))
    );
  }, [rows, search, config.columns]);

  const auditLog = useCallback(
    async (action: string, rowId: string, before: any, after: any) => {
      await supabase.from("reference_data_audit").insert({
        table_name: config.table,
        row_id: String(rowId),
        action,
        before: before ? (before as any) : null,
        after: after ? (after as any) : null,
        changed_by: user?.id,
      });
    },
    [config.table, user?.id]
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, original }: { id: string; data: Record<string, any>; original: Record<string, any> }) => {
      const { error } = await supabase
        .from(config.table as any)
        .update(data)
        .eq(config.primaryKey, id);
      if (error) throw error;
      await auditLog("update", id, original, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingId(null);
      toast.success("Row updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const insertMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { error } = await supabase.from(config.table as any).insert(data);
      if (error) throw error;
      await auditLog("insert", String(data[config.primaryKey] ?? "new"), null, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAddingNew(false);
      setNewData({});
      toast.success("Row added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, original }: { id: string; original: Record<string, any> }) => {
      const { error } = await supabase
        .from(config.table as any)
        .delete()
        .eq(config.primaryKey, id);
      if (error) throw error;
      await auditLog("delete", id, original, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Row deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    rows: filteredRows,
    isLoading,
    editingId, setEditingId,
    editData, setEditData,
    addingNew, setAddingNew,
    newData, setNewData,
    filter, setFilter,
    search, setSearch,
    updateMutation,
    insertMutation,
    deleteMutation,
  };
}
