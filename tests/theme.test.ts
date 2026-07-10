import { describe, it, expect } from 'vitest';
import { resolveThemeVars, DEFAULT_THEME, CORNERS, CARD_RADIUS, __selfCheck } from '../admin/src/theme';

describe('resolveThemeVars', () => {
  it('built-in self-check passes', () => {
    expect(__selfCheck()).toBe(true);
  });

  it('uses light text on a dark card, dark text on a light card', () => {
    expect(resolveThemeVars({ ...DEFAULT_THEME, cardBg: '#0f0f1a' })['--sfb-text']).toBe('#f4f4f8');
    expect(resolveThemeVars({ ...DEFAULT_THEME, cardBg: '#ffffff' })['--sfb-text']).toBe('#1f1f33');
  });

  it('maps field corners to a radius', () => {
    expect(resolveThemeVars({ ...DEFAULT_THEME, corners: 'pill' })['--sfb-radius']).toBe(CORNERS.pill);
    expect(resolveThemeVars({ ...DEFAULT_THEME, corners: 'sharp' })['--sfb-radius']).toBe('0px');
  });

  it('maps card corners to a card radius', () => {
    expect(resolveThemeVars({ ...DEFAULT_THEME, cardCorners: 'round' })['--sfb-card-radius']).toBe(CARD_RADIUS.round);
    expect(resolveThemeVars({ ...DEFAULT_THEME, cardCorners: 'sharp' })['--sfb-card-radius']).toBe('0px');
  });

  it('hides the card border when cardBorder is none', () => {
    expect(resolveThemeVars({ ...DEFAULT_THEME, cardBorder: 'none' })['--sfb-card-border']).toBe('none');
    expect(resolveThemeVars({ ...DEFAULT_THEME, cardBorder: 'bold' })['--sfb-card-border']).toContain('2px');
  });

  it('maps placement to the page alignment', () => {
    expect(resolveThemeVars({ ...DEFAULT_THEME, placement: 'center' })['--sfb-page-align']).toBe('center');
    expect(resolveThemeVars({ ...DEFAULT_THEME, placement: 'top' })['--sfb-page-align']).toBe('flex-start');
  });

  it('underline fields use a transparent input background', () => {
    expect(resolveThemeVars({ ...DEFAULT_THEME, fieldStyle: 'underline' })['--sfb-input-bg']).toBe('transparent');
  });

  it('outline button is transparent with an accent border', () => {
    const v = resolveThemeVars({ ...DEFAULT_THEME, buttonStyle: 'outline', accent: '#ff0000' });
    expect(v['--sfb-btn-bg']).toBe('transparent');
    expect(v['--sfb-btn-border']).toContain('#ff0000');
  });

  it('editable palettes are editor-only — they never leak into the resolved CSS variables', () => {
    const v = resolveThemeVars({ ...DEFAULT_THEME, palettes: { accent: ['#111111'], cardBg: ['#222222'], pageBg: ['#333333'] } });
    expect(Object.keys(v).every((k) => k.startsWith('--sfb-'))).toBe(true);
    expect(JSON.stringify(v)).not.toContain('#111111'); // a palette entry not selected must not appear
  });
});
