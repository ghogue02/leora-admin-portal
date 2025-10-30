#!/usr/bin/env python3
"""
Discover Your Wellcrafted Database Schema
Run this locally to see what tables and data you have.
"""

import os
import sys

# Set your credentials
os.environ["SUPABASE_URL"] = "https://zqezunzlyjkseugujkrl.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>"

try:
    import psycopg2
    from supabase import create_client
    import json
except ImportError:
    print("Installing required packages...")
    os.system("pip install psycopg2-binary supabase")
    import psycopg2
    from supabase import create_client
    import json

print("=" * 80)
print("WELLCRAFTED DATABASE SCHEMA DISCOVERY")
print("=" * 80)

# Method 1: Direct PostgreSQL connection
print("\n🔍 Method 1: Direct PostgreSQL Connection")
print("-" * 80)

db_url = "postgresql://postgres.zqezunzlyjkseugujkrl:ZKK5pPySuCq7JhpO@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    print("✅ Connected successfully!\n")
    
    # Get all tables
    cur.execute("""
        SELECT 
            table_name,
            (SELECT COUNT(*) FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    
    tables = cur.fetchall()
    
    if tables:
        print(f"📊 Found {len(tables)} tables:\n")
        
        all_schema = {}
        
        for table_name, col_count in tables:
            print(f"\n{'=' * 80}")
            print(f"TABLE: {table_name} ({col_count} columns)")
            print('=' * 80)
            
            # Get columns
            cur.execute("""
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position;
            """, (table_name,))
            
            columns = cur.fetchall()
            all_schema[table_name] = []
            
            for col_name, data_type, is_nullable, col_default, max_length in columns:
                nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
                default = f" DEFAULT {col_default}" if col_default else ""
                length = f"({max_length})" if max_length else ""
                print(f"  • {col_name:<30} {data_type}{length:<20} {nullable}{default}")
                
                all_schema[table_name].append({
                    "name": col_name,
                    "type": data_type,
                    "nullable": is_nullable == "YES",
                    "default": str(col_default) if col_default else None
                })
            
            # Get row count
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{table_name}";')
                count = cur.fetchone()[0]
                print(f"\n📈 Row count: {count:,}")
            except Exception as e:
                print(f"\n📈 Row count: {str(e)[:100]}")
            
            # Get sample records
            try:
                cur.execute(f'SELECT * FROM "{table_name}" LIMIT 3;')
                samples = cur.fetchall()
                if samples:
                    col_names = [desc[0] for desc in cur.description]
                    print(f"\n📝 Sample records:")
                    for i, sample in enumerate(samples, 1):
                        sample_dict = dict(zip(col_names, sample))
                        print(f"\n   Record {i}:")
                        for key, value in sample_dict.items():
                            print(f"      {key}: {value}")
            except Exception as e:
                print(f"\n📝 Sample: {str(e)[:100]}")
            
            # Get foreign keys
            cur.execute("""
                SELECT
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = 'public'
                    AND tc.table_name = %s;
            """, (table_name,))
            
            foreign_keys = cur.fetchall()
            if foreign_keys:
                print(f"\n🔗 Foreign Keys:")
                for col, ref_table, ref_col in foreign_keys:
                    print(f"  • {col} → {ref_table}.{ref_col}")
        
        # Save schema to file
        with open('wellcrafted_schema.json', 'w') as f:
            json.dump(all_schema, f, indent=2, default=str)
        
        print(f"\n\n{'=' * 80}")
        print("✅ Schema saved to: wellcrafted_schema.json")
        print("=" * 80)
        
    else:
        print("⚠️  No tables found in the 'public' schema")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ PostgreSQL connection failed: {e}")
    print("\n🔍 Method 2: Trying Supabase REST API...")
    print("-" * 80)
    
    # Fallback to Supabase client
    try:
        supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        )
        
        print("✅ Supabase client created")
        print("\nTrying common table names...")
        
        common_tables = [
            'customers', 'clients', 'accounts', 'contacts', 'users',
            'products', 'wines', 'inventory', 'items', 'catalog',
            'orders', 'sales', 'invoices', 'quotes', 'order_items',
            'producers', 'suppliers', 'vendors', 'wineries', 'brands',
            'regions', 'territories', 'locations',
            'notes', 'tasks', 'activities', 'events',
            'prices', 'pricing', 'discounts'
        ]
        
        found = []
        for table in common_tables:
            try:
                result = supabase.table(table).select("*", count="exact").limit(1).execute()
                count = result.count if hasattr(result, 'count') else 0
                found.append((table, count))
                print(f"  ✅ {table}: {count} records")
                
                if result.data:
                    print(f"     Sample columns: {list(result.data[0].keys())}")
            except:
                pass
        
        if found:
            print(f"\n✅ Found {len(found)} accessible tables")
        else:
            print("\n⚠️  No tables found with common names")
            print("    Your tables might have different names.")
            print("    Try checking the Supabase dashboard directly.")
            
    except Exception as e2:
        print(f"❌ Supabase client also failed: {e2}")

print("\n\nNext steps:")
print("1. Review the schema information above")
print("2. The MCP server will work with whatever tables you have")
print("3. Try asking Claude: 'List all tables in Wellcrafted'")
