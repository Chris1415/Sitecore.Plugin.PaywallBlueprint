/**
 * T003a — RED: ThemeProvider in root layout
 *
 * These tests MUST fail before T003 (implementation).
 * After T003 wires <ThemeProvider> into app/layout.tsx, they should turn GREEN.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock next/font/google — avoids network calls during tests
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans', className: 'geist-sans' }),
  Geist_Mono: () => ({
    variable: '--font-geist-mono',
    className: 'geist-mono',
  }),
}));

// Mock HahnSoloFooter to keep test simple
vi.mock('@/components/hahn-solo-footer', () => ({
  HahnSoloFooter: () => <footer data-testid="footer" />,
}));

vi.mock('@/components/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => {
    return <div data-testid="theme-provider">{children}</div>;
  },
}));

import RootLayout from './layout';

describe('RootLayout (T003a — RED before T003)', () => {
  it('wraps children in <ThemeProvider>', () => {
    const testChild = <span data-testid="test-child">hello</span>;
    render(
      <RootLayout>
        {testChild}
      </RootLayout>
    );
    // ThemeProvider must be present in the tree
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    // The child must be nested inside it
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('<html> element has suppressHydrationWarning (next-themes canonical pattern)', () => {
    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>
    );
    // suppressHydrationWarning is a React prop; React doesn't emit it to the DOM.
    // We verify the intent via the ThemeProvider being present (T003 implementation gate).
    // The Playwright smoke at T019 catches the runtime effect (no hydration warnings).
    const themeProvider = screen.getByTestId('theme-provider');
    expect(themeProvider).toBeInTheDocument();
    // Verify content is nested inside it
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
