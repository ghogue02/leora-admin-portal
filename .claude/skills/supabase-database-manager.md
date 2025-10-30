---
name: supabase-database-manager
description: Comprehensive Supabase database management with schema-first workflows, CRUD operations, data migration, and intelligent query building. Automatically discovers schema before operations to prevent errors. Self-extending with intelligent workflow recommendations.
version: 1.1.0
author: Wellcrafted Development
tags: [database, supabase, crud, schema, migration, postgres, self-extending]
category: database
---

# Supabase Database Manager

Intelligent database management skill that **ALWAYS discovers schema first** before performing operations. Prevents common errors like creating duplicate tables, using wrong column names, or inserting invalid data.

## Core Principles

1. **Schema-First**: Always check if tables/columns exist before operations
2. **Type-Safe**: Validate data types against actual schema
3. **Relationship-Aware**: Understand foreign keys and constraints
4. **Error-Prevention**: Never create unnecessary tables or use wrong formats
5. **Self-Extending**: Intelligently recommends new workflows based on usage patterns

## 🧠 Intelligent Workflow Recommendation System

**IMPORTANT**: As you use this skill, I will monitor for opportunities to create new workflows. When I detect a pattern that could be automated, I will:

1. **Pause and notify you**: "I notice you're doing X repeatedly. Should I create a workflow for this?"
2. **Make a recommendation**: Propose the workflow name, purpose, and what it would automate
3. **Wait for approval**: You approve/reject/modify the suggestion
4. **Add workflow**: If approved, I'll extend this skill file with the new workflow
5. **Document it**: Update version number and add to Available Workflows section

**Workflow Recommendation Triggers:**
- Repeated similar queries (3+ times)
- Complex multi-step operations
- Error-prone manual tasks
- Time-consuming data operations
- Requests that require multiple existing workflows
- Database patterns that suggest optimization opportunities

**Example:**
```
User: Get all customers, check their orders, filter inactive ones, export to CSV
Assistant: ✋ I notice this is a multi-step operation.

📊 Workflow Recommendation:
Name: "inactive-customer-report"
Purpose: Automatically identifies inactive customers and exports analysis
Includes: Customer query + order analysis + inactivity detection + CSV export

Would you like me to create this workflow? (yes/no/modify)
```

## Available Workflows

### 🔍 Schema Discovery & Analysis

#### `discover` - Full Database Discovery
Analyzes entire database structure, relationships, and data volumes.

**When to use:**
- Starting work with database
- Before any major changes
- Understanding data model
- Planning migrations

**Process:**
1. List all available tables
2. Get schema for each table (columns, types, constraints)
3. Analyze row counts and data distribution
4. Identify relationships and foreign keys
5. Generate database documentation

**Example:**
```
User: Discover my database structure
Assistant: [Runs full discovery workflow]
- Found 8 tables
- Mapped relationships
- Identified 3 foreign keys
- Total records: 12,450
```

---

#### `inspect-table` - Detailed Table Analysis
Deep dive into specific table structure with sample data.

**When to use:**
- Before inserting/updating data
- Understanding column requirements
- Checking data formats
- Planning queries

**Process:**
1. Check if table exists
2. Get complete schema (columns, types, nullable, defaults)
3. Fetch sample records (5-10 rows)
4. Analyze data patterns
5. List constraints and indexes

**Parameters:**
- `table_name` (required): Table to inspect

**Example:**
```
User: Inspect the customers table
Assistant:
Table: customers
Columns: id (int), name (text), email (text), created_at (timestamp)
Sample data: [shows 5 records]
Constraints: email must be unique
```

---

### ✏️ CRUD Operations (Schema-Safe)

#### `smart-insert` - Schema-Aware Record Creation
Inserts records after validating against actual schema.

**When to use:**
- Adding new records
- Bulk imports
- Data seeding

**Process:**
1. **Describe table schema** to get columns and types
2. Validate provided data against schema
3. Check required fields are present
4. Verify data types match
5. Insert record(s)
6. Return created record(s) with auto-generated fields

**Parameters:**
- `table_name` (required): Target table
- `data` (required): Object or array of objects to insert
- `validate_only` (optional): Dry run to check validity

**Example:**
```
User: Add a new customer: John Doe, john@example.com
Assistant:
1. Describing 'customers' table...
   - Required: name, email
   - Optional: phone, address
   - Auto-generated: id, created_at
2. Validating data... ✓
3. Inserting record...
✓ Created customer #1234
```

---

#### `smart-update` - Safe Record Updates
Updates records with schema validation and safety checks.

