/**
 * /api/portal route tests — T018
 *
 * RED phase: test written before route implementation (T017).
 * Test MUST FAIL until T017 is implemented.
 */

import { describe, it, expect } from 'vitest';
import { POST } from './route';

describe('T018 — POST /api/portal', () => {
  it('returns 501 with correct body (PRD-003 stub)', async () => {
    const req = new Request('http://localhost:3000/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(501);
    expect(body).toEqual({ error: 'Customer Portal lands in PRD-003. See README.' });
  });
});
