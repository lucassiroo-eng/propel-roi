export const XL_EMAILS = [
  "lucas.siroo@factorial.co",
  "gloria.nunez@factorial.co",
  "ariadna.isla@factorial.co",
  "andre.reis@factorial.co",
  "juan.ruiz@factorial.co",
  "lorena.tapia@factorial.co",
  "gerard.ghneim@factorial.co",
] as const;

export function isXLUser(email: string | null | undefined): boolean {
  return XL_EMAILS.includes(email as any);
}
