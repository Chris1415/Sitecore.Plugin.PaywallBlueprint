/**
 * RED tests — written to FAIL until the defensive layered render lands, so the
 * assertions are proven correct before the implementation exists.
 * Display chains: docs/build-decisions.md#display-chains.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GatedSection } from './gated-section';

// Mock PaywallGate to render children directly — these tests are about the
// display chain (pickUserDisplay / pickTenantDisplay) not the gate evaluation.
// T036a covers PaywallGate in isolation.
vi.mock('@/src/lib/paywall/PaywallGate', () => ({
  PaywallGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Mock the entire providers/marketplace module.
// We provide both useAppContext and useHostUser since T023 adds useHostUser.
// Each test overrides these via vi.mocked().mockReturnValue() or re-mock inline.
// ---------------------------------------------------------------------------
vi.mock('@/components/providers/marketplace', () => ({
  MarketplaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAppContext: vi.fn(),
  useHostUser: vi.fn(),
  useMarketplaceClient: vi.fn(),
}));

import type { ApplicationContext } from '@sitecore-marketplace-sdk/client';
import { useAppContext, useHostUser } from '@/components/providers/marketplace';
const mockUseAppContext = vi.mocked(useAppContext);
const mockUseHostUser = vi.mocked(useHostUser);

// ---------------------------------------------------------------------------
// Helper: default app context with the tenant display chain fields.
// Cast to ApplicationContext via unknown — test fixtures only need the fields
// the display chain accesses; required fields (id, url) are irrelevant here.
// ---------------------------------------------------------------------------
function makeAppContext(override: Record<string, unknown> = {}): ApplicationContext {
  return {
    marketplaceAppTenantId: '391dd026-9a1b-476b-3e30-08de9599d900',
    resourceAccess: [
      {
        tenantDisplayName: 'CHAH DevEx Journey / PROD',
        tenantName: null,
      },
    ],
    ...override,
  } as unknown as ApplicationContext;
}

// ---------------------------------------------------------------------------
// User display chain — 4 test cases
// ---------------------------------------------------------------------------

describe('GatedSection — user display chain (host.user)', () => {
  it('1. given_name present → renders "Welcome, Christian"', () => {
    mockUseHostUser.mockReturnValue({ given_name: 'Christian', name: 'Christian Hahn', email: 'christian@sitecore.com' });
    mockUseAppContext.mockReturnValue(makeAppContext());

    render(<GatedSection />);

    expect(screen.getByText(/Welcome, Christian/)).toBeTruthy();
  });

  it('2. name present (no given_name) → renders "Welcome, Christian Hahn"', () => {
    mockUseHostUser.mockReturnValue({ name: 'Christian Hahn', email: 'christian@sitecore.com' });
    mockUseAppContext.mockReturnValue(makeAppContext());

    render(<GatedSection />);

    expect(screen.getByText(/Welcome, Christian Hahn/)).toBeTruthy();
  });

  it('3. email only (no name fields) → renders "Welcome, christian"', () => {
    mockUseHostUser.mockReturnValue({ email: 'christian@sitecore.com' });
    mockUseAppContext.mockReturnValue(makeAppContext());

    render(<GatedSection />);

    expect(screen.getByText(/Welcome, christian/)).toBeTruthy();
  });

  it('4. empty host.user {} → renders "Welcome, there"', () => {
    mockUseHostUser.mockReturnValue({});
    mockUseAppContext.mockReturnValue(makeAppContext());

    render(<GatedSection />);

    expect(screen.getByText(/Welcome, there/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tenant display chain — 4 test cases
// ---------------------------------------------------------------------------

describe('GatedSection — tenant display chain (application.context)', () => {
  it('5. tenantDisplayName present → body includes "Your tenant CHAH DevEx Journey / PROD has full access"', () => {
    mockUseHostUser.mockReturnValue({ given_name: 'Test' });
    mockUseAppContext.mockReturnValue(makeAppContext({
      resourceAccess: [{ tenantDisplayName: 'CHAH DevEx Journey / PROD', tenantName: null }],
    }));

    render(<GatedSection />);

    expect(
      screen.getByText(/Your tenant CHAH DevEx Journey \/ PROD has full access/),
    ).toBeTruthy();
  });

  it('6. tenantName present (no tenantDisplayName) → body includes "Your tenant sitecoresaa516c-x has full access"', () => {
    mockUseHostUser.mockReturnValue({ given_name: 'Test' });
    mockUseAppContext.mockReturnValue(makeAppContext({
      resourceAccess: [{ tenantDisplayName: null, tenantName: 'sitecoresaa516c-x' }],
    }));

    render(<GatedSection />);

    expect(
      screen.getByText(/Your tenant sitecoresaa516c-x has full access/),
    ).toBeTruthy();
  });

  it('7. empty resourceAccess → falls back to last 8 chars of marketplaceAppTenantId ("9599d900")', () => {
    mockUseHostUser.mockReturnValue({ given_name: 'Test' });
    // '391dd026-9a1b-476b-3e30-08de9599d900'.slice(-8) === '9599d900'
    mockUseAppContext.mockReturnValue(makeAppContext({
      resourceAccess: [],
      marketplaceAppTenantId: '391dd026-9a1b-476b-3e30-08de9599d900',
    }));

    render(<GatedSection />);

    expect(screen.getByText(/Your tenant 9599d900 has full access/)).toBeTruthy();
  });

  it('8. no resourceAccess and no marketplaceAppTenantId → body reads naturally without "null" or "undefined"', () => {
    mockUseHostUser.mockReturnValue({ given_name: 'Test' });
    mockUseAppContext.mockReturnValue(makeAppContext({
      resourceAccess: undefined,
      marketplaceAppTenantId: undefined,
    }));

    render(<GatedSection />);

    // The fallback should produce a natural sentence — "Your tenant has full access."
    // (no name token when the fallback is "your tenant")
    const body = screen.getByText(/has full access/);
    expect(body.textContent).not.toContain('null');
    expect(body.textContent).not.toContain('undefined');
    // Should still render the fallback copy
    expect(body.textContent).toMatch(/your tenant/i);
  });
});
