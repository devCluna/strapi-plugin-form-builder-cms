# strapi-plugin-form-builder-cms

A visual drag-and-drop form builder plugin for [Strapi 5](https://strapi.io). Create, publish and embed forms on any website without writing a single line of backend code.

---

## Features

- **Drag-and-drop builder** — reorder fields visually inside the Strapi admin.
- **Rich field types** — text, email, number, phone, URL, password, date, time, textarea, select, radio, checkbox, checkbox-group, heading, paragraph, divider.
- **Field validation** — required, minLength, maxLength, min value, max value, email, URL, regex pattern — all configurable per field with custom error messages.
- **Draft / Publish** — save a draft without going live; publish when ready.
- **Public page** — one toggle generates a hosted page at `/api/strapi-plugin-form-builder-cms/page/:slug`.
- **Embed script** — a single `<script>` tag renders the form on any external site with zero dependencies.
- **Honeypot spam protection** — invisible field silently discards bot submissions.
- **Submission inbox** — view, filter by status (new / read / archived), inspect and delete submissions from the admin.
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
2. Click **New form**, give it a title.
3. Drag field types from the left palette onto the canvas.
4. Click any field to open its settings panel (label, name, placeholder, required, width, validation rules).
5. Click **Save draft** to persist without publishing, or **Publish** to make it live.

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

Toggle **Public page** in the form settings. A shareable URL is generated:

```
https://your-strapi-domain.com/api/strapi-plugin-form-builder-cms/page/{slug}
```

Share or link directly to this page — it renders the form in a clean, responsive layout served by Strapi itself.

### 4 — View submissions

Click **Submissions** on any form card from the list page. Filter by status, open a submission to see all field values, and update its status (new → read → archived) or delete it.

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
| Submit button text | Label on the submit button |
| Success message | Message shown after a successful submission |
| Honeypot protection | Adds a hidden field to silently discard bot submissions |
| Public page | Generates a hosted page URL for the form |

---

## Development

Clone the repo and link the plugin to a local Strapi project:

```bash
git clone https://github.com/dev-cluna/strapi-plugin-form-builder-cms.git
cd strapi-plugin-form-builder-cms
npm install

# watch mode — rebuilds on save
npm run watch:link
```

In your local Strapi project:

```bash
npm run develop
```

---

## Contributing

Pull requests are welcome. For major changes please open an issue first to discuss what you would like to change.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/).
4. Open a pull request.

---

## License

[MIT](LICENSE)

---

## Author

**dev.cluna** — [dev.cluna@gmail.com](mailto:dev.cluna@gmail.com)
