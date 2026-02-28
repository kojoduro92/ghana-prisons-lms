# Ghana Prisons Learning Portal (Phase 1)

Phase 1 is a responsive, offline-first prototype for the Ghana Prisons LMS with seeded data and role-based demo flows.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- npm

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo Accounts

- Admin: `admin / Prison1234`
- Management: `manager / Prison1234`
- Inmate: `GP-10234 / Prison1234`

All role sessions pass through biometric verification at `/verify-identity`.

## Core Routes

- Public:
  - `/landing`
  - `/admin-login`
  - `/verify-identity`
- Admin:
  - `/admin/dashboard`
  - `/admin/register-inmate`
  - `/admin/inmates/[studentId]`
  - `/admin/attendance`
  - `/admin/courses`
  - `/admin/certificates`
  - `/admin/reports`
  - `/admin/security`
- Inmate:
  - `/inmate/dashboard`
  - `/inmate/courses`
  - `/inmate/certificates`
- Management:
  - `/management/dashboard`

## Cohesive Journey Checks

### Admin
1. Login as `admin`.
2. Complete verification.
3. Register inmate.
4. Open inmate profile, issue certificate, check security logs.
5. Generate/export reports.

### Inmate
1. Login as `GP-10234`.
2. Complete verification.
3. Use dashboard attendance actions.
4. Browse courses.
5. Check issued certificates.

### Management
1. Login as `manager`.
2. Complete verification.
3. Review analytics dashboard.
4. Use operations drill-down and export analytics CSV.

## Scripts

```bash
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

## Notes

- Role routes are server-guarded by role/session checks.
- Data is seeded and persisted in browser storage for prototype behavior.
- `.vscode/` is gitignored to keep workspace-specific editor config out of commits.
