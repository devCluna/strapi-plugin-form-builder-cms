# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc.1] - 2026-07-02

### Changed
- First release candidate — promotes the `1.0.0-alpha.4` feature set (draft/publish separation, per-submission field snapshots, full admin redesign). No functional changes since `1.0.0-alpha.4`.

---

## [1.0.0-alpha.4] - 2026-07-02

### ⚠️ Breaking
- Public serving now requires the form to be **published**. Previously the public page, embed schema and submit endpoint served the working record regardless of draft/publish state; now an unpublished form returns 404 and rejects submissions. Forms published before this release keep working via a fallback — **re-publish them once after upgrading** for the cleanest behavior.

### Added
- **Draft / Publish separation** — publishing freezes an immutable `publishedData` snapshot; the public form always serves that snapshot, so *Save draft* no longer affects the live form. An "Unpublished changes" indicator appears when the saved draft differs from what's published.
- **Per-submission field snapshot** — each submission stores the field schema used at submit time, so the detail view stays accurate even after fields are added, removed or renamed.
- **Form templates** — first-run onboarding and a "Create form" picker with 6 starters (Contact, Newsletter, Feedback, Job application, Event RSVP, Blank).
- **Forms list**: submissions-count column and search over title/slug.
- **Submissions**: bulk *mark as read / archive / delete*, text search, right-side detail drawer with prev/next navigation, and a per-form column picker (union of current fields + stored keys).
- Right-aligned "View live" link and a Settings slide-over drawer in the builder.

### Changed
- Full visual redesign of the forms list, builder and submissions screens to match the design system.
- Field settings panel split into General / Validation tabs; settings drawer changes apply on Save.
- Builder header shows a single status pill (Draft / Published / Unpublished changes).
- Submission detail always renders the stored data (never hides an answer); CSV export unchanged.
- Releases are now published from version tags (`v*`) on a single `main` branch.

### Fixed
- Coerce non-string form `description` to a string (fixed `[object Object]` in the settings drawer).
- Submission detail rows are baseline-aligned.

---

## [1.0.0-alpha.3] - 2026-04-04

### Changed
- Expanded npm keywords for better discoverability
- Added badges, comparison table and roadmap to README

---

## [1.0.0-alpha.2] - 2026-03-01

### Fixed
- GitHub release step — added `contents:write` permission and explicit tag push before release creation
- CI workflow: removed duplicate CI job from publish.yml

### Changed
- Bumped version to `1.0.0-alpha.2`

---

## [1.0.0-alpha.1] - 2026-02-01

### Added
- CI/CD pipeline with TypeScript checks, build verification and dry-run npm publish
- Dependabot for npm and GitHub Actions weekly updates
- Auto-tag on publish for alpha/beta/rc releases

### Fixed
- Removed stale compiled `.js` files from `src/` — Rollup was resolving them instead of `.ts` sources
- Added `--noEmit` to tsc type-check scripts to prevent JS file generation
- Replaced `yarn run -T` with `npx tsc` for CI compatibility

---

## [1.0.0] - 2026-01-15

### Added
- Visual drag-and-drop form builder in the Strapi admin
- 15+ field types: text, email, number, phone, URL, password, date, time, textarea, select, radio, checkbox, checkbox-group, heading, paragraph, divider
- Per-field validation rules: required, minLength, maxLength, min, max, email, URL, regex pattern with custom error messages
- Draft / Publish flow
- Public hosted page at `/api/strapi-plugin-form-builder-cms/page/:slug`
- Self-contained embed script — single `<script>` tag, zero dependencies
- Honeypot spam protection
- Submission inbox with status filtering (new / read / archived)
- Form preview modal inside the admin
- Embed code modal with one-click copy
