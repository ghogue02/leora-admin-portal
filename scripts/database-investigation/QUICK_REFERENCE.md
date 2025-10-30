# Quick Reference - Well Crafted Export

## 🎯 Goal
Export **7,774 OrderLines** + all related data from Well Crafted database

## 📊 Status
**AWAITING MANUAL EXPORT** - Automated methods blocked by RLS policies

## ⚡ Quick Start

```bash
# 1. Check current status
cd /Users/greghogue/Leora2/scripts/database-investigation
tsx show-export-status.ts

# 2. Read instructions
cat MANUAL_EXPORT_INSTRUCTIONS.md

# 3. Export via psql (manual - see instructions)

# 4. Convert CSV to JSON (after manual export)
tsx convert-csv-to-json.ts

# 5. Verify export
tsx show-export-status.ts
```

## 🔑 Credentials

```bash
Database: zqezunzlyjkseugujkrl.supabase.co
Username: postgres.zqezunzlyjkseugujkrl
Password: Leora0802
Service Key: eyJhbGci...<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>
```

## 📋 Tables to Export

| Table | Description | Expected Count |
|-------|-------------|----------------|
| Customer | Customer records | Unknown |
| Product | Product catalog | Unknown |
| Sku | SKU variants | Unknown |
| Order | Order headers | Unknown |
| **OrderLine** | **Order line items** | **7,774** ✅ |

## ✅ Success Criteria

- [ ] 7,774 OrderLines exported exactly
- [ ] All 5 JSON files created
- [ ] Customer names/emails present
- [ ] Order dates/totals present
- [ ] SKU codes present
- [ ] Product names present
- [ ] No orphaned foreign keys

## 📁 File Locations

### Documentation
- `MANUAL_EXPORT_INSTRUCTIONS.md` - Step-by-step guide
- `EXPORT_SUMMARY.md` - Full explanation
- `AGENT_FINAL_REPORT.md` - Complete agent report
- `QUICK_REFERENCE.md` - This file

### Scripts
- `show-export-status.ts` - Check status
- `convert-csv-to-json.ts` - CSV → JSON converter
- `check-database-access.ts` - Permission diagnostics

### Failed Attempts (for reference)
- `export-wellcrafted-complete.ts` - Supabase client (RLS blocked)
- `export-via-rest.ts` - REST API (RLS blocked)
- `export-wellcrafted-psql.sh` - Direct psql (connection issues)

## 🚀 After Export Complete

1. Run data quality checks
2. Map schema: Well Crafted → Lovable
3. Create migration scripts
4. Test migration on subset
5. Execute full migration
6. Verify integrity

## 💡 Why Manual Export?

- ❌ Supabase client: "permission denied for schema public"
- ❌ REST API: HTTP 403 Forbidden
- ❌ Direct psql: Connection timeout/tenant not found
- ✅ Interactive psql: Worked in Phase 1 (7,774 count verified)

## 🆘 Troubleshooting

**Can't connect via psql?**
- Try different pooler hosts
- Check SSL mode requirements
- Verify credentials haven't changed
- Review Phase 1 connection notes

**Wrong OrderLine count?**
- Ensure connected to correct database
- Check for data changes since Phase 1
- Verify using PascalCase table names with quotes

**CSV conversion errors?**
- Check CSV format (comma-separated)
- Verify header row exists
- Check for special characters in data

## 📞 Need Help?

Review in this order:
1. `MANUAL_EXPORT_INSTRUCTIONS.md` - Detailed guide
2. `EXPORT_SUMMARY.md` - Troubleshooting
3. `AGENT_FINAL_REPORT.md` - Technical details
4. Phase 1 documentation - Working psql connection

---

**Remember**: Manual export is not a failure - it's the most reliable method given the RLS restrictions!
