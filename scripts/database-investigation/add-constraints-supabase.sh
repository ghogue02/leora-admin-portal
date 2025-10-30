#!/bin/bash
# Add Foreign Key Constraints via Supabase SQL API
# This script uses the Supabase SQL endpoint to add constraints

SUPABASE_URL="https://wlwqkblueezqydturcpv.supabase.co"
SERVICE_KEY="<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>"

echo "=========================================="
echo "Adding Foreign Key Constraints"
echo "=========================================="
echo ""

# Function to execute SQL
execute_sql() {
    local sql="$1"
    local description="$2"

    echo "Executing: $description"

    response=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SERVICE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$sql" | jq -Rs .)}")

    echo "Response: $response"
    echo ""
}

# Constraint 1: Order → Customer
SQL1='ALTER TABLE "Order"
    ADD CONSTRAINT fk_order_customer
    FOREIGN KEY ("CustomerId")
    REFERENCES "Customer"(id)
    ON DELETE RESTRICT;'

execute_sql "$SQL1" "Order → Customer constraint"

# Constraint 2: OrderLine → Order (CASCADE)
SQL2='ALTER TABLE "OrderLine"
    ADD CONSTRAINT fk_orderline_order
    FOREIGN KEY ("OrderId")
    REFERENCES "Order"(id)
    ON DELETE CASCADE;'

execute_sql "$SQL2" "OrderLine → Order constraint"

# Constraint 3: OrderLine → SKU
SQL3='ALTER TABLE "OrderLine"
    ADD CONSTRAINT fk_orderline_sku
    FOREIGN KEY ("SkuId")
    REFERENCES "SKUs"(id)
    ON DELETE RESTRICT;'

execute_sql "$SQL3" "OrderLine → SKU constraint"

# Constraint 4: SKU → Product
SQL4='ALTER TABLE "SKUs"
    ADD CONSTRAINT fk_sku_product
    FOREIGN KEY ("ProductId")
    REFERENCES "Product"(id)
    ON DELETE RESTRICT;'

execute_sql "$SQL4" "SKU → Product constraint"

echo "=========================================="
echo "Constraint addition completed"
echo "=========================================="
