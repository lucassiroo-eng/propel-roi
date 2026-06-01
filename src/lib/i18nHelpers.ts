/**
 * Helpers for retrieving localized content from DB records.
 */

/** Return the pain statement in the current language, falling back to English. */
export function getLocalizedPainStatement(
  pain: { pain_statement: string; pain_statement_es?: string | null; pain_statement_fr?: string | null },
  lang: string,
): string {
  if (lang.startsWith("es") && pain.pain_statement_es) return pain.pain_statement_es;
  if (lang.startsWith("fr") && pain.pain_statement_fr) return pain.pain_statement_fr;
  return pain.pain_statement;
}

/** Map a status string to its i18n key. */
export function statusI18nKey(status: string): string {
  const map: Record<string, string> = {
    draft: "status.draft",
    generated: "status.generated",
    sent: "status.sent",
    accepted: "status.accepted",
    declined: "status.declined",
    co_created: "status.co_created",
    pre_call: "status.pre_call",
    during_call: "status.during_call",
    post_call: "status.post_call",
  };
  return map[status] ?? status;
}
