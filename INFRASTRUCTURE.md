# Infrastructure Documentation

## Database

**Provider**: Supabase Pro (Paid Tier)
**Region**: us-east-1 (AWS US East)
**Database**: PostgreSQL 15
**Connection Pooling**: pgBouncer (port 6543)
**Direct Connection**: Port 5432 (also available)

### Important Notes:
- **Pro tier** = Database does NOT auto-pause
- If database is unreachable, likely AWS outage in us-east-1
- Check AWS status: https://health.aws.amazon.com/health/status
- Check Supabase status: https://status.supabase.com

## Hosting

**Platform**: Vercel
**GitHub**: https://github.com/ghogue02/leora-admin-portal
**Production URL**: https://web-omega-five-81.vercel.app

### Auto-Deployment:
- Every push to `main` branch triggers deployment
- Build time: ~2-3 minutes
- Environment variables configured in Vercel

## Environment Variables

**Critical Variables** (must have NO trailing spaces/newlines):
- `DATABASE_URL` - Supabase connection string (pooler, port 6543)
- `DEFAULT_TENANT_SLUG` - "well-crafted" (NO newlines!)
- `NEXT_PUBLIC_PORTAL_TENANT_SLUG` - "well-crafted"
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)

## Known Issues

### Trailing Newlines in Vercel Secrets
**Problem**: Vercel env vars with trailing `\n` cause "Tenant could not be resolved" errors
**Solution**: Always use `printf` when setting env vars (never `echo`)
**Fixed**: All env vars cleaned on 2025-10-20

### Database Connection
**Problem**: Occasional "Can't reach database server" errors
**Cause**: AWS us-east-1 region outages (rare)
**Monitoring**: Check https://health.aws.amazon.com/health/status
**Workaround**: Wait for AWS to resolve (Pro tier doesn't pause)

## Support Contacts

**Database**: Supabase Pro support
**Hosting**: Vercel support
**AWS Region**: us-east-1 (Virginia)

---

Last Updated: 2025-10-20
