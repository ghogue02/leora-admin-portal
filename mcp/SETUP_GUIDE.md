# Wellcrafted Supabase MCP Skill - Complete Setup Guide

Congratulations! Your Wellcrafted Supabase MCP skill is ready. This guide will walk you through the complete setup process.

## What You're Getting

This skill package includes:

1. **MCP Server** (`supabase_mcp.py`) - Connects Claude to your Supabase database
2. **Skill Documentation** (`SKILL.md`) - Teaches Claude about your wine distributor CRM
3. **Domain Knowledge** (`wine_distribution_domain.md`) - Wine industry context and terminology
4. **Setup Instructions** - Everything you need to get started

## Quick Start (5 minutes)

### Step 1: Extract the Skill
Unzip `wellcrafted-supabase.zip` to a permanent location on your computer:
- **macOS/Linux**: `~/skills/wellcrafted-supabase/`
- **Windows**: `C:\Users\YourName\skills\wellcrafted-supabase\`

### Step 2: Install Python Dependencies
Open terminal/command prompt and run:
```bash
cd /path/to/wellcrafted-supabase/scripts
pip install -r requirements.txt
```

### Step 3: Configure Claude Desktop

**Find your Claude Desktop config file:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Add this configuration** (create the file if it doesn't exist):

```json
{
  "mcpServers": {
    "wellcrafted": {
      "command": "python",
      "args": ["/absolute/path/to/wellcrafted-supabase/scripts/supabase_mcp.py"],
      "env": {
        "SUPABASE_URL": "https://zqezunzlyjkseugujkrl.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>"
      }
    }
  },
  "globalShortcut": "Ctrl+Space"
}
```

**Important**: Replace `/absolute/path/to/wellcrafted-supabase/scripts/supabase_mcp.py` with the actual full path where you extracted the skill.

**Example paths:**
- macOS: `"/Users/yourname/skills/wellcrafted-supabase/scripts/supabase_mcp.py"`
- Windows: `"C:\\Users\\yourname\\skills\\wellcrafted-supabase\\scripts\\supabase_mcp.py"`

### Step 4: Install the Skill in Claude

1. Open Claude Desktop
2. Go to Settings → Developer Settings
3. Click "Add Skill"
4. Browse to the extracted `wellcrafted-supabase` folder
5. Click "Install"

OR simply copy the folder to:
- **macOS**: `~/Library/Application Support/Claude/skills/`
- **Windows**: `%APPDATA%\Claude\skills\`

### Step 5: Restart Claude Desktop

Completely quit and restart Claude Desktop to load the new MCP server and skill.

### Step 6: Test It!

In Claude, try these commands:
1. "List all tables in the Wellcrafted database"
2. "Describe the structure of the customers table"
3. "Show me a few sample records from any table"

## What Can You Do Now?

Once set up, you can ask Claude natural language questions about your wine distribution business:

### Customer Management
- "Who are our top 10 customers by revenue?"
- "Find contact information for ABC Wine Bar"
- "Show me all customers in the San Francisco area"
- "List customers who haven't ordered in the last 60 days"
- "Create a new customer account for XYZ Restaurant"

### Order Management
- "Show me all pending orders for this week"
- "Create a new order for customer ID 123"
- "What's the status of order #456?"
- "List all orders over $5,000 this month"
- "Update order #789 status to shipped"

### Product & Inventory
- "Do we have any Opus One Cabernet in stock?"
- "Show me all Chardonnays under $30"
- "What are our best-selling wines this quarter?"
- "Which products are running low on inventory?"
- "Search for wines from Napa Valley"

### Analytics & Reporting
- "What were our total sales last month?"
- "Compare this quarter's sales to last year"
- "Show me sales by sales rep"
- "What's the average order value?"
- "Generate a revenue report by region"

### Data Exploration
- "What tables exist in the database?"
- "Show me the structure of the orders table"
- "How many records are in each table?"
- "What columns does the products table have?"

## Advanced Configuration

### Using Read-Only Access

If you want to restrict Claude to read-only operations, use the ANON key instead:

```json
"env": {
  "SUPABASE_URL": "https://zqezunzlyjkseugujkrl.supabase.co",
  "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZXp1bnpseWprc2V1Z3Vqa3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTM5NTksImV4cCI6MjA3NDkyOTk1OX0.rXBCwiqvmsmz09HxKbG2fOrKPpq9JnpVWgG-cnXVZfQ"
}
```

Note: This will respect Row Level Security (RLS) policies and prevent writes.

### Multiple Environments

You can configure separate MCP servers for production and staging:

```json
{
  "mcpServers": {
    "wellcrafted-prod": {
      "command": "python",
      "args": ["/path/to/supabase_mcp.py"],
      "env": {
        "SUPABASE_URL": "https://prod-url.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "prod-key"
      }
    },
    "wellcrafted-staging": {
      "command": "python",
      "args": ["/path/to/supabase_mcp.py"],
      "env": {
        "SUPABASE_URL": "https://staging-url.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "staging-key"
      }
    }
  }
}
```

## Troubleshooting

### "MCP server not found" or tools not appearing

1. Check that the MCP server path in config is absolute and correct
2. Verify Python is in your system PATH: `python --version`
3. Ensure all dependencies are installed: `pip install -r requirements.txt`
4. Check Claude Desktop logs for errors
5. Restart Claude Desktop completely

### "Permission denied" or "Access denied" errors

1. Verify you're using the SERVICE_ROLE_KEY for write operations
2. Check if Row Level Security (RLS) is enabled on tables
3. Confirm credentials are correct in Supabase dashboard
4. Try using the anon key first to test read operations

### "Table not found" errors

1. Your database might be empty or use different table names
2. Run "List all tables" to see what's available
3. Create tables in Supabase dashboard if needed
4. Check spelling and case sensitivity

### Empty results from queries

1. Tables might genuinely be empty
2. Try "Count records in [table]" to verify
3. Insert test data through Supabase dashboard
4. Check filter conditions aren't too restrictive

### Python import errors

```bash
# Reinstall all dependencies
pip install --upgrade mcp supabase httpx pydantic

