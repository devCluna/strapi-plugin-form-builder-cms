import React, { useEffect, useState } from 'react';
import { Lock } from '@strapi/icons';
import { C, FF } from '../ui';
import { PLUGIN_ID } from '../pluginId';

interface Props {
  formId: number | string;
  title: string;
  slug?: string | null;
  publishedAt?: string | null;
  publicPage?: boolean;
  open: boolean;
  onClose: () => void;
}

export function EmbedModal({ formId, title, slug, publishedAt, publicPage, open, onClose }: Props) {
  const [tab, setTab] = useState<'script' | 'link'>('script');
  const [copied, setCopied] = useState(false);

  // Share link only works when the public page is enabled; drop back to script otherwise.
  const canShare = !!publicPage && !!slug;
  useEffect(() => { if (!canShare && tab === 'link') setTab('script'); }, [canShare, tab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const origin = window.location.origin;
  const embedSrc = `${origin}/api/${PLUGIN_ID}/embed.js`;
  const url = slug ? `${origin}/api/${PLUGIN_ID}/page/${slug}` : '';
  const snippet = `<!-- ${title} -->\n<div id="sfb-form-${formId}"></div>\n<script\n  src="${embedSrc}"\n  data-form-id="${formId}"\n  async\n></script>`;
  const published = !!publishedAt;

  const copy = () => {
    navigator.clipboard.writeText(tab === 'script' ? snippet : url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tabBtn = (id: 'script' | 'link', label: string) => (
    <button type="button" onClick={() => setTab(id)} style={{ padding: '8px 12px', font: `600 13px ${FF}`, color: tab === id ? C.p700 : C.n500, borderBottom: `2px solid ${tab === id ? C.p600 : 'transparent'}`, marginBottom: -1, cursor: 'pointer', background: 'none', border: 'none' }}>{label}</button>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(33,33,52,.4)', zIndex: 50 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, maxWidth: '96vw', maxHeight: '90vh', background: C.n0, borderRadius: 8, boxShadow: '0 2px 15px rgba(33,33,52,.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 51 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: `1px solid ${C.n150}` }}>
          <h3 style={{ font: `700 16px ${FF}`, color: C.n900, margin: 0 }}>Embed “{title}”</h3>
          <button type="button" onClick={onClose} title="Close" style={{ width: 30, height: 30, borderRadius: 5, color: C.n500, border: 'none', background: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {published ? (
            <>
              <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.n150}` }}>
                {tabBtn('script', 'Script embed')}
                {canShare && tabBtn('link', 'Share link')}
              </div>

              {tab === 'script' ? (
                <div>
                  <div style={{ font: `600 12px ${FF}`, color: C.n700, marginBottom: 8 }}>Paste this snippet where the form should appear</div>
                  <div style={{ background: C.n900, borderRadius: 6, padding: '15px 16px', font: `400 12.5px ui-monospace, Menlo, monospace`, color: '#c9c9e6', lineHeight: 1.75, wordBreak: 'break-all' }}>
                    <span style={{ color: '#6b7280' }}>&lt;!-- {title} --&gt;</span><br />
                    <span style={{ color: '#8ad6a1' }}>&lt;div</span> <span style={{ color: '#f0c987' }}>id</span>=<span style={{ color: '#a5b4fc' }}>"sfb-form-{formId}"</span><span style={{ color: '#8ad6a1' }}>&gt;&lt;/div&gt;</span><br />
                    <span style={{ color: '#8ad6a1' }}>&lt;script</span><br />
                    &nbsp;&nbsp;<span style={{ color: '#f0c987' }}>src</span>=<span style={{ color: '#a5b4fc' }}>"{embedSrc}"</span><br />
                    &nbsp;&nbsp;<span style={{ color: '#f0c987' }}>data-form-id</span>=<span style={{ color: '#a5b4fc' }}>"{formId}"</span> <span style={{ color: '#f0c987' }}>async</span><br />
                    <span style={{ color: '#8ad6a1' }}>&gt;&lt;/script&gt;</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ font: `600 12px ${FF}`, color: C.n700, marginBottom: 8 }}>Shareable link</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eafbe7', border: '1px solid #c6f0c2', borderRadius: 4, padding: '8px 10px', font: `500 12px ui-monospace, Menlo, monospace`, color: C.suc700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.suc600, flex: 'none' }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, font: `600 12px ${FF}`, color: C.n800, border: `1px solid ${C.n200}`, borderRadius: 4, padding: '6px 12px', textDecoration: 'none' }}>Open live form ↗</a>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: `400 11px ${FF}`, color: C.suc700 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.suc600 }} />
                  Live — this form has a published version.
                </span>
                <button type="button" onClick={copy} style={{ height: 36, padding: '0 16px', borderRadius: 4, background: C.p600, color: '#fff', font: `600 13px ${FF}`, border: 'none', cursor: 'pointer' }}>
                  {copied ? 'Copied ✓' : (tab === 'script' ? 'Copy snippet' : 'Copy link')}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '26px 10px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: C.wrn100, border: '1px solid #f2d9a6', color: C.wrn600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock width="26px" height="26px" fill="currentColor" />
              </div>
              <div style={{ font: `700 16px ${FF}`, color: C.n900 }}>Publish to get an embed</div>
              <p style={{ font: `400 13px ${FF}`, color: C.n500, maxWidth: 320, lineHeight: 1.55, margin: 0 }}>
                Embedding and the shareable link become available once you publish this form.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
