#!/usr/bin/env python3
"""
Add Foreign Key Constraints to Supabase Database
Uses the Supabase REST API to execute DDL statements
"""

import json
import sys
from supabase import create_client, Client

# Database credentials
SUPABASE_URL = "https://wlwqkblueezqydturcpv.supabase.co"
SERVICE_KEY = "<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>"

# SQL statements for each constraint
CONSTRAINTS = [
    {
        "name": "fk_order_customer",
        "description": "Order → Customer (RESTRICT)",
        "sql": """
            ALTER TABLE "Order"
            ADD CONSTRAINT fk_order_customer
            FOREIGN KEY ("CustomerId")
            REFERENCES "Customer"(id)
            ON DELETE RESTRICT;
        """
    },
    {
        "name": "fk_orderline_order",
        "description": "OrderLine → Order (CASCADE)",
        "sql": """
            ALTER TABLE "OrderLine"
            ADD CONSTRAINT fk_orderline_order
            FOREIGN KEY ("OrderId")
            REFERENCES "Order"(id)
            ON DELETE CASCADE;
        """
    },
    {
        "name": "fk_orderline_sku",
        "description": "OrderLine → SKU (RESTRICT)",
        "sql": """
            ALTER TABLE "OrderLine"
            ADD CONSTRAINT fk_orderline_sku
            FOREIGN KEY ("SkuId")
            REFERENCES "SKUs"(id)
            ON DELETE RESTRICT;
        """
    },
    {
        "name": "fk_sku_product",
        "description": "SKU → Product (RESTRICT)",
        "sql": """
            ALTER TABLE "SKUs"
            ADD CONSTRAINT fk_sku_product
            FOREIGN KEY ("ProductId")
            REFERENCES "Product"(id)
            ON DELETE RESTRICT;
        """
    }
]

def execute_sql(supabase: Client, sql: str, description: str) -> tuple[bool, str]:
    """
    Execute SQL statement via Supabase RPC
    Returns: (success, message)
    """
    try:
        # Execute via RPC function (if available) or direct execution
        result = supabase.rpc('exec_sql', {'query': sql}).execute()
        return True, f"✅ {description}: SUCCESS"
    except Exception as e:
        error_msg = str(e)
        # Check if constraint already exists
        if "already exists" in error_msg.lower():
            return True, f"⚠️  {description}: Already exists (skipped)"
        return False, f"❌ {description}: FAILED - {error_msg}"

def check_constraint_exists(supabase: Client, constraint_name: str) -> bool:
    """Check if a constraint already exists"""
    try:
        sql = f"""
            SELECT 1
            FROM pg_constraint
            WHERE conname = '{constraint_name}';
        """
        result = supabase.rpc('exec_sql', {'query': sql}).execute()
        return bool(result.data)
    except:
        return False

def verify_constraints(supabase: Client) -> dict:
    """Verify all constraints were added successfully"""
    try:
        sql = """
            SELECT
                tc.table_name,
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column,
                rc.delete_rule
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            LEFT JOIN information_schema.referential_constraints AS rc
                ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name IN ('Order', 'OrderLine', 'SKUs')
            ORDER BY tc.table_name, tc.constraint_name;
        """
        result = supabase.rpc('exec_sql', {'query': sql}).execute()
        return result.data
    except Exception as e:
        return {"error": str(e)}

def main():
    """Main execution function"""
    print("=" * 60)
    print("Foreign Key Constraint Addition")
    print("=" * 60)
    print()

    # Initialize Supabase client
    try:
        supabase = create_client(SUPABASE_URL, SERVICE_KEY)
        print("✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)

    print()
    print("Adding constraints...")
    print("-" * 60)

    # Add each constraint
    results = []
    for constraint in CONSTRAINTS:
        success, message = execute_sql(
            supabase,
            constraint["sql"],
            constraint["description"]
        )
        print(message)
        results.append({
            "name": constraint["name"],
            "description": constraint["description"],
            "success": success,
            "message": message
        })

    print()
    print("-" * 60)
    print("Summary:")
    print(f"  Total constraints: {len(results)}")
    print(f"  Successful: {sum(1 for r in results if r['success'])}")
    print(f"  Failed: {sum(1 for r in results if not r['success'])}")
    print()

    # Verify constraints
    print("=" * 60)
    print("Verifying constraints...")
    print("=" * 60)

    constraints_data = verify_constraints(supabase)
    if isinstance(constraints_data, dict) and "error" in constraints_data:
        print(f"⚠️  Could not verify: {constraints_data['error']}")
    else:
        print(json.dumps(constraints_data, indent=2))

    print()
    print("=" * 60)
    print("Constraint addition complete!")
    print("=" * 60)

    # Return exit code based on results
    if all(r['success'] for r in results):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
