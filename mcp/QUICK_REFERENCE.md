# Wellcrafted Supabase - Quick Reference

## Common Claude Commands

### 🔍 Data Exploration

**See what's available:**
- "List all tables in Wellcrafted"
- "Show me the structure of the [table_name] table"
- "How many records are in the [table_name] table?"
- "Give me a few sample records from [table_name]"

### 👥 Customer Operations

**Find customers:**
- "Find customer named [name]"
- "Show me all customers in [city/region]"
- "List customers with status [active/inactive]"
- "Who are our top 10 customers by revenue?"

**Manage customers:**
- "Create a new customer account for [business name]"
- "Update customer [id or name] with new email [email]"
- "Add these details to customer [id]: [details]"

### 📦 Order Operations

**View orders:**
- "Show me all pending orders"
- "List orders from last week"
- "What's the status of order #[number]?"
- "Show me all orders over $[amount]"
- "Find orders for customer [name]"

**Manage orders:**
- "Create a new order for customer [name/id]"
- "Update order #[number] status to [status]"
- "Add these items to order #[number]: [items]"
- "Mark order #[number] as delivered"

### 🍷 Product & Inventory

**Search products:**
- "Do we have any [wine name] in stock?"
- "Show me all [varietal] wines under $[price]"
- "Find wines from [producer/region]"
- "List products with low inventory"
- "What are our best-selling wines?"

**Manage products:**
- "Add a new wine to the catalog: [details]"
- "Update the price of [product] to $[amount]"
- "Check inventory level for [product]"

### 📊 Reports & Analytics

**Sales analysis:**
- "What were our total sales last month?"
- "Compare this quarter to last year"
- "Show me sales by region"
- "What's our average order value?"
- "Generate a revenue report for [time period]"

**Performance metrics:**
- "Who are our top performing sales reps?"
- "Which products have the highest margins?"
- "Show me customer retention rate"
- "List customers who haven't ordered recently"

### 🔧 Bulk Operations

**Search and filter:**
- "Find all [entity] where [condition]"
- "Show me [table] filtered by [criteria]"
- "Search for '[term]' across all fields"

**Updates and changes:**
- "Update all [records] where [condition] to [new value]"
- "Archive all orders older than [date]"
- "Bulk update [field] for [criteria]"

## MCP Tool Names

If you need to be specific about which tool to use:

| Tool Name | Purpose |
|-----------|---------|
| `supabase_list_tables` | Discover available tables |
| `supabase_describe_table` | View table schema |
| `supabase_query_table` | Query with filters/sorting |
| `supabase_insert_record` | Create new records |
| `supabase_update_records` | Update existing records |
| `supabase_delete_records` | Delete records |
| `supabase_count_records` | Count matching records |
| `supabase_search_records` | Full-text search |

## Response Format Options

Add these to any query for specific formatting:

- "...and format as JSON" → Machine-readable structured data
- "...and format as markdown" → Human-readable formatted output
- "...show only [columns]" → Limit fields returned
- "...limit to [number] results" → Control result size

## Common Filters

Use these patterns in your queries:

**Equality:**
- "where status equals 'active'"
- "with status 'completed'"
- "that have type = 'retail'"

**Comparison:**
- "greater than $1000"
- "less than 50 units"
- "between [date1] and [date2]"

**Text search:**
- "containing 'Cabernet'"
- "that include 'Napa'"
- "matching 'restaurant'"

**Multiple conditions:**
- "where status is 'active' AND region is 'west'"
- "with type 'wine' OR type 'spirit'"

## Example Workflows

### Taking a New Order
1. "Find customer ABC Restaurant"
2. "Show me available Chardonnay wines under $40"
3. "Create an order for customer [id] with these items: [list]"
4. "Set delivery date to [date]"

### Monthly Sales Report
1. "Show me all completed orders from last month"
2. "Calculate total revenue"
3. "Break down sales by product category"
4. "Compare to previous month"
5. "Format as a summary report"

### Customer Reactivation
1. "Find customers who haven't ordered in 90 days"
2. "Show their previous purchase history"
3. "Create a list with contact information"
4. "Export to CSV format"

### Inventory Audit
1. "List all products with inventory below 10 cases"
2. "Check which have pending orders"
3. "Show products from each supplier"
4. "Generate reorder recommendations"

## Tips for Better Results

✅ **DO:**
- Be specific about what data you want
- Mention table names if you know them
- Use date ranges for time-based queries
- Ask for summaries of large result sets
- Request specific columns when possible

❌ **DON'T:**
- Ask overly broad questions without context
- Expect real-time data (database has slight delay)
- Try to delete records without specific filters
- Assume table names without checking first

## Getting Help

**"I don't know what tables exist"**
→ "List all tables in Wellcrafted"

**"I'm not sure what fields are available"**
→ "Describe the structure of the [table] table"

**"The query returned too much data"**
→ Add "limit to [number]" or be more specific with filters

**"I need to see the raw data structure"**
→ Add "format as JSON" to your query

**"How do I...?"**
→ Just ask in plain English! Claude understands natural language.

## Wine Industry Quick Reference

**Common wine terms you might use:**
- Varietal: Cabernet, Chardonnay, Pinot Noir, Merlot, Sauvignon Blanc
- Regions: Napa, Sonoma, Bordeaux, Burgundy, Tuscany, Rioja
- Styles: Red, White, Rosé, Sparkling, Dessert
- Sizes: Bottle (750ml), Case (12 bottles), Magnum (1.5L)

**Common customer types:**
- On-premise: Restaurants, bars, hotels
- Off-premise: Wine shops, grocery stores, retail

**Order statuses:**
- Pending, Confirmed, In Progress, Shipped, Delivered, Completed, Cancelled

## Remember

🎯 **Claude understands context** - You can have a conversation. Ask follow-up questions!

💬 **Natural language works** - No need for technical query syntax. Talk normally!

🔄 **Iterate and refine** - If results aren't quite right, ask Claude to adjust the query.

📊 **Request formatting** - Ask for tables, charts, summaries, or any format you need.

---

**Quick Start:**
"List all tables in Wellcrafted and show me what data we have available"

**Next Step:**
Pick a table that interests you and ask: "Show me some sample data from [table_name]"
