import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple safe formula evaluator (same logic as client-side painFormulas.ts)
type Token =
  | { type: "number"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: string }
  | { type: "paren"; value: "(" | ")" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) { id += expr[i]; i++; }
      tokens.push({ type: "ident", value: id });
      continue;
    }
    if ("+-*/".includes(ch)) { tokens.push({ type: "op", value: ch }); i++; continue; }
    if (ch === "(") { tokens.push({ type: "paren", value: "(" }); i++; continue; }
    if (ch === ")") { tokens.push({ type: "paren", value: ")" }); i++; continue; }
    i++;
  }
  return tokens;
}

function parseExpr(tokens: Token[], pos: { i: number }, vars: Record<string, number>): number {
  let left = parseTerm(tokens, pos, vars);
  while (pos.i < tokens.length && tokens[pos.i].type === "op" && (tokens[pos.i].value === "+" || tokens[pos.i].value === "-")) {
    const op = tokens[pos.i].value; pos.i++;
    const right = parseTerm(tokens, pos, vars);
    left = op === "+" ? left + right : left - right;
  }
  return left;
}

function parseTerm(tokens: Token[], pos: { i: number }, vars: Record<string, number>): number {
  let left = parseFactor(tokens, pos, vars);
  while (pos.i < tokens.length && tokens[pos.i].type === "op" && (tokens[pos.i].value === "*" || tokens[pos.i].value === "/")) {
    const op = tokens[pos.i].value; pos.i++;
    const right = parseFactor(tokens, pos, vars);
    left = op === "*" ? left * right : (right !== 0 ? left / right : 0);
  }
  return left;
}

function parseFactor(tokens: Token[], pos: { i: number }, vars: Record<string, number>): number {
  if (pos.i >= tokens.length) return 0;
  const tok = tokens[pos.i];
  if (tok.type === "number") { pos.i++; return tok.value; }
  if (tok.type === "ident") { pos.i++; return vars[tok.value] ?? 0; }
  if (tok.type === "paren" && tok.value === "(") {
    pos.i++;
    const val = parseExpr(tokens, pos, vars);
    if (pos.i < tokens.length && tokens[pos.i].type === "paren" && tokens[pos.i].value === ")") pos.i++;
    return val;
  }
  pos.i++;
  return 0;
}

function evaluateFormula(expression: string, vars: Record<string, number>): number {
  if (!expression) return 0;
  const tokens = tokenize(expression);
  const result = parseExpr(tokens, { i: 0 }, vars);
  return isFinite(result) ? result : 0;
}

