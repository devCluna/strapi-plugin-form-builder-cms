# Fields and validation

[← Back to the README](https://github.com/devCluna/strapi-plugin-form-builder-cms#readme)

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
| `file` | File upload. See [File uploads](#file-uploads) below |
| `select` | Dropdown. Configure options in the settings panel |
| `radio` | Radio group. Configure options in the settings panel |
| `checkbox` | Single checkbox (agree / consent) |
| `checkbox-group` | Multiple checkboxes. Configure options in the settings panel |
| `hidden` | Invisible tracking field, prefilled from a URL query parameter (e.g. `utm_source`) or a default value, then stored with the submission. See [Hidden tracking fields](https://github.com/devCluna/strapi-plugin-form-builder-cms/blob/main/docs/settings.md#hidden-tracking-fields) |
| `heading` | Non-input heading label |
| `paragraph` | Non-input descriptive text |
| `divider` | Horizontal rule to separate sections |

## File uploads

A `file` field has configurable allowed extensions, a max file size (up to 25 MB) and single or multiple files.

- Every file is checked against an extension allow-list and its file signature before it is stored.
- Files go to Strapi's Media Library, in the `API Uploads` folder.
- Files are served by your upload provider, so with a public provider anyone who has the URL can open them. With a private provider (e.g. a private S3 bucket) the admin shows short-lived signed links, while the CSV export keeps the stored, unsigned URL.
- Files are removed when the submission or the form is deleted.

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

Rules are checked on the server, so a submission sent straight to the API is validated the same way.
