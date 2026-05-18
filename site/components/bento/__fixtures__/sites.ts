/**
 * Test fixtures for SitesTile (F2).
 *
 * source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site
 * All fields are nullable/optional per the .d.ts — do NOT assume non-null in component code.
 *
 * Envelope: DOUBLE-UNWRAP confirmed by T020 Gate B real-tenant smoke 2026-05-18.
 * `client.query('xmc.sites.listSites')` returns `{ data: { data: Sites.Site[] } }`.
 * The architecture § 5c assumption was correct; the .d.ts (`Sites.ListSitesResponses[200] = Array<Site>`)
 * describes the SDK-internal raw shape, not the post-postMessage client envelope.
 * Single-unwrap fixture kept as a regression sentinel — see test cases.
 */

import type { Sites } from "@sitecore-marketplace-sdk/xmc";

// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site
export const mockSites = [
  {
    id: "site-001",
    name: "marketing-site",
    displayName: "Marketing Site",
    description: null,
    collectionId: null,
    created: "2025-01-10T00:00:00Z",
    createdBy: "user@example.com",
    sortOrder: 0,
    thumbnail: undefined,
  },
  {
    id: "site-002",
    name: "blog-site",
    displayName: "Blog Site",
    description: null,
    collectionId: null,
    created: "2025-02-01T00:00:00Z",
    createdBy: "user@example.com",
    sortOrder: 1,
    thumbnail: undefined,
  },
  {
    id: "site-003",
    name: "product-catalog",
    displayName: "Product Catalog",
    description: null,
    collectionId: null,
    created: "2025-03-15T00:00:00Z",
    createdBy: "user@example.com",
    sortOrder: 2,
    thumbnail: undefined,
  },
  {
    id: "site-004",
    name: "company-site",
    displayName: "Company Site",
    description: null,
    collectionId: null,
    created: "2025-04-01T00:00:00Z",
    createdBy: "user@example.com",
    sortOrder: 3,
    thumbnail: undefined,
  },
  {
    id: "site-005",
    name: "career-portal",
    displayName: "Career Portal",
    description: null,
    collectionId: null,
    created: "2025-05-12T00:00:00Z",
    createdBy: "user@example.com",
    sortOrder: 4,
    thumbnail: undefined,
  },
] satisfies Sites.Site[];

// Canonical runtime mock — DOUBLE-UNWRAP envelope per T020 Gate B smoke (2026-05-18).
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:2583
export const mockListSitesResponse = { data: { data: mockSites } };

// Single-unwrap kept as regression sentinel — component must NOT treat this as success.
// If a future SDK change flips to single-unwrap, this fixture is the first canary.
export const mockListSitesResponseSingle = { data: mockSites };

// Backwards-compat alias for existing test imports — same shape as mockListSitesResponse.
export const mockListSitesResponseDouble = mockListSitesResponse;

// Empty-tenant mock — double-unwrap shape
export const mockListSitesEmpty = { data: { data: [] as Sites.Site[] } };

// Error mock
export const mockListSitesError = new Error("xmc.sites.listSites failed: 403 Forbidden");
