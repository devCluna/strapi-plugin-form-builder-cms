import React, { useLayoutEffect, useState } from 'react';
import { C, FF } from '../ui';

export interface TourStep {
  selector: string;
  title: string;
  body: string;
  // when set, the tour asks the host to open this panel (e.g. the Settings drawer)
  // before spotlighting the target; other steps ask to close it.
  panel?: string;
}

export const TIP_W = 320;
export const TIP_H = 176; // estimate — used only to keep the tooltip fully on-screen

/**
 * Decide where to place the tooltip so it stays fully on-screen: below the target,
 * else above, else beside it (right, then left) for tall targets like the palette or
 * canvas. Pure + exported so it can be unit-tested. `rect` uses viewport coordinates.
 */
export function placeTooltip(
  rect: { top: number; bottom: number; left: number; right: number } | null,
  vw: number,
  vh: number,
): { top: number; left: number } {
  const clampX = (x: number) => Math.min(Math.max(x, 16), vw - TIP_W - 16);
  const clampY = (y: number) => Math.min(Math.max(y, 16), vh - TIP_H - 16);
  if (!rect) return { top: clampY(vh / 2 - TIP_H / 2), left: clampX((vw - TIP_W) / 2) };
  if (rect.bottom + 12 + TIP_H <= vh) return { top: rect.bottom + 12, left: clampX(rect.left) };
  if (rect.top - 12 - TIP_H >= 0) return { top: rect.top - 12 - TIP_H, left: clampX(rect.left) };
  const top = clampY(rect.top);
  let left: number;
  if (rect.right + 16 + TIP_W <= vw) left = rect.right + 16;
  else if (rect.left - 16 - TIP_W >= 0) left = rect.left - 16 - TIP_W;
  else left = clampX(rect.left);
  return { top, left };
}

const btn = (variant: 'ghost' | 'pri'): React.CSSProperties => ({
  height: 30, padding: '0 12px', borderRadius: 5, font: `600 12px ${FF}`, cursor: 'pointer',
  border: variant === 'pri' ? '1px solid transparent' : `1px solid ${C.n200}`,
  background: variant === 'pri' ? C.p600 : C.n0,
  color: variant === 'pri' ? '#fff' : C.n700,
});

/**
 * A dependency-free product tour: dims the page, spotlights each target element
 * (found by CSS selector) and shows a tooltip with Back / Next / Skip. Steps whose
 * target isn't in the DOM are skipped automatically.
 */
export function GuidedTour({ steps, onClose, onPanel }: { steps: TourStep[]; onClose: () => void; onPanel?: (panel: string | null) => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i];

  useLayoutEffect(() => {
    if (!step) return;
    // open/close the panel this step lives in (e.g. the Settings drawer)
    onPanel?.(step.panel ?? null);

    let timer = 0;
    let tries = 0;
    const locate = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
        setRect(el.getBoundingClientRect());
      } else if (tries++ < 25) {
        timer = window.setTimeout(locate, 40); // wait for the panel to render in
      } else {
        setRect(null);
      }
    };
    locate();

    const remeasure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!step) return null;
  const last = i === steps.length - 1;
  const pad = 6;
  const { top: tipTop, left: tipLeft } = placeTooltip(rect, window.innerWidth, window.innerHeight);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200 }}>
      {rect ? (
        <div style={{ position: 'fixed', top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: 8, boxShadow: '0 0 0 9999px rgba(18,18,38,.55)', transition: 'all .2s ease', pointerEvents: 'none' }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(18,18,38,.55)' }} />
      )}

      <div style={{
        position: 'fixed', top: tipTop, left: tipLeft, width: TIP_W, background: C.n0, borderRadius: 10,
        boxShadow: '0 12px 44px rgba(0,0,0,.28)', padding: 18, zIndex: 1201,
      }}>
        <div style={{ font: `700 14px ${FF}`, color: C.n900, marginBottom: 6 }}>{step.title}</div>
        <div style={{ font: `400 13px ${FF}`, color: C.n600, lineHeight: 1.55 }}>{step.body}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <span style={{ font: `500 12px ${FF}`, color: C.n500 }}>{i + 1} / {steps.length}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={btn('ghost')}>Skip</button>
            {i > 0 && <button type="button" onClick={() => setI(i - 1)} style={btn('ghost')}>Back</button>}
            <button type="button" onClick={() => (last ? onClose() : setI(i + 1))} style={btn('pri')}>{last ? 'Done' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
