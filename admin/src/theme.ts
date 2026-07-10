/**
 * Single source of truth for form theming.
 *
 * A theme resolves to a small set of `--sfb-*` CSS custom properties plus two
 * data-attributes (field + button variants that change structure, not just a
 * token). Both the admin live preview and the public embed apply these verbatim,
 * so there is no duplicated styling logic to keep in sync.
 */

export type FontId = 'sans' | 'serif' | 'round' | 'mono';
export type CornersId = 'sharp' | 'rounded' | 'pill';
export type FieldStyleId = 'outline' | 'filled' | 'underline';
export type LabelWeightId = 'regular' | 'medium' | 'bold';
export type ButtonStyleId = 'solid' | 'outline';
export type ButtonWidthId = 'full' | 'auto';
export type FormWidthId = 'narrow' | 'regular' | 'wide';
export type SpacingId = 'compact' | 'cozy' | 'roomy';
export type ShadowId = 'none' | 'soft' | 'strong';
export type CardBorderId = 'none' | 'hairline' | 'bold';
export type CardCornersId = 'sharp' | 'rounded' | 'round';
export type PlacementId = 'top' | 'center';

export interface Palettes {
  accent: string[];
  cardBg: string[];
  pageBg: string[];
}
export type PaletteKey = keyof Palettes;

export interface FormTheme {
  accent: string;
  font: FontId;
  cardBg: string;
  pageBg: string;
  corners: CornersId;
  fieldStyle: FieldStyleId;
  labelWeight: LabelWeightId;
  buttonStyle: ButtonStyleId;
  buttonWidth: ButtonWidthId;
  formWidth: FormWidthId;
  spacing: SpacingId;
  shadow: ShadowId;
  cardBorder: CardBorderId;
  cardCorners: CardCornersId;
  placement: PlacementId;
  // editable swatch palettes (persisted with the form; not part of the resolved look)
  palettes: Palettes;
}

export const CARD_RADIUS: Record<CardCornersId, string> = { sharp: '0px', rounded: '14px', round: '28px' };

/* ── swatch palettes (for the sidebar pickers) ─────────────────────────── */
export const ACCENTS = ['#4945ff', '#2f6fed', '#2f8f4e', '#7c3aed', '#d1354a', '#d98218', '#12b886', '#1e1e2e'];
export const CARD_BGS = ['#ffffff', '#faf7f0', '#f4f4fb', '#1a1a2e', '#0f0f1a'];
export const PAGE_BGS = ['#f5f5f9', '#ffffff', '#eef0fb', '#f6f1e7', '#0f0f1a'];

/* ── value maps ────────────────────────────────────────────────────────── */
export const FONT: Record<FontId, string> = {
  sans: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  round: '"Nunito", "Segoe UI Rounded", system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};
export const CORNERS: Record<CornersId, string> = { sharp: '0px', rounded: '8px', pill: '999px' };
export const LABEL_WEIGHT: Record<LabelWeightId, string> = { regular: '400', medium: '600', bold: '700' };
export const FORM_WIDTH: Record<FormWidthId, string> = { narrow: '460px', regular: '600px', wide: '760px' };
export const SPACING: Record<SpacingId, string> = { compact: '14px', cozy: '20px', roomy: '30px' };
export const SHADOW: Record<ShadowId, string> = {
  none: 'none',
  soft: '0 4px 20px rgba(20,20,50,.08)',
  strong: '0 12px 40px rgba(20,20,50,.18)',
};

export const DEFAULT_THEME: FormTheme = {
  accent: '#4945ff',
  font: 'sans',
  cardBg: '#ffffff',
  pageBg: '#f5f5f9',
  corners: 'rounded',
  fieldStyle: 'outline',
  labelWeight: 'medium',
  buttonStyle: 'solid',
  buttonWidth: 'full',
  formWidth: 'regular',
  spacing: 'cozy',
  shadow: 'soft',
  cardBorder: 'hairline',
  cardCorners: 'rounded',
  placement: 'top',
  palettes: { accent: ACCENTS, cardBg: CARD_BGS, pageBg: PAGE_BGS },
};

// Is a color dark enough to need light text on top of it?
function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // perceived luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}

/** Resolve a theme to the `--sfb-*` variables the form reads. */
export function resolveThemeVars(theme: Partial<FormTheme> | undefined): Record<string, string> {
  const t: FormTheme = { ...DEFAULT_THEME, ...(theme || {}) };
  const darkCard = isDark(t.cardBg);
  const text = darkCard ? '#f4f4f8' : '#1f1f33';
  const muted = darkCard ? '#a6a6c0' : '#6a6a82';
  const border = darkCard ? 'rgba(255,255,255,.18)' : '#dcdce4';
  // filled fields use a subtle tint of the card
  const fill = darkCard ? 'rgba(255,255,255,.06)' : '#f1f1f6';

  return {
    '--sfb-accent': t.accent,
    '--sfb-accent-contrast': isDark(t.accent) ? '#ffffff' : (t.accent.toLowerCase() === '#ffffff' ? '#1f1f33' : '#ffffff'),
    '--sfb-font': FONT[t.font],
    '--sfb-bg': t.cardBg,
    '--sfb-page-bg': t.pageBg,
    '--sfb-text': text,
    '--sfb-muted': muted,
    '--sfb-border': border,
    '--sfb-input-bg': t.fieldStyle === 'filled' ? fill : (t.fieldStyle === 'underline' ? 'transparent' : t.cardBg),
    '--sfb-radius': CORNERS[t.corners],
    '--sfb-label-weight': LABEL_WEIGHT[t.labelWeight],
    '--sfb-form-width': FORM_WIDTH[t.formWidth],
    '--sfb-gap': SPACING[t.spacing],
    '--sfb-shadow': SHADOW[t.shadow],
    '--sfb-card-border': t.cardBorder === 'none' ? 'none' : `${t.cardBorder === 'bold' ? '2px' : '1px'} solid ${border}`,
    '--sfb-card-radius': CARD_RADIUS[t.cardCorners],
    '--sfb-page-align': t.placement === 'center' ? 'center' : 'flex-start',
    '--sfb-btn-width': t.buttonWidth === 'full' ? '100%' : 'auto',
    // button: solid = accent bg / contrast text; outline = transparent bg / accent text + border
    '--sfb-btn-bg': t.buttonStyle === 'solid' ? t.accent : 'transparent',
    '--sfb-btn-color': t.buttonStyle === 'solid' ? (isDark(t.accent) ? '#fff' : '#fff') : t.accent,
    '--sfb-btn-border': t.buttonStyle === 'outline' ? `2px solid ${t.accent}` : '2px solid transparent',
  };
}

/** Data-attributes for the structural variants CSS keys off. */
export function resolveThemeAttrs(theme: Partial<FormTheme> | undefined): Record<string, string> {
  const t: FormTheme = { ...DEFAULT_THEME, ...(theme || {}) };
  return { 'data-sfb-fields': t.fieldStyle };
}

// ponytail: one runnable check — preset + variant resolution.
export function __selfCheck() {
  const v = resolveThemeVars({ ...DEFAULT_THEME, cardBg: '#0f0f1a', fieldStyle: 'underline', corners: 'pill' });
  if (v['--sfb-text'] !== '#f4f4f8') throw new Error('dark card should use light text');
  if (v['--sfb-input-bg'] !== 'transparent') throw new Error('underline should have transparent input bg');
  if (v['--sfb-radius'] !== '999px') throw new Error('pill radius not applied');
  return true;
}
