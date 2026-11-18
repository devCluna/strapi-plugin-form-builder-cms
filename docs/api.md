# Public API

[← Back to the README](https://github.com/devCluna/strapi-plugin-form-builder-cms#readme)

These routes require no authentication and are safe to call from the browser. Use them to build your own form UI instead of the embed script.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/strapi-plugin-form-builder-cms/embed.js` | Serve the embed script |
| `GET` | `/api/strapi-plugin-form-builder-cms/forms/:id/embed-schema` | Form schema by numeric ID |
| `GET` | `/api/strapi-plugin-form-builder-cms/forms/:slug/schema` | Form schema by slug |
| `GET` | `/api/strapi-plugin-form-builder-cms/page/:slug` | Hosted public page |
| `POST` | `/api/strapi-plugin-form-builder-cms/forms/:slug/submit` | Submit form data |

The schema, public page and submit routes only serve **published** forms. An unpublished (draft) form returns `404`.

## Submit payload

For forms without file fields (`application/json`):

```json
{
  "data": {
    "fieldName": "value",
    "checkboxGroupField": ["option1", "option2"]
  }
}
```

For forms with `file` fields (`multipart/form-data`):

- `data`: JSON string containing the non-file field values (same shape as above)
- `files.<fieldName>`: one or more file parts matching the `file` field's `name`

## Responses

### Success (`200`)

```json
{ "success": true, "successMessage": "Thank you!" }
```

### Validation error (`400`)

```json
{
  "success": false,
  "errors": {
    "email": ["Enter a valid email address"],
    "name": ["Minimum 3 characters"]
  }
}
```

### CAPTCHA failure (`400`) or rate limit (`429`)

```json
{ "success": false, "message": "Captcha verification failed. Please try again." }
```
