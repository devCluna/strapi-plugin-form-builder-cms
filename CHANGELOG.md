# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
