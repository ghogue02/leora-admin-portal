# User Credentials (After Security Fix)

## All Active Users - Password Reset

**Date:** October 20, 2025
**Reason:** Security fix - password verification was not implemented

### Current Password for All Users

**Password:** `SalesDemo2025!`

This password has been properly hashed using bcrypt and set for all active users in the database.

### User Accounts

| Email | Full Name | Password | Has Sales Rep |
|-------|-----------|----------|---------------|
| travis@wellcraftedbeverage.com | Travis Vernon | SalesDemo2025! | ✅ Yes |
| kelly@wellcraftedbeverage.com | Kelly Neel | SalesDemo2025! | ✅ Yes |
| carolyn@wellcraftedbeverage.com | Carolyn Vernon | SalesDemo2025! | ✅ Yes |
| admin@wellcraftedbeverage.com | Travis Vernon (Admin) | SalesDemo2025! | Check |
| greg.hogue@gmail.com | Greg Hogue | SalesDemo2025! | Check |

## Login URLs

- **Sales Portal:** https://web-omega-five-81.vercel.app/sales/login
- **Admin Portal:** https://web-omega-five-81.vercel.app/admin/login

## Security Fix Details

### What Was Fixed
- Added password verification using bcrypt in the sales login endpoint
- Previously, ANY password would work if you knew the email address
- Now passwords are properly verified against bcrypt hashes

### Files Changed
- `src/app/api/sales/auth/login/route.ts` - Added bcrypt.compare()
- `package.json` - Added bcryptjs dependency

### Password Hash Script

To generate new password hashes, use:

```bash
npx tsx scripts/reset-password.ts
```

This will output the bcrypt hash for the password "SalesDemo2025!" which you can use in SQL updates.

## Important Notes

⚠️ **CHANGE THESE PASSWORDS IN PRODUCTION!**

These are temporary passwords set during the security fix. For production use:
1. Create unique passwords for each user
2. Use the password reset script to generate hashes
3. Update the database using SQL or the admin interface

## Troubleshooting

If login fails:
1. Verify the email address is correct (use full @wellcraftedbeverage.com domain)
2. Check that the user has an active sales rep profile
3. Ensure the password is exactly: `SalesDemo2025!` (case-sensitive, with exclamation mark)
