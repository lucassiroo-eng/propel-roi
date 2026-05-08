/**
 * Safe formula evaluator for pain cost expressions.
 * Parses simple arithmetic expressions with variable references.
 * No eval() -- uses a tokenizer + recursive descent parser.
 */

// Tokenizer
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
    i++; // skip unknown chars
  }
  return tokens;
}

// Recursive descent parser: expr -> term ((+|-) term)*
// term -> factor ((*|/) factor)*
// factor -> number | ident | '(' expr ')'
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
    pos.i++; // skip (
    const val = parseExpr(tokens, pos, vars);
    if (pos.i < tokens.length && tokens[pos.i].type === "paren" && tokens[pos.i].value === ")") pos.i++;
    return val;
  }
  pos.i++;
  return 0;
}

/**
 * Evaluate a formula expression string against a variable map.
 * Example: evaluateFormula("headline * 52 * hourly_cost", { headline: 3, hourly_cost: 25 }) => 3900
 */
export function evaluateFormula(expression: string, vars: Record<string, number>): number {
  if (!expression) return 0;
  const tokens = tokenize(expression);
  const result = parseExpr(tokens, { i: 0 }, vars);
  return isFinite(result) ? result : 0;
}

/**
 * Extract ordered variable keys (identifiers) from a formula expression.
 * Example: "(I19) * (I1) * (I7) * (I14 / 60)" => ["I19", "I1", "I7", "I14"]
 * Returns unique keys in order of first appearance.
 */
export function extractFormulaVarKeys(expression: string): string[] {
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

/**
 * Format formula expression with current values for display.
 * Example: "headline * 52 * hourly_cost" with { headline: 3, hourly_cost: 25 }
 * => "3 x 52 x 25 = 3,900"
 */
export function formatFormulaWithValues(
  expression: string,
  vars: Record<string, number>,
  locale: string = "es-ES",
): string {
  if (!expression) return "";
  const tokens = tokenize(expression);
  const parts: string[] = [];
  for (const tok of tokens) {
    if (tok.type === "ident") {
      const val = vars[tok.value] ?? 0;
      parts.push(val.toLocaleString(locale, { maximumFractionDigits: 2 }));
    } else if (tok.type === "number") {
      parts.push(tok.value.toLocaleString(locale, { maximumFractionDigits: 2 }));
    } else if (tok.type === "op") {
      parts.push(tok.value === "*" ? " x " : tok.value === "/" ? " / " : tok.value === "+" ? " + " : " - ");
    } else if (tok.type === "paren") {
      parts.push(tok.value);
    }
  }
  const result = evaluateFormula(expression, vars);
  return `${parts.join("")} = ${result.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
}
