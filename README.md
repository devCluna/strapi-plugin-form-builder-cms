# strapi-plugin-form-builder-cms

[![npm version](https://img.shields.io/npm/v/strapi-plugin-form-builder-cms.svg)](https://www.npmjs.com/package/strapi-plugin-form-builder-cms)
[![npm downloads](https://img.shields.io/npm/dm/strapi-plugin-form-builder-cms.svg)](https://www.npmjs.com/package/strapi-plugin-form-builder-cms)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Strapi 5](https://img.shields.io/badge/Strapi-5.x-2F2D74?logo=strapi)](https://strapi.io)

A visual drag-and-drop form builder plugin for [Strapi 5](https://strapi.io). Create, publish and embed forms on any website without writing a single line of backend code.

---

## Features

- **Drag-and-drop builder** — reorder fields visually inside the Strapi admin.
- **Starter templates** — begin from Contact, Newsletter, Feedback, Job application, Event RSVP, or a blank form.
- **Rich field types** — text, email, number, phone, URL, password, date, time, textarea, select, radio, checkbox, checkbox-group, hidden, heading, paragraph, divider.
- **Field validation** — required, minLength, maxLength, min value, max value, email, URL, regex pattern — all configurable per field with custom error messages.
- **Draft / Publish** — draft edits stay private; the public page and embed always serve the last **published** version, so saving a draft never affects the live form.
- **Public page** — one toggle generates a hosted page at `/api/strapi-plugin-form-builder-cms/page/:slug` (available once the form is published).
- **Embed script** — a single `<script>` tag renders the form on any external site with zero dependencies.
- **Spam & limits** — honeypot field plus optional per-IP hourly rate limiting.
- **CAPTCHA** — optional Cloudflare Turnstile or Google reCAPTCHA v2 per form, verified server-side (fail-closed). The secret key never reaches the browser.
- **Hidden tracking fields** — capture UTM parameters, referrers or campaign IDs from the page URL into every submission.
- **Visual style editor** — a dedicated Style mode with a live Desktop/Mobile preview: accent, fonts, backgrounds, corners, field & button styles, spacing, shadow, card border and placement, plus editable colour palettes. No CSS required; changes follow draft / publish.
- **Submission inbox** — search, filter by status (new / read / archived), bulk mark-as-read / archive / delete, per-form column picker, a detail drawer with next/previous navigation, and CSV export.
- **Form preview** — preview the rendered form inside the admin before publishing.

---

## Requirements

| Dependency | Version |
|---|---|
| Strapi | `^5.0.0` |
| Node.js | `>=18.0.0` |
| React | `^18.0.0` |

---

## Installation

```bash
# npm
npm install strapi-plugin-form-builder-cms

# yarn
yarn add strapi-plugin-form-builder-cms
```

### Enable the plugin

Add the plugin to your Strapi configuration:

```js
// config/plugins.js  (or config/plugins.ts)
module.exports = {
  'strapi-plugin-form-builder-cms': {
    enabled: true,
  },
};
```

### Rebuild and restart

```bash
npm run build
npm run develop
```

The **Form Builder** entry will appear in the Strapi admin sidebar.

---

## Usage

### 1 — Create a form

1. Open **Form Builder** in the sidebar.
2. Click **Create form** and pick a starter template or a blank form.
3. Click field types in the left palette to add them to the canvas, then drag to reorder.
4. Click any field to open its settings panel — **General** (label, name, placeholder, required, width) and **Validation** tabs.
5. Click **Save draft** to persist without affecting the live form, or **Publish** to update what the public sees.

### 2 — Embed on your website

Open the form and click the **Embed** button to copy the snippet:

```html
<div id="sfb-form-{id}"></div>
<script
  src="https://your-strapi-domain.com/api/strapi-plugin-form-builder-cms/embed.js"
  data-form-id="{id}"
  async
></script>
```

Paste both tags wherever you want the form to appear. The script is self-contained — no external dependencies, no build step required.

### 3 — Public page (optional)

Toggle **Public page** in the form settings drawer and **publish** the form. A shareable URL is generated:

```
https://your-strapi-domain.com/api/strapi-plugin-form-builder-cms/page/{slug}
```

Share or link directly to this page — it renders the form in a clean, responsive layout served by Strapi itself.

> The public page, embed and submit endpoint only serve **published** forms. An unpublished (draft) form returns `404`.

### 4 — View submissions

Click **Submissions** on any form from the list page. Search, filter by status, and pick which columns to show. Open a submission for a detail drawer with next/previous navigation; mark as read, archive or delete — individually or in bulk. Export everything to **CSV**.

---

## Public API routes

These routes require no authentication and are safe to call from the browser.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/strapi-plugin-form-builder-cms/embed.js` | Serve the embed script |
| `GET` | `/api/strapi-plugin-form-builder-cms/forms/:id/embed-schema` | Form schema by numeric ID |
| `GET` | `/api/strapi-plugin-form-builder-cms/forms/:slug/schema` | Form schema by slug |
| `GET` | `/api/strapi-plugin-form-builder-cms/page/:slug` | Hosted public page |
| `POST` | `/api/strapi-plugin-form-builder-cms/forms/:slug/submit` | Submit form data |

### Submit payload

```json
{
  "data": {
    "fieldName": "value",
    "checkboxGroupField": ["option1", "option2"]
  }
}
```

### Submit response — success

```json
{ "success": true, "successMessage": "Thank you!" }
```

### Submit response — validation error (`400`)

```json
{
  "success": false,
  "errors": {
    "email": ["Enter a valid email address"],
    "name": ["Minimum 3 characters"]
  }
}
```

### Submit response — CAPTCHA failure (`400`) or rate limit (`429`)

```json
{ "success": false, "message": "Captcha verification failed. Please try again." }
```

---

## Field types

| Type | Description |
|---|---|
| `text` | Single-line text input |
| `email` | Email input (auto-validates format) |
| `number` | Numeric input (auto-validates format) |
| `phone` | Tel input |
| `url` | URL input (auto-validates format) |
| `password` | Password input |
| `date` | Date picker |
| `time` | Time picker |
| `textarea` | Multi-line text |
| `select` | Dropdown — configure options in the settings panel |
| `radio` | Radio group — configure options in the settings panel |
| `checkbox` | Single checkbox (agree / consent) |
| `checkbox-group` | Multiple checkboxes — configure options in the settings panel |
| `hidden` | Invisible tracking field — prefilled from a URL query parameter (e.g. `utm_source`) or a default value, then stored with the submission |
| `heading` | Non-input heading label |
| `paragraph` | Non-input descriptive text |
| `divider` | Horizontal rule to separate sections |

---

## Validation rules

| Rule | Applies to | Description |
|---|---|---|
| `required` | All input fields | Field must not be empty |
| `minLength` | Text fields | Minimum character count |
| `maxLength` | Text fields | Maximum character count |
| `min` | `number` | Minimum numeric value |
| `max` | `number` | Maximum numeric value |
| `email` | Text fields | Must be a valid email address |
| `url` | Text fields | Must be a valid URL |
| `pattern` | Text fields | Must match a regular expression |

Each rule accepts an optional **custom error message**. The same rule type cannot be added twice to the same field.

---

## Form settings

| Setting | Description |
|---|---|
| Description | Optional intro text shown above the form |
| Submit button text | Label on the submit button |
| Success message | Message shown after a successful submission |
| Public page | Generates a hosted page URL for the form (served once published) |
| Honeypot protection | Adds a hidden field to silently discard bot submissions |
| Rate limiting | Caps submissions per IP each hour (configurable max) |
| CAPTCHA | None, Cloudflare Turnstile or Google reCAPTCHA v2 — with a **Test secret key** button to validate credentials before publishing |
| Custom styles | Enables the visual **Style** editor for the form (see below) |
| Redirect URL | Where to send the visitor after a successful submit |

---

## CAPTCHA

Protect a form with a human-verification challenge. In the form settings drawer, under **Spam & limits → CAPTCHA**, pick a provider and paste your keys:

| Provider | Where to get keys |
|---|---|
| **Cloudflare Turnstile** | [Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) |
| **Google reCAPTCHA v2** | [reCAPTCHA admin console](https://www.google.com/recaptcha/admin) |

- The **site key** is public — it is sent to the browser to render the widget.
- The **secret key** is private — it is stored server-side and **never** exposed in the public schema. Use the **Test secret key** button to validate it against the provider before publishing.
- Submissions are verified server-side and **fail closed**: an invalid or missing token is rejected with `400`, even if the client is bypassed.
- If the widget can't load (e.g. an invalid site key), the visitor sees a clear message instead of a silent failure.

> The public page relaxes its Content-Security-Policy just enough to load the chosen provider's script and iframe — only when a CAPTCHA is configured.

## Hidden tracking fields

Add a **hidden** field to capture campaign data into every submission without showing anything to the visitor:

- **Name** — the key stored with the submission (e.g. `utm_source`).
- **Prefill from URL parameter** — a query-string parameter to read from the page URL. If the form is opened at `?utm_source=google`, that value is captured automatically.
- **Default value** — used when the URL parameter is absent.

The captured value is stored with the submission and included in the CSV export.

---

## Styling

### Visual style editor (no code)

Turn on **Custom styles** in the form's Settings drawer to reveal a **Style** tab next to **Fields**. It opens a dedicated editor with a live Desktop/Mobile preview:

- **Brand** — accent colour, font (Sans / Serif / Round / Mono).
- **Background** — form card and page colours.
- **Fields** — corners (Sharp / Rounded / Pill), style (Outline / Filled / Underline), label weight.
- **Button** — style (Solid / Outline) and width (Full / Auto).
- **Layout** — form width, spacing, card shadow, card border, card corners, and placement (Top / Center).
- **Colour palettes** are editable — add colours with the picker, remove any swatch; they're saved with the form. **Reset to default theme** restores everything.

Everything resolves to a small set of `--sfb-*` CSS variables applied to both the preview and the public form, so the preview matches production. Style changes follow the normal **draft / publish** flow — they go live when you publish.

### Overriding styles from your own site

The embedded form renders in the host page's DOM (no shadow DOM), so you can also restyle it from your own site.

**CSS variables** (the recommended, stable API):

```css
#sfb-form-1 {           /* the container div, or any ancestor */
  --sfb-accent: #e11d48;
  --sfb-radius: 12px;
}
```

**Or target the classes directly** — `.sfb-form`, `.sfb-field`, `.sfb-label`, `.sfb-input`, `.sfb-btn`, `.sfb-help`, `.sfb-error`, `.sfb-success`. The plugin's rules use single-class specificity; to reliably win, scope your selector to the form container:

```css
#sfb-form-1 .sfb-input { border-width: 2px; }
```

**Per-field class** — give any field a **CSS class** in its settings panel (e.g. `newsletter-email`). It's added to that field's wrapper, so you can style one field from your own stylesheet:

```css
.newsletter-email input      { border-color: #e11d48; }
.newsletter-email .sfb-label { font-weight: 700; }
```

The class sits on the field's wrapper (not the `<input>`), so a descendant selector like `.newsletter-email input` naturally out-specifies the plugin's own rules — no `!important` needed.

---

## Development

Clone the repo and link the plugin to a local Strapi project:

```bash
git clone https://github.com/devCluna/strapi-plugin-form-builder-cms.git
cd strapi-plugin-form-builder-cms
npm install

# watch mode — rebuilds on save
npm run watch:link
```

In your local Strapi project:

```bash
npm run develop
```

Run the test suite (Vitest) and type-checks:

```bash
npm test              # unit tests
npm run test:ts:back  # type-check the server
npm run test:ts:front # type-check the admin
```

---

## Contributing

Pull requests are welcome. For major changes please open an issue first to discuss what you would like to change.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/).
4. Open a pull request.

---

## Roadmap

- [x] Export submissions as CSV
- [x] CAPTCHA / spam protection (Cloudflare Turnstile · reCAPTCHA v2)
- [x] Hidden tracking fields (UTM / referrer capture)
- [x] Visual style editor (theming, live preview)
- [ ] Email notifications on new submission
- [ ] File upload field type
- [ ] Multi-step / wizard forms
- [ ] Webhook on submit
- [ ] Version history / restore

Have a feature request? [Open an issue](https://github.com/devCluna/strapi-plugin-form-builder-cms/issues).

---

## License

[MIT](LICENSE)

---

## Author

**dev.cluna** — [dev.cluna@gmail.com](mailto:dev.cluna@gmail.com)