function extractFormulaVarKeys(expression: string): string[] {
  if (!expression) return [];
  const tokens = tokenize(expression);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tok of tokens) {
    if (tok.type === "ident" && !seen.has(tok.value)) {
      seen.add(tok.value);
      result.push(tok.value);
    }
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session, error: sErr } = await supabase
      .from("roi_sessions")
      .select("*, prospects(*)")
      .eq("id", session_id)
      .single();
    if (sErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prospect = session.prospects as any;
    const country = prospect?.country ?? "ES";
    const seats = prospect?.seats ?? 50;
    const selectedPains: string[] = session.selected_pains ?? [];
    const painOverrides: Record<string, { value: number; annual_benefit: number; expandedVars?: Record<string, number> }> =
      (session.pain_overrides as any) ?? {};
    const offering = (session.selected_offering as any) ?? {};

    // Fetch country defaults (for fallback recomputation)
    const { data: countryDef } = await supabase
      .from("country_defaults")
      .select("avg_loaded_hourly_cost_eur")
      .eq("country", country)
      .single();
    const hourlyCost = countryDef?.avg_loaded_hourly_cost_eur ?? 30;

    // Fetch selected pains
    const { data: pains } = await supabase
      .from("pain_library")
      .select("pain_id, pain_statement, primary_module, benefit_type, default_value_es, default_value_fr, formula_expression")
      .in("pain_id", selectedPains.length > 0 ? selectedPains : ["__none__"]);

    // Fetch ALL formula vars for fallback recomputation
    const { data: formulaVarsData } = await supabase
      .from("pain_formula_vars")
      .select("*")
      .order("sort_order");

    const painList = pains ?? [];
    const formulaVars = formulaVarsData ?? [];

    const allVarsMap: Record<string, typeof formulaVars[number]> = {};
    for (const v of formulaVars) {
      allVarsMap[v.var_key] = v;
    }

    function getCountryDefault(v: any): number {
      if (country === "FR") return v.default_value_fr ?? v.default_value_other ?? 0;
      if (country === "ES") return v.default_value_es ?? v.default_value_other ?? 0;
      return v.default_value_other ?? v.default_value_es ?? 0;
    }

    // Compute per-pain benefits
    // PRIMARY: Read annual_benefit from painOverrides (set by Quantify step)
    // FALLBACK: Recompute from formula if annual_benefit is missing (legacy sessions)
    const painBreakdown = painList.map((pain) => {
      const override = painOverrides[pain.pain_id];

      // If Quantify already computed and stored the benefit, use it directly
      if (override?.annual_benefit !== undefined && override.annual_benefit !== 0) {
        return {
          pain_id: pain.pain_id,
          pain_statement: pain.pain_statement,
          primary_module: pain.primary_module,
          input_value: override?.value ?? 0,
          annual_benefit: Math.round(override.annual_benefit * 100) / 100,
        };
      }

      // Fallback: recompute from formula
      const expr = pain.formula_expression;
      let annualBenefit = 0;

      if (expr) {
        const varKeys = extractFormulaVarKeys(expr);
        const resolved: Record<string, number> = {};

        for (const key of varKeys) {
          if (override?.expandedVars?.[key] !== undefined) {
            resolved[key] = override.expandedVars[key];
          } else {
            const varDef = allVarsMap[key];
            if (varDef) {
              if (varDef.source === "prospect") {
                resolved[key] = seats;
              } else {
                resolved[key] = getCountryDefault(varDef);
              }
            } else {
              resolved[key] = 0;
            }
          }
        }

        annualBenefit = evaluateFormula(expr, resolved);
      }

      return {
        pain_id: pain.pain_id,
        pain_statement: pain.pain_statement,
        primary_module: pain.primary_module,
        input_value: override?.value ?? (country === "FR" ? (pain.default_value_fr ?? 0) : (pain.default_value_es ?? 0)),
        annual_benefit: Math.round(annualBenefit * 100) / 100,
      };
    });

    const totalBenefit = painBreakdown.reduce((s, p) => s + p.annual_benefit, 0);

    // Compute offering cost
    // PRIMARY: Read total_annual_cost from offering (set by Offering step)
    // FALLBACK: Recompute from bundle
    let annualCost = 0;
    if (offering.total_annual_cost !== undefined && offering.total_annual_cost > 0) {
      annualCost = offering.total_annual_cost;
    } else if (offering.bundle_id) {
      const { data: bundle } = await supabase
        .from("bundles")
        .select("*")
        .eq("id", offering.bundle_id)
        .single();
      if (bundle) {
        const billing = offering.billing ?? "yearly";
        const tier = offering.tier ?? "business";
        const price =
          billing === "yearly"
            ? tier === "enterprise"
              ? bundle.enterprise_pepm_yearly
              : bundle.business_pepm_yearly
            : tier === "enterprise"
              ? bundle.enterprise_pepm_monthly
              : bundle.business_pepm_monthly;
        const effectiveSeats = Math.max(seats, Number(bundle.floor_seats ?? 0));
        annualCost = (price ?? 0) * effectiveSeats * 12;
      }
    }

    const roiEur = totalBenefit - annualCost;
    const roiPct = annualCost > 0 ? (roiEur / annualCost) * 100 : 0;
    const paybackMonths = totalBenefit > 0 ? (annualCost / totalBenefit) * 12 : 0;

    const result = {
      total_annual_benefit_eur: Math.round(totalBenefit * 100) / 100,
      factorial_annual_cost_eur: Math.round(annualCost * 100) / 100,
      roi_eur: Math.round(roiEur * 100) / 100,
      roi_pct: Math.round(roiPct * 100) / 100,
      payback_months: Math.round(paybackMonths * 100) / 100,
      pain_breakdown: painBreakdown,
      computed_at: new Date().toISOString(),
    };

    await supabase
      .from("roi_sessions")
      .update({
        total_annual_benefit_eur: result.total_annual_benefit_eur,
        factorial_annual_cost_eur: result.factorial_annual_cost_eur,
        roi_eur: result.roi_eur,
        roi_pct: result.roi_pct,
        payback_months: result.payback_months,
        snapshot: {
          pains: painBreakdown,
          offering,
          prospect: {
            company_name: prospect?.company_name,
            country,
            seats,
            sector: prospect?.sector,
          },
          computed_at: result.computed_at,
        },
      })
      .eq("id", session_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