**When to use:**
- Modifying existing data
- Bulk updates
- Status changes

**Process:**
1. **Describe table** to get valid columns
2. Validate update data against schema
3. Build safe filter conditions
4. Preview affected records (optional)
5. Execute update
6. Return updated records

**Parameters:**
- `table_name` (required): Target table
- `filters` (required): Conditions to match records
- `updates` (required): Fields to update
- `preview` (optional): Show what will be updated before executing

**Example:**
```
User: Update customer #1234 email to newemail@example.com
Assistant:
1. Describing 'customers' table... ✓
2. Validating 'email' column exists... ✓
3. Preview: Will update 1 record
4. Updating...
✓ Updated customer #1234
```

---

#### `smart-query` - Intelligent Data Retrieval
Builds optimized queries with schema awareness.

**When to use:**
- Fetching records
- Generating reports
- Searching data
- Pagination

**Process:**
1. **Describe table** to get available columns
2. Validate requested columns exist
3. Build optimized query with proper filters
4. Apply sorting and pagination
5. Return formatted results with metadata

**Parameters:**
- `table_name` (required): Table to query
- `columns` (optional): Specific columns (defaults to all)
- `filters` (optional): WHERE conditions
- `sort` (optional): ORDER BY column(s)
- `limit` (optional): Max records (default: 100)
- `offset` (optional): Skip records for pagination

**Example:**
```
User: Get all active customers, sorted by created date
Assistant:
1. Describing 'customers' table...
2. Available columns: id, name, email, status, created_at
3. Querying with filters: {status: 'active'}
4. Sort: -created_at (descending)
Found 42 active customers
```

---

#### `smart-delete` - Safe Record Deletion
Deletes records with confirmation and relationship checks.

**When to use:**
- Removing records
- Data cleanup
- Soft deletes

**Process:**
1. **Describe table** to understand structure
2. Validate filter conditions
3. Preview records to be deleted
4. Check for dependent records (foreign keys)
5. Request confirmation for destructive operations
6. Execute deletion
7. Return deleted records

**Parameters:**
- `table_name` (required): Target table
- `filters` (required): Conditions to match records
- `force` (optional): Skip confirmation for single record deletes

**Example:**
```
User: Delete customer #1234
Assistant:
1. Finding customer #1234...
2. Checking dependencies...
   - Has 3 related orders
   ⚠️ Warning: Deleting customer will affect orders
3. Confirm deletion? (yes/no)
```

---

### 📊 Advanced Workflows

#### `data-migration` - Safe Data Migration
Migrates data between tables/databases with validation.

**When to use:**
- Moving data between environments
- Restructuring tables
- Consolidating data

**Process:**
1. **Describe source and target tables**
2. Map columns between schemas
3. Validate data compatibility
4. Transform data if needed
5. Preview migration plan
6. Execute in batches
7. Verify migration success

**Parameters:**
- `source_table` (required): Source table name
- `target_table` (required): Target table name
- `column_mapping` (optional): Custom column mappings
- `batch_size` (optional): Records per batch (default: 100)
- `dry_run` (optional): Preview without executing

---

#### `bulk-import` - Bulk Data Import
Imports large datasets with validation and error handling.

**When to use:**
- CSV imports
- Data seeding
- System migrations

**Process:**
1. **Describe target table** for schema
2. Validate all import data against schema
3. Check for duplicates
4. Transform data to match types
5. Import in batches
6. Track success/failures
7. Generate import report

**Parameters:**
- `table_name` (required): Target table
- `data` (required): Array of records
- `update_on_conflict` (optional): Update if duplicate key
- `batch_size` (optional): Records per batch

---

#### `generate-report` - Custom Data Reports
Generates formatted reports with aggregations.

**When to use:**
- Analytics queries
- Business reports
- Data summaries

**Process:**
1. **Describe tables** involved
2. Validate columns for aggregations
3. Build complex query with joins
4. Execute aggregations (COUNT, SUM, AVG, etc.)
5. Format results as table/chart
6. Export to markdown/CSV

**Parameters:**
- `tables` (required): Tables to include
- `metrics` (required): Aggregations to calculate
- `group_by` (optional): Grouping columns
- `filters` (optional): WHERE conditions
- `format` (optional): Output format (markdown/json/csv)

---

#### `search-across-tables` - Multi-Table Search
Searches for data across multiple tables.

**When to use:**
- Finding related records
- Full-text search
- Data exploration

