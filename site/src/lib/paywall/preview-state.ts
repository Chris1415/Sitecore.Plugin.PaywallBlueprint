/**
 * preview-state — shared types + validator for the dev-mode preview-state mechanism.
 *
 * Pure TypeScript module (NO "use client" directive) so both server components
 * (app/page.tsx reads searchParams server-side) and client components
 * (gated-section-with-dev-picker.tsx holds React state) can import from here.
 *
 * Previous attempt (2026-05-13) exported these from gated-section-with-dev-picker.tsx
 * directly, which fails with Next.js's server/client boundary check:
 *   "Attempted to call isValidPreviewState() from the server but isValidPreviewState
 *    is on the client. It's not possible to invoke a client function from the server..."
 */

export type PreviewState =
  | "allowed"
  | "no-sub"
  | "seats-full"
  | "unassigned"
  | null;

export function isValidPreviewState(
  s: string | undefined,
): s is Exclude<PreviewState, null> {
  return (
    s === "allowed" ||
    s === "no-sub" ||
    s === "seats-full" ||
    s === "unassigned"
  );
}
