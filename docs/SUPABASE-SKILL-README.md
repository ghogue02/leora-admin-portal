# Supabase Database Manager Skill - Quick Reference

## 🎯 What This Skill Does

A self-extending, intelligent database management system that:
- **Prevents errors** by discovering schema before every operation
- **Recommends workflows** when it detects repetitive patterns
- **Grows with you** by adding custom workflows on approval
- **Replaces manual database work** with intelligent automation

## 🚀 Quick Start

### Activate the Skill
```
User: supabase-database-manager
# or just use any workflow name directly
User: discover
```

### Essential Commands
```bash
# 1. See what you have
discover

# 2. Understand a table
inspect-table customers

# 3. Add data safely
smart-insert into customers: name "John Doe", email "john@example.com"

# 4. Query intelligently
smart-query orders where status="pending" limit 20

# 5. Update with validation
smart-update users where id=123, set status="active"
```

## 🧠 How Auto-Recommendations Work

### You Do This (3+ times):
```
User: smart-query customers where status="active"
User: smart-query customers where status="pending"
User: smart-query customers where status="inactive"
```

### I Pause and Suggest:
```
✋ Workflow Recommendation

📊 Pattern Detected: Status-based filtering
Proposed Workflow: "customer-status-report"

Approve? [Yes/No/Modify]
```

### If You Approve:
```
✓ Workflow added (v1.2.0)
Now available: customer-status-report
```

## 📦 Current Workflows (17)

### Schema Discovery
- `discover` - Full database analysis
- `inspect-table` - Table schema + samples

### Smart CRUD
- `smart-insert` - Validated inserts
- `smart-update` - Safe updates
- `smart-query` - Intelligent queries
- `smart-delete` - Protected deletes

### Advanced
- `data-migration` - Safe data moves
- `bulk-import` - Large dataset imports
- `generate-report` - Analytics
- `search-across-tables` - Multi-table search
- `relationship-analyzer` - FK discovery
- `data-cleanup` - Quality fixes

### Schema Management
- `create-table` - Smart table creation
- `alter-table` - Safe modifications

### Meta-Workflows
- `add-workflow` - Manual additions
- `auto-recommend-workflow` - AI suggestions

## 💡 Recommendation Triggers

I'll suggest workflows when I detect:

1. **Repeated Patterns** (3+ similar operations)
2. **Complex Multi-Step** operations
3. **Error-Prone** manual tasks
4. **Time-Consuming** operations
5. **Common Database** patterns

## 🔧 Adding Custom Workflows

### Manual Request
```
User: add-workflow to find inactive customers
Assistant: 📋 Analyzing...
[Proposes workflow with approval options]

You: Yes

Assistant: ✓ Added "find-inactive-customers" workflow
```

### Automatic Detection
```
[I notice patterns and suggest proactively]

Assistant: ✋ I notice youve done X three times.
Should I create a workflow for this?

You: Yes/No/Modify
```

## 🎓 Best Practices

1. **Always discover first** before major operations
2. **Use smart-* operations** instead of direct MCP calls
3. **Approve workflows** that save time
4. **Let the skill grow** with your actual needs
5. **Preview changes** for updates/deletes

## ⚖️ Prisma vs MCP

### Use This Skill For:
✅ Database exploration
✅ Manual CRUD during development
✅ Data migrations
✅ Admin tasks
✅ Quick queries
✅ Working with Claude Code

### Keep Prisma For:
✅ Application runtime code
✅ Type-safe TypeScript queries
✅ Complex transactions
✅ Production performance
✅ Generated types

**Verdict:** Use both\!
- MCP skill for **development with Claude**
- Prisma for **production application code**

## 📊 Workflow Stats

- **Current Version:** v1.1.0
- **Total Workflows:** 17
- **Core Workflows:** 15
- **Meta-Workflows:** 2
- **Custom Workflows:** 0 (grows with use)

## 🔄 Version History

- **v1.0.0** - Initial 15 workflows
- **v1.1.0** - Added self-extension system
- **v1.x.x** - Your custom workflows (added as needed)

## ⚠️ Important

**Restart Claude Code** after installing the `wellcrafted-supabase` MCP server for full functionality.

## 🎯 What Makes This Different

**Traditional Approach:**
```
You: Add a product
Claude: [Tries to insert, fails - wrong columns]
Claude: [Creates wrong table format]
```

**With This Skill:**
```
You: Add a product
Claude:
  1. Inspecting products table...
  2. Found columns: name, price, sku (all required)
  3. Validating your data...
  4. Inserting...
  ✓ Product #123 created
```

**Schema-first = Zero errors\!**

---

**Ready to use?** Just say `discover` and let the skill guide you\!
