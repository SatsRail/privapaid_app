# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

## [0.9.0] - 2026-03-20

### Added

- **SWR client-side data caching** — comments, exchanges, products, and product types now use SWR for automatic caching and deduplication (F-42)
- **Rate limiting** on public endpoints: signup (5/min), checkout (20/min), comments (10/min), image upload (30/min) with `X-RateLimit-*` headers (F-33)
- **Soft-delete** support for Media, Channel, and Customer models with `deleted_at` field (F-36)
- **EXIF metadata stripping** on all image uploads via Sharp (F-29)
- **Modal accessibility** — ARIA roles, focus trapping, focus restoration, keyboard navigation (F-32)
- **i18n pluralization** — `_zero`, `_one`, `_other` suffix support in `t()` function (F-30)
- **Loading states** — `loading.tsx` skeleton loaders for root, admin, and channel routes (F-41)
- **Zod request validation** on all POST/PATCH/PUT API routes (F-11, F-27)
- **OpenAPI 3.0.3 spec** with Swagger UI at `/api-docs` (F-23)
- **Branded types** for encryption keys with runtime format validation (F-35)
- **CONTRIBUTING.md**, PR template, and issue templates (F-43)
- **CHANGELOG.md** and semantic versioning (F-44)
- **Docker resource limits** — memory and CPU caps on app and MongoDB containers (F-39)
- **BuildKit cache mounts** for faster Docker builds (F-45)

### Changed

- **Auth forms refactored** — shared components extracted to `src/components/auth/` reducing ~40% duplication (F-31)
- **Consistent timestamps** — `updated_at` enabled on all Mongoose models (F-34)
- Package renamed from `media` to `privapaid`, version bumped to 0.9.0

### Removed

- Unused `hello_controller.js` scaffold (F-47)

### Security

- CSRF protection via SameSite cookies and origin validation (F-01)
- HttpOnly session cookies with Secure flag (F-02)
- Content Security Policy headers (F-03)
- MongoDB injection prevention via Mongoose strict mode (F-04)
- Input length limits on all text fields (F-05)
- File upload validation (type, size, dimensions) (F-06)
- Secrets moved to environment variables (F-07)
- Admin session timeout (F-08)
- Audit logging for admin actions (F-09)

## [0.1.0] - 2026-03-01

### Added

- Initial PrivaPaid platform
- Next.js App Router with MongoDB/Mongoose
- Customer signup/login with NextAuth
- Admin panel for channels, media, categories, and products
- Lightning payment integration via SatsRail API
- Macaroon-based content access control
- Image upload to Cloudinary
- i18n support (English, Spanish)
- Docker deployment configuration
