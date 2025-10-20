# Leora Admin Portal - Production Ready

## Live Deployment

- **Production URL**: https://web-hyzcyod60-gregs-projects-61e51c01.vercel.app
- **GitHub**: https://github.com/ghogue02/leora-admin-portal
- **Auto-deploy**: Enabled (every push to main)

## Features

- Dashboard with metrics and alerts
- Customer management (CRUD, search, filter, bulk operations)
- Sales rep management with performance tracking
- Order management and invoice generation
- User account and permission management
- Inventory and product management
- Audit logging system
- Bulk operations with CSV import/export
- Data integrity monitoring

## Access

- Root: Redirects to `/sales/login`
- Sales Portal: `/sales`
- Admin Portal: `/admin` (requires sales.admin role)
- Customer Portal: `/portal`

---

Built with Next.js 15, React 19, Prisma, PostgreSQL, and Tailwind CSS.
