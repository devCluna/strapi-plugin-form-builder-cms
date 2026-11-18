# Form settings

[← Back to the README](https://github.com/devCluna/strapi-plugin-form-builder-cms#readme)

Open a form and click **Settings** to configure it.

| Setting | Description |
|---|---|
| Description | Optional intro text shown above the form |
| Submit button text | Label on the submit button |
| Success message | Message shown after a successful submission |
| Public page | Generates a hosted page URL for the form (served once published) |
| Honeypot protection | Adds a hidden field to silently discard bot submissions |
| Rate limiting | Caps submissions per IP each hour (configurable max) |
| CAPTCHA | None, Cloudflare Turnstile or Google reCAPTCHA v2, with a **Test secret key** button to validate credentials before publishing |
| Custom styles | Enables the visual **Style** editor for the form. See [Styling](https://github.com/devCluna/strapi-plugin-form-builder-cms/blob/main/docs/styling.md) |
| Redirect URL | Where to send the visitor after a successful submit |

## CAPTCHA

Protect a form with a human-verification challenge. In the form settings drawer, under **Spam & limits → CAPTCHA**, pick a provider and paste your keys:

| Provider | Where to get keys |
|---|---|
| **Cloudflare Turnstile** | [Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) |
| **Google reCAPTCHA v2** | [reCAPTCHA admin console](https://www.google.com/recaptcha/admin) |

- The **site key** is public. It is sent to the browser to render the widget.
- The **secret key** is private. It is stored server-side and **never** exposed in the public schema. Use the **Test secret key** button to validate it against the provider before publishing.
- Submissions are verified server-side and **fail closed**: an invalid or missing token is rejected with `400`, even if the client is bypassed.
- If the widget can't load (e.g. an invalid site key), the visitor sees a clear message instead of a silent failure.

> The public page relaxes its Content-Security-Policy just enough to load the chosen provider's script and iframe, and only when a CAPTCHA is configured.

## Hidden tracking fields

Add a **hidden** field to capture campaign data into every submission without showing anything to the visitor:

- **Name**: the key stored with the submission (e.g. `utm_source`).
- **Prefill from URL parameter**: a query-string parameter to read from the page URL. If the form is opened at `?utm_source=google`, that value is captured automatically.
- **Default value**: used when the URL parameter is absent.

The captured value is stored with the submission and included in the CSV export.