# Or use the requirements file
pip install -r requirements.txt
```

## Security Best Practices

1. **Never commit credentials to version control**
2. **Use environment-specific keys** (different keys for dev/staging/prod)
3. **Rotate keys periodically** in Supabase dashboard
4. **Enable RLS policies** in Supabase for production databases
5. **Use ANON key for read-only operations** when appropriate
6. **Monitor API usage** in Supabase dashboard

## Next Steps

1. **Explore your database**: Ask Claude to list and describe all tables
2. **Test basic operations**: Try querying, inserting, and updating records
3. **Build workflows**: Create custom reports or dashboards
4. **Add data**: Populate your database with customer and product data
5. **Train your team**: Share this skill with team members using Claude

## Getting Help

**Skill Issues:**
- Review the SKILL.md documentation in the skill folder
- Check the wine_distribution_domain.md for business context

**Supabase Issues:**
- Supabase Documentation: https://supabase.com/docs
- Supabase Dashboard: https://supabase.com/dashboard

**MCP Issues:**
- MCP Protocol Docs: https://modelcontextprotocol.io
- Claude Desktop Docs: https://docs.claude.ai

## Files Included

- `SKILL.md` - Main skill documentation (teaches Claude)
- `scripts/supabase_mcp.py` - MCP server (connects to database)
- `scripts/requirements.txt` - Python dependencies
- `scripts/SETUP.md` - Technical setup instructions
- `references/wine_distribution_domain.md` - Wine industry knowledge

## Your Credentials Reference

Keep these credentials secure!

```
SUPABASE_URL="https://zqezunzlyjkseugujkrl.supabase.co"

SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZXp1bnpseWprc2V1Z3Vqa3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTM5NTksImV4cCI6MjA3NDkyOTk1OX0.rXBCwiqvmsmz09HxKbG2fOrKPpq9JnpVWgG-cnXVZfQ"

SUPABASE_SERVICE_ROLE_KEY="<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>"

DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:ZKK5pPySuCq7JhpO@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
```

---

**You're all set!** 🎉

Start by asking Claude: "List all tables in the Wellcrafted database and describe what we have."
