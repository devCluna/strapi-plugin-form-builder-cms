/**
 * The form's visual CSS — a single source shared by the public embed
 * (server injects it) and the admin Style live preview (injected into a
 * scoped container). Everything keys off `--sfb-*` variables and the
 * `data-sfb-fields` attribute, so one stylesheet drives both surfaces.
 */
export const FORM_CSS = `
.sfb-form { font-family: var(--sfb-font, inherit); text-align: left; color: var(--sfb-text, #1f1f33); line-height: 1.5; }
.sfb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sfb-gap, 20px); margin-bottom: var(--sfb-gap, 20px); }
.sfb-field { display: flex; flex-direction: column; gap: 6px; }
.sfb-label { font-size: 13px; font-weight: var(--sfb-label-weight, 600); color: var(--sfb-text, #1f1f33); }
.sfb-required { color: #ee5e52; }
.sfb-input { width: 100%; height: 44px; padding: 0 13px; border: 1px solid var(--sfb-border, #dcdce4); border-radius: var(--sfb-radius, 8px); font-size: 14px; font-family: inherit; color: var(--sfb-text, #1f1f33); background: var(--sfb-input-bg, #fff); box-sizing: border-box; outline: none; transition: border-color .15s, box-shadow .15s; }
.sfb-input::placeholder { color: var(--sfb-muted, #8a8a9e); }
.sfb-input:focus { border-color: var(--sfb-accent, #4945ff); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sfb-accent, #4945ff) 22%, transparent); }
textarea.sfb-input { height: auto; min-height: 104px; padding: 11px 13px; resize: vertical; }
select.sfb-input { appearance: none; cursor: pointer; }
[data-sfb-fields="underline"] .sfb-input { border: none; border-bottom: 2px solid var(--sfb-border, #dcdce4); border-radius: 0; padding-left: 2px; padding-right: 2px; background: transparent; }
[data-sfb-fields="underline"] .sfb-input:focus { box-shadow: none; border-bottom-color: var(--sfb-accent, #4945ff); }
[data-sfb-fields="filled"] .sfb-input { border-color: transparent; }
[data-sfb-fields="filled"] .sfb-input:focus { border-color: var(--sfb-accent, #4945ff); }
.sfb-radio-group { display: flex; flex-direction: column; gap: 8px; }
.sfb-radio-label, .sfb-checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--sfb-text, #1f1f33); cursor: pointer; }
.sfb-radio-label input, .sfb-checkbox-label input { accent-color: var(--sfb-accent, #4945ff); width: 16px; height: 16px; cursor: pointer; }
.sfb-help { font-size: 12px; color: var(--sfb-muted, #666687); margin: 0; }
.sfb-btn { width: var(--sfb-btn-width, 100%); background: var(--sfb-btn-bg, var(--sfb-accent, #4945ff)); color: var(--sfb-btn-color, #fff); border: var(--sfb-btn-border, 2px solid transparent); border-radius: var(--sfb-radius, 8px); padding: 13px 26px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: opacity .15s; }
.sfb-btn:hover { opacity: .9; }
.sfb-btn:disabled { opacity: .6; cursor: not-allowed; }
.sfb-heading { font-size: 18px; font-weight: 700; color: var(--sfb-text, #1f1f33); margin: 4px 0; }
.sfb-paragraph { font-size: 14px; color: var(--sfb-muted, #666687); margin: 4px 0; line-height: 1.6; }
.sfb-divider { border: none; border-top: 1px solid var(--sfb-border, #dcdce4); margin: 4px 0; }
.sfb-success { font-size: 15px; color: #27ae60; font-weight: 600; }
.sfb-error { font-size: 13px; color: #ee5e52; margin-bottom: 12px; }
.sfb-field-error { font-size: 12px; color: #ee5e52; margin: 4px 0 0; }
.sfb-field--error .sfb-input, .sfb-field--error .sfb-radio-group { border-color: #ee5e52 !important; }
.sfb-field--error > .sfb-label { color: #ee5e52; }
`;
