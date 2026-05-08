import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  country: "ES" | "FR";
  sector: string;
  seats: number;
}

function sizeBucket(seats: number): string {
  if (seats <= 50) return "1-50";
  if (seats <= 100) return "51-100";
  if (seats <= 250) return "101-250";
  if (seats <= 500) return "251-500";
  if (seats <= 1000) return "501-1000";
  return "1001+";
}

export function StepBenchmarks({ country, sector, seats }: Props) {
  const { t } = useTranslation();
  const bucket = sizeBucket(seats);

  const { data: similar, isLoading: simLoading } = useQuery({
    queryKey: ["similar_companies", country, sector, bucket],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("similar_companies")
        .select("*")
        .eq("country", country)
        .eq("sector", sector)
        .eq("size_bucket", bucket);
      if (error) throw error;
      return data;
    },
    enabled: !!sector,
  });

  const { data: benchmarks, isLoading: benchLoading } = useQuery({
    queryKey: ["industry_benchmarks", country, sector],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industry_benchmarks")
        .select("*")
        .eq("country", country)
        .eq("sector", sector);
      if (error) throw error;
      return data;
    },
    enabled: !!sector,
  });

  const loading = simLoading || benchLoading;

  if (!sector) {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-foreground">{t("benchmarks.title")}</h2>
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          {t("benchmarks.no_sector")}
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const sim = similar?.[0];
  const bench = benchmarks?.[0];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("benchmarks.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("benchmarks.subtitle")}
        </p>
      </div>

      {sim && (
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {t("benchmarks.similar_title")}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t("benchmarks.customers", { count: sim.n_customers ?? 0 })}</span>
                <p className="font-semibold text-foreground">{sim.n_customers ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("benchmarks.avg_seats")}</span>
                <p className="font-semibold text-foreground">{sim.avg_seats ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("benchmarks.avg_cmrr")}</span>
                <p className="font-semibold text-foreground">€{sim.avg_cmrr_eur?.toLocaleString("es-ES") ?? "—"}</p>
              </div>
            </div>
            {sim.core_modules_top3 && (
              <div>
                <span className="text-xs text-muted-foreground">{t("benchmarks.top_modules")}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sim.core_modules_top3.split(",").map((m: string) => (
                    <Badge key={m.trim()} variant="secondary" className="text-[10px]">{m.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}
            {sim.common_addons && (
              <div>
                <span className="text-xs text-muted-foreground">{t("benchmarks.common_addons")}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sim.common_addons.split(",").map((m: string) => (
                    <Badge key={m.trim()} variant="outline" className="text-[10px]">{m.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {bench && (
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t("benchmarks.industry_title")}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t("benchmarks.customers", { count: bench.n_customers ?? 0 })}</span>
                <p className="font-semibold text-foreground">{bench.n_customers ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("benchmarks.avg_seats")}</span>
                <p className="font-semibold text-foreground">{bench.avg_seats ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("benchmarks.avg_cmrr")}</span>
                <p className="font-semibold text-foreground">€{bench.avg_cmrr_eur?.toLocaleString("es-ES") ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("benchmarks.median_cmrr")}</span>
                <p className="font-semibold text-foreground">€{bench.median_cmrr_eur?.toLocaleString("es-ES") ?? "—"}</p>
              </div>
            </div>
            {bench.attach_rates && typeof bench.attach_rates === "object" && (
              <div>
                <span className="text-xs text-muted-foreground">{t("benchmarks.attach_rates")}</span>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {Object.entries(bench.attach_rates as Record<string, number>).map(([mod, rate]) => (
                    <div key={mod} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate">{mod}</span>
                      <span className="font-medium text-foreground">{(Number(rate) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!sim && !bench && (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          {t("benchmarks.no_data")}
        </CardContent></Card>
      )}
    </div>
  );
}
