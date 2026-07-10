import { describe, it, expect } from 'vitest';
import { placeTooltip, TIP_W, TIP_H } from '../admin/src/components/GuidedTour';

const VW = 1440;
const VH = 900;
const rectAt = (top: number, left: number, w: number, h: number) => ({ top, left, bottom: top + h, right: left + w });

// the tooltip must always sit fully inside the viewport with a 16px margin
function assertOnScreen(p: { top: number; left: number }) {
  expect(p.top).toBeGreaterThanOrEqual(16);
  expect(p.left).toBeGreaterThanOrEqual(16);
  expect(p.top + TIP_H).toBeLessThanOrEqual(VH - 16 + 0.001);
  expect(p.left + TIP_W).toBeLessThanOrEqual(VW - 16 + 0.001);
}

describe('placeTooltip', () => {
  it('places the tooltip below a short target near the top', () => {
    const rect = rectAt(60, 1100, 90, 34); // a header button
    const p = placeTooltip(rect, VW, VH);
    expect(p.top).toBe(rect.bottom + 12); // below
    assertOnScreen(p);
  });

  it('places it above when there is no room below', () => {
    const rect = rectAt(VH - 60, 200, 120, 40); // near the bottom edge
    const p = placeTooltip(rect, VW, VH);
    expect(p.top).toBe(rect.top - 12 - TIP_H); // above
    assertOnScreen(p);
  });

  it('places it beside a full-height target (palette) — never off the top', () => {
    const rect = rectAt(56, 0, 232, VH - 56); // left sidebar, spans the viewport
    const p = placeTooltip(rect, VW, VH);
    expect(p.left).toBe(rect.right + 16); // to the right of the palette
    assertOnScreen(p);                    // regression: used to overflow above the viewport
  });

  it('centers the tooltip when the target is missing', () => {
    const p = placeTooltip(null, VW, VH);
    expect(p.left).toBeCloseTo((VW - TIP_W) / 2, 0);
    assertOnScreen(p);
  });

  it('clamps a far-right target so the tooltip stays on-screen', () => {
    const rect = rectAt(200, VW - 40, 30, 30);
    const p = placeTooltip(rect, VW, VH);
    assertOnScreen(p);
  });
});
