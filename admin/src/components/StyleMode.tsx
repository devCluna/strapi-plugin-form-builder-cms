import React, { useState } from 'react';
import { FormField, FormSettings } from '../types';
import { FormTheme, DEFAULT_THEME, resolveThemeVars, PaletteKey } from '../theme';
import { FORM_CSS } from '../form-css';
import { C, FF } from '../ui';
import { useT } from '../utils/useT';

interface Props {
  title: string;
  description: string;
  fields: FormField[];
  settings: FormSettings;
  theme: FormTheme;
  onChange: (t: FormTheme) => void;
}

/* ── small controls ────────────────────────────────────────────────────── */
const grpT: React.CSSProperties = { font: `700 10px ${FF}`, letterSpacing: '.6px', textTransform: 'uppercase', color: C.n500, margin: '0 0 10px' };
const ctlLbl: React.CSSProperties = { font: `600 13px ${FF}`, color: C.n800, display: 'block', margin: '0 0 7px' };

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', border: `1px solid ${C.n200}`, borderRadius: 6, overflow: 'hidden' }}>
      {options.map((o, i) => {
        const on = value === o.v;
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            style={{ flex: 1, height: 34, border: 'none', borderLeft: i ? `1px solid ${C.n200}` : 'none', background: on ? C.p600 : C.n0, color: on ? '#fff' : C.n700, font: `600 12px ${FF}`, cursor: 'pointer' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Palette({ colors, value, onSelect, onAdd, onDelete }: {
  colors: string[]; value: string;
  onSelect: (c: string) => void; onAdd: (c: string) => void; onDelete: (c: string) => void;
}) {
  const t = useT();
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {colors.map((c) => {
        const on = value.toLowerCase() === c.toLowerCase();
        return (
          <div key={c} style={{ position: 'relative' }} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
            <button type="button" onClick={() => onSelect(c)} title={c}
              style={{ width: 34, height: 34, borderRadius: 8, background: c, cursor: 'pointer', border: on ? `2px solid ${C.p600}` : `1px solid ${C.n200}`, boxShadow: on ? `0 0 0 2px ${C.p200}` : 'none', outline: 'none', display: 'block' }} />
            {hover === c && colors.length > 1 && (
              <button type="button" title={t('style.removeColor')} onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: C.n800, color: '#fff', border: '1.5px solid #fff', font: `700 10px ${FF}`, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
            )}
          </div>
        );
      })}
      {/* add a color to the palette via the native picker */}
      <label title={t('style.addColor')} style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.n0, border: `1px dashed ${C.n300}` }}>
        <span style={{ font: `700 16px ${FF}`, color: C.n500, lineHeight: 1 }}>+</span>
        <input type="color" onChange={(e) => onAdd(e.target.value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
      </label>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '18px 0', borderBottom: `1px solid ${C.n150}` }}>
      <div style={grpT}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

/* ── faithful preview: same .sfb-* classes + FORM_CSS as the embed ─────── */
function PreviewInput({ field }: { field: FormField }) {
  const t = useT();
  const ph = field.placeholder || '';
  if (field.type === 'textarea') return <textarea className="sfb-input" placeholder={ph} readOnly />;
  if (field.type === 'select') return (
    <select className="sfb-input"><option>{ph || t('preview.selectOption')}</option></select>
  );
  if (field.type === 'radio' || field.type === 'checkbox-group') return (
    <div className="sfb-radio-group">
      {(field.options || []).map((o, i) => (
        <label key={i} className="sfb-radio-label"><input type={field.type === 'radio' ? 'radio' : 'checkbox'} name={field.name} readOnly />{o.label || o.value}</label>
      ))}
    </div>
  );
  const typeMap: Record<string, string> = { text: 'text', email: 'email', number: 'number', phone: 'tel', password: 'password', url: 'url', date: 'date', time: 'time' };
  return <input className="sfb-input" type={typeMap[field.type] || 'text'} placeholder={ph} readOnly />;
}

function PreviewForm({ title, description, fields, settings }: { title: string; description: string; fields: FormField[]; settings: FormSettings }) {
  const t = useT();
  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>{title || t('style.untitled')}</h1>
      {description && <p style={{ fontSize: 14, color: 'var(--sfb-muted)', margin: '0 0 24px', lineHeight: 1.55 }}>{description}</p>}
      <form className="sfb-form" onSubmit={(e) => e.preventDefault()}>
        <div className="sfb-grid">
          {fields.filter((f) => f.type !== 'hidden').map((field) => {
            if (field.type === 'divider') return <hr key={field.id} className="sfb-divider" style={{ gridColumn: '1 / -1' }} />;
            if (field.type === 'heading') return <p key={field.id} className="sfb-heading" style={{ gridColumn: '1 / -1' }}>{field.label}</p>;
            if (field.type === 'paragraph') return <p key={field.id} className="sfb-paragraph" style={{ gridColumn: '1 / -1' }}>{field.label}</p>;
            const full = field.width !== 'half';
            if (field.type === 'checkbox') return (
              <label key={field.id} className="sfb-checkbox-label" style={{ gridColumn: full ? '1 / -1' : undefined }}>
                <input type="checkbox" readOnly /> {field.label}{field.required && <span className="sfb-required"> *</span>}
              </label>
            );
            return (
              <div key={field.id} className={'sfb-field' + (field.cssClass ? ' ' + field.cssClass : '')} style={{ gridColumn: full ? '1 / -1' : undefined }}>
                <label className="sfb-label">{field.label}{field.required && <span className="sfb-required"> *</span>}</label>
                <PreviewInput field={field} />
                {field.helpText && <p className="sfb-help">{field.helpText}</p>}
              </div>
            );
          })}
        </div>
        {fields.length > 0 && <button type="submit" className="sfb-btn">{settings.submitButtonText || t('defaults.submitButton')}</button>}
      </form>
    </>
  );
}

export function StyleMode({ title, description, fields, settings, theme, onChange }: Props) {
  const t = useT();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const th = theme;
  const set = (p: Partial<FormTheme>) => onChange({ ...th, ...p });
  const vars = resolveThemeVars(th) as React.CSSProperties;

  // editable, persisted color palettes
  const pal = th.palettes || DEFAULT_THEME.palettes;
  const selColor = (key: PaletteKey, c: string) => set({ [key]: c } as Partial<FormTheme>);
  const addColor = (key: PaletteKey, c: string) => {
    const list = pal[key];
    const exists = list.some((x) => x.toLowerCase() === c.toLowerCase());
    set({ [key]: c, palettes: { ...pal, [key]: exists ? list : [...list, c] } } as Partial<FormTheme>);
  };
  const delColor = (key: PaletteKey, c: string) => set({ palettes: { ...pal, [key]: pal[key].filter((x) => x !== c) } } as Partial<FormTheme>);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, alignSelf: 'stretch' }}>
      {/* sidebar */}
      <div style={{ width: 300, minWidth: 300, background: C.n0, borderRight: `1px solid ${C.n150}`, overflowY: 'auto', padding: '18px 20px' }}>
        <div style={{ font: `800 18px ${FF}`, color: C.n900 }}>{t('style.title')}</div>
        <div style={{ font: `400 12px ${FF}`, color: C.n500, margin: '4px 0 4px', lineHeight: 1.5 }}>{t('style.subtitle')}</div>

        <Group title={t('style.group.brand')}>
          <div>
            <label style={ctlLbl}>{t('style.accent')}</label>
            <Palette colors={pal.accent} value={th.accent} onSelect={(c) => selColor('accent', c)} onAdd={(c) => addColor('accent', c)} onDelete={(c) => delColor('accent', c)} />
          </div>
          <div>
            <label style={ctlLbl}>{t('style.font')}</label>
            <Seg value={th.font} onChange={(v) => set({ font: v })} options={[{ v: 'sans', label: t('style.opt.sans') }, { v: 'serif', label: t('style.opt.serif') }, { v: 'round', label: t('style.opt.round') }, { v: 'mono', label: t('style.opt.mono') }]} />
          </div>
        </Group>

        <Group title={t('style.group.background')}>
          <div>
            <label style={ctlLbl}>{t('style.formCard')}</label>
            <Palette colors={pal.cardBg} value={th.cardBg} onSelect={(c) => selColor('cardBg', c)} onAdd={(c) => addColor('cardBg', c)} onDelete={(c) => delColor('cardBg', c)} />
          </div>
          <div>
            <label style={ctlLbl}>{t('style.page')}</label>
            <Palette colors={pal.pageBg} value={th.pageBg} onSelect={(c) => selColor('pageBg', c)} onAdd={(c) => addColor('pageBg', c)} onDelete={(c) => delColor('pageBg', c)} />
          </div>
        </Group>

        <Group title={t('style.group.fields')}>
          <div><label style={ctlLbl}>{t('style.corners')}</label><Seg value={th.corners} onChange={(v) => set({ corners: v })} options={[{ v: 'sharp', label: t('style.opt.sharp') }, { v: 'rounded', label: t('style.opt.rounded') }, { v: 'pill', label: t('style.opt.pill') }]} /></div>
          <div><label style={ctlLbl}>{t('style.fieldStyle')}</label><Seg value={th.fieldStyle} onChange={(v) => set({ fieldStyle: v })} options={[{ v: 'outline', label: t('style.opt.outline') }, { v: 'filled', label: t('style.opt.filled') }, { v: 'underline', label: t('style.opt.underline') }]} /></div>
          <div><label style={ctlLbl}>{t('style.labelWeight')}</label><Seg value={th.labelWeight} onChange={(v) => set({ labelWeight: v })} options={[{ v: 'regular', label: t('style.opt.regular') }, { v: 'medium', label: t('style.opt.medium') }, { v: 'bold', label: t('style.opt.bold') }]} /></div>
        </Group>

        <Group title={t('style.group.button')}>
          <div><label style={ctlLbl}>{t('style.fieldStyle')}</label><Seg value={th.buttonStyle} onChange={(v) => set({ buttonStyle: v })} options={[{ v: 'solid', label: t('style.opt.solid') }, { v: 'outline', label: t('style.opt.outline') }]} /></div>
          <div><label style={ctlLbl}>{t('style.width')}</label><Seg value={th.buttonWidth} onChange={(v) => set({ buttonWidth: v })} options={[{ v: 'full', label: t('style.opt.full') }, { v: 'auto', label: t('style.opt.auto') }]} /></div>
        </Group>

        <Group title={t('style.group.layout')}>
          <div><label style={ctlLbl}>{t('style.formWidth')}</label><Seg value={th.formWidth} onChange={(v) => set({ formWidth: v })} options={[{ v: 'narrow', label: t('style.opt.narrow') }, { v: 'regular', label: t('style.opt.regular') }, { v: 'wide', label: t('style.opt.wide') }]} /></div>
          <div><label style={ctlLbl}>{t('style.spacing')}</label><Seg value={th.spacing} onChange={(v) => set({ spacing: v })} options={[{ v: 'compact', label: t('style.opt.compact') }, { v: 'cozy', label: t('style.opt.cozy') }, { v: 'roomy', label: t('style.opt.roomy') }]} /></div>
          <div><label style={ctlLbl}>{t('style.cardShadow')}</label><Seg value={th.shadow} onChange={(v) => set({ shadow: v })} options={[{ v: 'none', label: t('style.opt.none') }, { v: 'soft', label: t('style.opt.soft') }, { v: 'strong', label: t('style.opt.strong') }]} /></div>
          <div><label style={ctlLbl}>{t('style.cardBorder')}</label><Seg value={th.cardBorder} onChange={(v) => set({ cardBorder: v })} options={[{ v: 'none', label: t('style.opt.none') }, { v: 'hairline', label: t('style.opt.hairline') }, { v: 'bold', label: t('style.opt.bold') }]} /></div>
          <div><label style={ctlLbl}>{t('style.cardCorners')}</label><Seg value={th.cardCorners} onChange={(v) => set({ cardCorners: v })} options={[{ v: 'sharp', label: t('style.opt.sharp') }, { v: 'rounded', label: t('style.opt.rounded') }, { v: 'round', label: t('style.opt.round') }]} /></div>
          <div><label style={ctlLbl}>{t('style.placement')}</label><Seg value={th.placement} onChange={(v) => set({ placement: v })} options={[{ v: 'top', label: t('style.opt.top') }, { v: 'center', label: t('style.opt.center') }]} /></div>
        </Group>

        <div style={{ padding: '18px 0' }}>
          <button type="button" onClick={() => onChange({ ...DEFAULT_THEME })} style={{ width: '100%', height: 38, borderRadius: 6, border: `1px solid ${C.n200}`, background: C.n0, color: C.n800, font: `600 13px ${FF}`, cursor: 'pointer' }}>{t('style.reset')}</button>
        </div>
      </div>

      {/* live preview */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.n100 }}>
        <div style={{ height: 46, borderBottom: `1px solid ${C.n150}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: `500 12px ${FF}`, color: C.n600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.suc500 }} />{t('style.livePreview')}
          </div>
          <div style={{ display: 'flex', border: `1px solid ${C.n200}`, borderRadius: 6, overflow: 'hidden' }}>
            {(['desktop', 'mobile'] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} style={{ height: 28, padding: '0 12px', border: 'none', borderLeft: d === 'mobile' ? `1px solid ${C.n200}` : 'none', background: device === d ? C.p600 : C.n0, color: device === d ? '#fff' : C.n700, font: `600 12px ${FF}`, cursor: 'pointer' }}>{t(`style.device.${d}`)}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'var(--sfb-page-align, flex-start)', background: 'var(--sfb-page-bg, #f5f5f9)', ...vars }}>
          <style dangerouslySetInnerHTML={{ __html: FORM_CSS }} />
          <div
            data-sfb-fields={th.fieldStyle}
            style={{
              ...vars,
              width: '100%', maxWidth: device === 'mobile' ? 380 : 'var(--sfb-form-width, 600px)',
              background: 'var(--sfb-bg, #fff)', color: 'var(--sfb-text, #1f1f33)',
              fontFamily: 'var(--sfb-font)', border: 'var(--sfb-card-border, 1px solid var(--sfb-border, #dcdce4))',
              borderRadius: 'var(--sfb-card-radius, 14px)', boxShadow: 'var(--sfb-shadow, none)', padding: '36px 40px',
            }}
          >
            <PreviewForm title={title} description={description} fields={fields} settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
}
