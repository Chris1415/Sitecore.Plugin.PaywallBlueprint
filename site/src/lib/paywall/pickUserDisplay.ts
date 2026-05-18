/**
 * pickUserDisplay — user display chain (shared util).
 *
 * Extracted from AllowedState.tsx for reuse across bento cards (F1 WelcomeHero).
 *
 * Source: project-planning/architecture/sdk-fixtures/host-user.json ($design_decisions)
 * LOCKED display chain (PRD-000):
 *   host.user.given_name → host.user.name → host.user.email.split('@')[0] → "there"
 *
 * Uses Record<string, unknown> rather than HostUser to remain decoupled from the
 * providers module (avoids circular imports in unit tests).
 */

export function pickUserDisplay(user: Record<string, unknown>): string {
  if (user?.given_name && typeof user.given_name === "string") {
    return user.given_name;
  }
  if (user?.name && typeof user.name === "string") {
    return user.name;
  }
  if (user?.email && typeof user.email === "string") {
    return user.email.split("@")[0];
  }
  return "there";
}
