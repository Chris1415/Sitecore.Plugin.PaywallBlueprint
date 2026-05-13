# T014 — SDK `.d.ts` Verification Report: `ApplicationContext`

**Verified:** 2026-05-13  
**Verified by:** Developer (08) — autonomous step per T014 instructions  
**Rule:** `40-sdk-contracts.mdc` — SDK shapes derived from `node_modules` `.d.ts`, not from skill catalogs or task prose

---

## (a) Actual `.d.ts` file path

Primary declaration:

```
node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts → ApplicationContext
```

Re-exported through:

```
node_modules/@sitecore-marketplace-sdk/client/dist/types.d.ts
  → export { UserInfo, ApplicationContext } from '@sitecore-marketplace-sdk/core';
node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts
  → export * from './types';
```

The scaffold's `components/providers/marketplace.tsx` imports `type ApplicationContext` from `@sitecore-marketplace-sdk/client` — which resolves to the `core` declaration above.

## (b) Exact `ApplicationContext` declaration block

From `node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts`:

```typescript
export interface ApplicationContext {
    id: string;
    url: string;
    name?: string;
    type?: string;
    iconUrl?: string;
    state?: string;
    installationId?: string;
    MarketplaceAppTenantId?: string;
    organizationId?: string;
    permissions?: Permissions;
    /** @deprecated Use resourceAccess instead */
    resources?: ApplicationResourceContext[];
    /** @deprecated Use extensionPoints instead */
    touchpoints?: ApplicationTouchpointContext[];
    resourceAccess?: ApplicationResourceContext[];
    extensionPoints?: ApplicationExtensionPointContext[];
    [key: string]: any;
}
```

Where `ApplicationResourceContext` is:

```typescript
export interface ApplicationResourceContext {
    resourceId: string;
    tenantId: string;
    tenantName?: string;
    tenantDisplayName?: string;
    context: {
        live: string;
        preview: string;
    };
    [key: string]: any;
}
```

And `UserInfo` (from a separate `host.user` query, NOT from `application.context`):

```typescript
export interface UserInfo {
    id: string;
    name: string;
    email: string;
}
```

## (c) Shape match vs architecture assumption

### CRITICAL DIVERGENCES

The architecture (§ 5.4) assumed:

| Assumed path | Actual path | Status |
|---|---|---|
| `context.user.id` | **NOT PRESENT** in `ApplicationContext` | DIVERGENCE |
| `context.user.name` | **NOT PRESENT** in `ApplicationContext` | DIVERGENCE |
| `context.user.email` | **NOT PRESENT** in `ApplicationContext` | DIVERGENCE |
| `context.tenant.id` | **NOT PRESENT** in `ApplicationContext` | DIVERGENCE |
| `context.tenant.name` | **NOT PRESENT** in `ApplicationContext` | DIVERGENCE |
| `resourceAccess[]` | `context.resourceAccess?.[0].tenantId` / `.tenantName` | EXISTS (non-deprecated) |

**Summary:** `ApplicationContext` has NO `user` or `tenant` sub-objects. The assumed accessor chain `context.user.*` and `context.tenant.*` does not exist in the `.d.ts`.

### Actual accessor chains

- **Tenant ID:** `context.resourceAccess?.[0]?.tenantId` (string, required on resource)
- **Tenant name:** `context.resourceAccess?.[0]?.tenantName` (string, optional)
- **User identity:** NOT in `ApplicationContext` — requires a separate `client.query('host.user')` call which returns `UserInfo { id: string; name: string; email: string }`.

### Unwrap level (Mode A single `.data` per skill § 8b)

Confirmed: `client.query('application.context')` returns `QueryResult<'application.context'>` which has shape `{ data: ApplicationContext | undefined; ... }`. Single `.data` unwrap is correct.

```typescript
const result = await client.query('application.context');
const applicationContext = result.data; // ApplicationContext | undefined — single .data unwrap
```

## (d) Divergences flagged for T023 (defensive render) and T031 (AllowedState)

1. **`context.user.*` does not exist.** The MarketplaceProvider must make a SECOND SDK call — `client.query('host.user')` — to get user identity (`UserInfo { id, name, email }`). T023/T031 CANNOT read `context.user.*` from `ApplicationContext`.

2. **`context.tenant.*` does not exist.** Tenant identity is sourced from `context.resourceAccess?.[0]?.{tenantId, tenantName}`.

3. **`PaywallGate` context validation (T033 step 3):** Must extract `tenantId` from `context.resourceAccess?.[0]?.tenantId` (not `context.tenant.id`). Must source `userId` from a separate `host.user` query result.

4. **MarketplaceProvider expansion needed (T023/T031):** Provider must also query `host.user` and expose the result via a second context (`UserInfoContext`) or enrich the existing `AppContextContext`. This is an architectural impact that the Developer does NOT decide — surfaced here for T023 implementer.

### Recommended approach for T023/T031 (flagged, not decided here)

The scaffold's `useAppContext()` returns `ApplicationContext | null`. For T023's defensive layered render, the most defensively correct approach is:
- For tenant: `context.resourceAccess?.[0]?.tenantId` for ID, `context.resourceAccess?.[0]?.tenantName` for name
- For user: requires the provider to also expose `UserInfo` from a `host.user` query

This is a scope question for T023 — surfaced here as the pre-Tranche-B gate finding per architecture § 10.

## (e) Unwrap level confirmation

Single `.data` unwrap confirmed. The `QueryMap['application.context']` response type is `ApplicationContext` (not nested). The `client.query()` return wraps it in `BaseQueryResult<ApplicationContext>` with a `data` field.

---

## Final accessor chain for T031/T023 (provisional — pending T013 fixture capture)

```typescript
// shape: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts → ApplicationContext
// Re-exported via: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts
// Verified 2026-05-13 against .d.ts (fixture application-context.json pending OA-1 T013)
//
// DIVERGENCE from architecture § 5.4:
//   - context.user.* does NOT exist in ApplicationContext — user identity from host.user query (UserInfo)
//   - context.tenant.* does NOT exist — tenant from context.resourceAccess?.[0]
//
// Provisional accessor chains (T023/T031 implementer must verify against T013 fixture):
const tenantId   = context?.resourceAccess?.[0]?.tenantId;
const tenantName = context?.resourceAccess?.[0]?.tenantName;
// userId / userName / userEmail: from UserInfo (host.user query) — NOT from ApplicationContext
```
