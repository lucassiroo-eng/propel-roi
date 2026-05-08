import { useAdminTable, type TableEditorConfig, type ColumnDef } from "@/hooks/useAdminTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash2, Check, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  config: TableEditorConfig;
  filterOptions?: { value: string; label: string }[];
}

function FieldInput({
  col,
  value,
  onChange,
}: {
  col: ColumnDef;
  value: any;
  onChange: (v: any) => void;
}) {
  if (col.type === "boolean") {
    return <Switch checked={!!value} onCheckedChange={onChange} />;
  }
  if (col.type === "textarea") {
    return (
      <Textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs min-h-[60px]"
      />
    );
  }
  return (
    <Input
      type={col.type === "number" ? "number" : "text"}
      value={value ?? ""}
      onChange={(e) =>
        onChange(col.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)
      }
      min={col.min}
      max={col.max}
      className="text-xs h-8"
    />
  );
}

export function AdminTableEditor({ config, filterOptions }: Props) {
  const {
    rows, isLoading,
    editingId, setEditingId,
    editData, setEditData,
    addingNew, setAddingNew,
    newData, setNewData,
    filter, setFilter,
    search, setSearch,
    updateMutation, insertMutation, deleteMutation,
  } = useAdminTable(config);

  const editableCols = config.columns.filter((c) => c.editable !== false);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions && (
          <div className="flex gap-1">
            {filterOptions.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(filter === f.value ? "" : f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        )}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button size="sm" onClick={() => { setAddingNew(true); setNewData(config.defaultRow ?? {}); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">{rows.length} rows</p>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Add new row */}
      {addingNew && (
        <Card className="border-primary/40">
          <CardContent className="py-3 px-3 space-y-2">
            <p className="text-xs font-medium text-primary">New row</p>
            <div className="grid grid-cols-2 gap-2">
              {editableCols.map((col) => (
                <div key={col.key} className={col.type === "textarea" ? "col-span-2" : ""}>
                  <label className="text-[10px] text-muted-foreground">{col.label}</label>
                  <FieldInput
                    col={col}
                    value={newData[col.key]}
                    onChange={(v) => setNewData((p) => ({ ...p, [col.key]: v }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAddingNew(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                disabled={insertMutation.isPending}
                onClick={() => {
                  const row = { ...newData };
                  if (config.filterColumn && filter) row[config.filterColumn] = filter;
                  insertMutation.mutate(row);
                }}
              >
                {insertMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rows */}
      <div className="space-y-2">
        {rows.map((row) => {
          const id = String(row[config.primaryKey]);
          const isEditing = editingId === id;

          return (
            <Card key={id} className={cn(isEditing && "border-primary/40")}>
              <CardContent className="py-3 px-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {editableCols.map((col) => (
                        <div key={col.key} className={col.type === "textarea" ? "col-span-2" : ""}>
                          <label className="text-[10px] text-muted-foreground">{col.label}</label>
                          <FieldInput
                            col={col}
                            value={editData[col.key]}
                            onChange={(v) => setEditData((p) => ({ ...p, [col.key]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id, data: editData, original: row })}
                      >
                        {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {id}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                        {config.columns.slice(0, 6).map((col) => {
                          if (col.key === config.primaryKey) return null;
                          const v = row[col.key];
                          return (
                            <div key={col.key} className="truncate">
                              <span className="text-muted-foreground">{col.label}: </span>
                              <span className="text-foreground">
                                {col.type === "boolean" ? (v ? "✓" : "✗") : String(v ?? "—")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(id);
                          setEditData({ ...row });
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (confirm("Delete this row?")) {
                            deleteMutation.mutate({ id, original: row });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
