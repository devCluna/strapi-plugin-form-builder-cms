# Styling

[← Back to the README](https://github.com/devCluna/strapi-plugin-form-builder-cms#readme)

## Visual style editor (no code)

Turn on **Custom styles** in the form's Settings drawer to reveal a **Style** tab next to **Fields**. It opens a dedicated editor with a live Desktop/Mobile preview:

- **Brand**: accent colour, font (Sans / Serif / Round / Mono).
- **Background**: form card and page colours.
- **Fields**: corners (Sharp / Rounded / Pill), style (Outline / Filled / Underline), label weight.
- **Button**: style (Solid / Outline) and width (Full / Auto).
- **Layout**: form width, spacing, card shadow, card border, card corners, and placement (Top / Center).
- **Colour palettes** are editable. Add colours with the picker or remove any swatch; they're saved with the form. **Reset to default theme** restores everything.

Everything resolves to a small set of `--sfb-*` CSS variables applied to both the preview and the public form, so the preview matches production. Style changes follow the normal **draft / publish** flow: they go live when you publish.

## Overriding styles from your own site

The embedded form renders in the host page's DOM (no shadow DOM), so you can also restyle it from your own site.

**CSS variables** (the recommended, stable API):

```css
#sfb-form-1 {           /* the container div, or any ancestor */
  --sfb-accent: #e11d48;
  --sfb-radius: 12px;
}
```

**Or target the classes directly**: `.sfb-form`, `.sfb-field`, `.sfb-label`, `.sfb-input`, `.sfb-btn`, `.sfb-help`, `.sfb-error`, `.sfb-success`. The plugin's rules use single-class specificity; to reliably win, scope your selector to the form container:

```css
#sfb-form-1 .sfb-input { border-width: 2px; }
```

**Per-field class**: give any field a **CSS class** in its settings panel (e.g. `newsletter-email`). It's added to that field's wrapper, so you can style one field from your own stylesheet:

```css
.newsletter-email input      { border-color: #e11d48; }
.newsletter-email .sfb-label { font-weight: 700; }
```

The class sits on the field's wrapper (not the `<input>`), so a descendant selector like `.newsletter-email input` naturally out-specifies the plugin's own rules. No `!important` needed.