**Process:**
1. **List all tables** in database
2. **Describe each table** to find text columns
3. Search specified columns across all tables
4. Rank results by relevance
5. Group results by table
6. Return formatted matches

**Parameters:**
- `search_term` (required): Text to search for
- `tables` (optional): Specific tables (default: all)
- `limit` (optional): Max results per table

---

#### `relationship-analyzer` - Analyze Table Relationships
Discovers and visualizes foreign key relationships.

**When to use:**
- Understanding data model
- Planning queries
- Optimizing structure

**Process:**
1. **Describe all tables**
2. Identify foreign key columns
3. Map relationships between tables
4. Analyze relationship types (1:1, 1:N, N:N)
5. Generate relationship diagram
6. Suggest query patterns

---

#### `data-cleanup` - Automated Data Cleanup
Finds and fixes data quality issues.

**When to use:**
- Data maintenance
- Pre-migration cleanup
- Quality assurance

**Process:**
1. **Describe table** schema
2. Scan for common issues:
   - Duplicate records
   - Null values in required fields
   - Invalid formats (emails, dates)
   - Orphaned records
3. Generate cleanup plan
4. Preview changes
5. Execute fixes
6. Report results

**Parameters:**
- `table_name` (required): Table to clean
- `checks` (optional): Specific checks to run
- `auto_fix` (optional): Automatically fix safe issues

---

### 🔧 Schema Management

#### `create-table` - Smart Table Creation
Creates tables only if they don't exist, with proper schema.

**When to use:**
- New features
- Data model expansion

**Process:**
1. **List tables** to check if exists
2. If exists, show error and current schema
3. If not exists, validate schema definition
4. Create table with proper types and constraints
5. Add indexes
6. Verify creation

**Parameters:**
- `table_name` (required): New table name
- `columns` (required): Column definitions with types
- `constraints` (optional): Primary keys, foreign keys, unique
- `indexes` (optional): Index definitions

---

#### `alter-table` - Safe Schema Modifications
Modifies table structure with safety checks.

**When to use:**
- Adding columns
- Modifying constraints
- Renaming columns

**Process:**
1. **Describe current table** schema
2. Validate modification is safe
3. Check for data compatibility
4. Preview SQL changes
5. Execute alteration
6. Verify success

**Parameters:**
- `table_name` (required): Table to modify
- `operation` (required): add_column/drop_column/rename_column
- `definition` (required): Column definition or new name

---

### 🔄 Meta-Workflows (Self-Extension)

#### `add-workflow` - Extend This Skill
**Manual workflow addition when you request a specific automation.**

**When to use:**
- You have a specific database task you repeat often
- You want to automate a multi-step process
- You need a custom workflow not currently available

**Process:**
1. Describe the workflow you need
2. I'll analyze your database schema to understand context
3. Design the workflow with proper steps and validations
4. Present the workflow definition for your approval
5. Add to this skill file if approved
6. Update version number and documentation
7. Test the new workflow

**Parameters:**
- `workflow_name` (required): Name for the new workflow
- `description` (required): What the workflow should do
- `use_cases` (optional): Specific scenarios where it's useful

**Example:**
```
User: add-workflow to find customers with no orders in last 30 days
Assistant:
📋 Proposed Workflow:
Name: "find-inactive-customers"
Purpose: Identify customers who haven't placed orders recently
Steps:
  1. Query customers table
  2. Left join with orders table
  3. Filter by date range (configurable, default 30 days)
  4. Return list with customer details and last order date
  5. Optionally export to CSV

Parameters:
  - days_inactive (optional, default: 30)
  - include_never_ordered (optional, default: true)
  - export_format (optional): csv/json/markdown

Should I add this workflow? (yes/no/modify)
```

---

#### `auto-recommend-workflow` - AI-Powered Workflow Suggestions
**Automatic detection of workflow opportunities (I'll proactively suggest these).**

**How it works:**
I monitor your database interactions and will automatically recommend workflows when I detect:

1. **Repeated Patterns** (3+ similar operations)
   ```
   Example: You query orders, filter by status, count results 3 times
   → I suggest: "order-status-summary" workflow
   ```

2. **Complex Multi-Step Operations**
   ```
   Example: You list tables, describe 5 of them, search across all
   → I suggest: "global-search" workflow
   ```

3. **Error-Prone Manual Tasks**
   ```
   Example: You manually update 20 records one by one
   → I suggest: "bulk-status-update" workflow
   ```

4. **Time-Consuming Operations**
   ```
   Example: You export data, transform it, then re-import
   → I suggest: "data-transform-pipeline" workflow
   ```

5. **Common Database Patterns**
   ```
   Example: You frequently check for duplicates before insert
   → I suggest: "upsert" (insert-or-update) workflow
   ```

**When I recommend a workflow, you'll see:**
```
✋ Workflow Recommendation

📊 Pattern Detected: [description]
Frequency: [how often you've done this]
Time Saved: [estimated time savings per use]

Proposed Workflow:
  Name: "workflow-name"
  Purpose: [what it automates]
  Steps: [brief process]
  Parameters: [configurable options]

💡 This would save you approximately [X] steps each time.

Approve this workflow?
  [ ] Yes, add it now
  [ ] Modify first (tell me what to change)
  [ ] No, maybe later
  [ ] Never suggest this again
```

**Recommendation Criteria:**
- **High Impact**: Saves significant time/reduces errors
- **Reusable**: Applicable to multiple scenarios
- **Schema-Safe**: Fits the schema-first approach
- **Well-Scoped**: Clear inputs/outputs

---

## Usage Examples

### Example 1: Discover Before Insert
```
User: I want to add a new product
Assistant: Let me first inspect the products table...
[Calls mcp__wellcrafted-supabase__supabase_describe_table]
Found columns: id, name, price, category, sku, created_at
Required: name, price, sku
What's the product name?
```

### Example 2: Safe Bulk Update
```
User: Mark all pending orders as shipped
Assistant: Let me check the orders table first...
[Describes schema, validates 'status' column exists]
Found 15 orders with status='pending'
Updating to status='shipped'...
✓ Updated 15 orders
```

### Example 3: Data Migration
```
User: Migrate old_customers to customers table
Assistant: Analyzing schemas...
Source: old_customers (5 columns, 1,200 records)
Target: customers (7 columns, 0 records)
Column mapping:
  old_customers.full_name → customers.name
  old_customers.email → customers.email
  [new] customers.status → 'active' (default)
Proceed with migration?
```

## MCP Tools Used

This skill uses the following MCP tools from `wellcrafted-supabase`:

- `supabase_list_tables` - Discover available tables
- `supabase_describe_table` - Get table schema
- `supabase_query_table` - Query records
- `supabase_insert_record` - Create records
- `supabase_update_records` - Update records
- `supabase_delete_records` - Delete records
- `supabase_count_records` - Count records
- `supabase_search_records` - Search across columns

## Best Practices

1. **Always discover first**: Run `discover` or `inspect-table` before modifications
2. **Use smart operations**: Prefer `smart-insert` over direct insert
3. **Validate data**: Check types and formats before insertion
4. **Preview changes**: Use `preview: true` for updates/deletes
5. **Batch operations**: Use `batch_size` for large datasets
6. **Handle errors gracefully**: Check for duplicates, constraints

## Prisma vs MCP Comparison

### When to use MCP (this skill):
✅ **Ad-hoc queries and exploration**
✅ **Database administration tasks**
✅ **Data migrations and imports**
✅ **Schema discovery and analysis**
✅ **Quick CRUD operations**
✅ **Database debugging**
✅ **One-off data cleanup**

### When to use Prisma:
✅ **Application code with type safety**
✅ **Complex transactions**
✅ **Relationship loading (includes, joins)**
✅ **Schema versioning and migrations**
✅ **Generated TypeScript types**
✅ **Production application runtime**

### Can you remove Prisma?
**Not entirely.** Here's the ideal setup:

1. **Use MCP (this skill) for:**
   - Development and testing
   - Database exploration
   - Manual data operations
   - Admin tasks
   - Migrations and imports

2. **Keep Prisma for:**
   - Your actual application code
   - Type-safe queries in TypeScript
   - Production runtime operations
   - Automated schema migrations

**Recommendation:** Use both together
- MCP for **Claude Code interactions** (what we're doing now)
- Prisma for **your application code** (runtime queries)

This gives you the best of both worlds:
- Fast, intelligent database operations with Claude
- Type-safe, production-ready application code

## Quick Start

```
# 1. Discover your database
User: discover

# 2. Inspect a specific table
User: inspect-table customers

# 3. Add data (schema-safe)
User: smart-insert into customers: name "John Doe", email "john@example.com"

# 4. Query data
User: smart-query customers where status = active, limit 10

# 5. Update safely
User: smart-update customers where id=123, set email="new@example.com"

# 6. Search across tables
User: search-across-tables "john@example.com"
```

---

## 📚 Workflow Extension Process

### How Workflows Get Added

This skill evolves based on your actual usage. Here's how:

#### **Automatic Recommendations (My Initiative)**
1. I monitor your database operations during our conversations
2. When I detect a pattern worth automating, I'll pause and suggest
3. You review the proposal and approve/modify/reject
4. If approved, I update this file immediately
5. The new workflow is available for your next use

#### **Manual Additions (Your Request)**
1. Tell me: "add-workflow for [specific task]"
2. I analyze your database schema
3. I design the workflow and present it for approval
4. You approve/modify/reject
5. If approved, I add it to this file
6. Version number increments automatically

#### **Workflow Template Structure**
Every workflow follows this format:
```markdown
#### `workflow-name` - Brief Description
**When to use:**
- Use case 1
- Use case 2

**Process:**
1. Step 1
2. Step 2
...

**Parameters:**
- param1 (required): description
- param2 (optional, default: value): description

**Example:**
```
User: workflow-name params
Assistant: [expected behavior]
```
```

#### **Version Control**
- **v1.0.0**: Initial 15 workflows (schema discovery, CRUD, migrations)
- **v1.1.0**: Added meta-workflows and intelligent recommendation system
- **v1.x.x**: Each approved workflow increments minor version
- **v2.0.0**: Major refactor or significant feature additions

#### **Workflow Categories**
New workflows are organized into:
- 🔍 **Schema Discovery & Analysis** - Understanding your data
- ✏️ **CRUD Operations** - Creating, reading, updating, deleting
- 📊 **Advanced Workflows** - Multi-step automations
- 🔧 **Schema Management** - Table and column modifications
- 🔄 **Meta-Workflows** - Self-extension capabilities
- 🎯 **Custom Workflows** - Your specific use cases (added dynamically)

#### **Quality Standards**
Every workflow must:
- ✅ Follow schema-first principle (discover before action)
- ✅ Have clear parameters and examples
- ✅ Include error handling
- ✅ Be reusable across projects
- ✅ Save significant time/reduce errors
- ✅ Integrate with existing MCP tools

### Current Workflow Count: 17
- Core workflows: 15
- Meta-workflows: 2
- Custom workflows: 0 (will grow based on your needs)

---

## 💡 Example: How Recommendations Work

### Scenario 1: Automatic Detection
```
[You've queried customers table 3 times with different status filters]

User: smart-query customers where status="active"
User: smart-query customers where status="pending"
User: smart-query customers where status="inactive"

✋ Workflow Recommendation

📊 Pattern Detected: Status-based customer filtering
Frequency: 3 times in this session
Time Saved: ~2-3 minutes per use

Proposed Workflow:
  Name: "customer-status-report"
  Purpose: Generate customer reports grouped by status
  Steps:
    1. Query customers table
    2. Group by status column
    3. Calculate counts per status
    4. Optionally include recent activity
    5. Format as summary table or export
  
  Parameters:
    - include_counts (default: true): Show record counts
    - include_samples (default: false): Show sample records per status
    - export_format (optional): csv/json/markdown

💡 This would consolidate your 3 queries into 1 command and provide better insights.

Approve this workflow?
  [✓] Yes, add it now
  [ ] Modify first (tell me what to change)
  [ ] No, maybe later
  [ ] Never suggest this again

User: Yes, add it nowAssistant: ✓ Adding workflow "customer-status-report" to skill...
[Updates this file, increments version to v1.2.0]
✓ Workflow added! You can now use: customer-status-report

Next time you can just run:
User: customer-status-report
Assistant: [Executes the new workflow]
```

### Scenario 2: Manual Request
```
User: add-workflow to export all tables to JSON backup
Assistant: 📋 Analyzing request...

Proposed Workflow:
  Name: "database-backup-json"
  Purpose: Export all tables to JSON format for backup/portability
  Steps:
    1. List all tables in database
    2. For each table, query all records
    3. Convert to JSON format
    4. Create timestamped backup file
    5. Include schema metadata
    6. Compress if requested
  
  Parameters:
    - output_path (optional): Where to save backup
    - compress (default: true): gzip compression
    - include_schema (default: true): Include table schemas
    - exclude_tables (optional): Tables to skip

💡 Estimated time: 30 seconds for typical database

Approve this workflow?
User: Yes

Assistant: ✓ Workflow "database-backup-json" added to skill (v1.2.0)
```

---

**Note:** This skill requires the `wellcrafted-supabase` MCP server to be installed and configured. Restart Claude Code if tools are not immediately available after server registration.

**Last Updated:** v1.1.0 - Added intelligent workflow recommendation system and meta-workflows
