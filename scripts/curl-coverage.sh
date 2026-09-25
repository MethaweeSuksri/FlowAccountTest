#!/usr/bin/env bash
# 100% API path coverage for the FlowAccount Product API.
# Start the server first: npm start
# Then run: bash scripts/curl-coverage.sh
#
# Expected HTTP codes are printed next to each request.
# Data lives in memory, so run this against a freshly started server
# so product IDs stay 1, 2, 3, 4.

set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"

section() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

req() {
  local expected="$1"
  local title="$2"
  shift 2
  echo
  echo "# [$expected] $title"
  echo "# $*"
  curl -sS -w "\nHTTP %{http_code}\n" "$@"
  echo
}

# ------------------------------------------------------------
# GET /health
# ------------------------------------------------------------
section "GET /health"

# Covers: app.js health route
req 200 "health check" \
  -X GET "$BASE/health"

# ------------------------------------------------------------
# POST /api/products  — validation failures
# ------------------------------------------------------------
section "POST /api/products — validation"

# Covers: create() with empty/missing body object fields
#   - isBlank(name)
#   - isBlank(sku)
#   - price not finite / <= 0
#   - stock not finite / < 0 (undefined -> NaN)
#   - category not in the 4 allowed values
req 400 "all required fields missing" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{}'

# Covers: isBlank(name) via whitespace-only string
req 400 "name is whitespace only" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"   ","sku":"FOOD000","price":10,"stock":1,"category":"อาหาร"}'

# Covers: isBlank(sku) via empty string (name/price/stock/category valid)
req 400 "sku is empty" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"ข้าวผัด","sku":"","price":45,"stock":20,"category":"อาหาร"}'

# Covers: sku.trim().length < 3
req 400 "sku shorter than 3 characters" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"ข้าวผัด","sku":"AB","price":45,"stock":20,"category":"อาหาร"}'

# Covers: Number(price) <= 0
req 400 "price is 0" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"ข้าวผัด","sku":"FOOD000","price":0,"stock":20,"category":"อาหาร"}'

# Covers: Number(price) not finite (string)
req 400 "price is not a number" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"ข้าวผัด","sku":"FOOD000","price":"abc","stock":20,"category":"อาหาร"}'

# Covers: Number(stock) < 0
req 400 "stock is negative" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"ข้าวผัด","sku":"FOOD000","price":45,"stock":-1,"category":"อาหาร"}'

# Covers: Number(stock) not finite
req 400 "stock is not a number" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"ข้าวผัด","sku":"FOOD000","price":45,"stock":"many","category":"อาหาร"}'

# Covers: category not in CATEGORIES
req 400 "invalid category" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"ข้าวผัด","sku":"FOOD000","price":45,"stock":20,"category":"ของเล่น"}'

# Covers: several validation errors returned together (errors[])
req 400 "multiple validation errors at once" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"","sku":"AB","price":0,"stock":-1,"category":"ของเล่น"}'

# ------------------------------------------------------------
# POST /api/products  — success (all 4 categories)
# ------------------------------------------------------------
section "POST /api/products — success"

# Covers: create() success, store.create(), trim name/sku, numeric price/stock
# Product id=1
req 201 "create อาหาร (stock > 0)" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":" ข้าวผัด ","sku":" FOOD001 ","price":45.00,"stock":20,"category":"อาหาร"}'

# Covers: stock === 0 is allowed (>= 0)
# Product id=2
req 201 "create เครื่องดื่ม (stock = 0)" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"น้ำเปล่า","sku":"DRINK001","price":10,"stock":0,"category":"เครื่องดื่ม"}'

# Product id=3
req 201 "create ของใช้" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"สบู่","sku":"HOME001","price":25,"stock":15,"category":"ของใช้"}'

# Product id=4
req 201 "create เสื้อผ้า" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"เสื้อยืด","sku":"CLOTH001","price":199,"stock":8,"category":"เสื้อผ้า"}'

# Covers: findBySku duplicate (case-insensitive: food001 vs FOOD001)
req 400 "duplicate sku (case-insensitive)" \
  -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"ข้าวผัดพิเศษ","sku":"food001","price":50,"stock":5,"category":"อาหาร"}'

# ------------------------------------------------------------
# GET /api/products
# ------------------------------------------------------------
section "GET /api/products"

# Covers: list() with no category → findAll()
req 200 "list all products" \
  -X GET "$BASE/api/products"

# Covers: list() with category="" → treated as list all
req 200 "list all when category query is empty" \
  -X GET "$BASE/api/products?category="

# Covers: list() valid category → findByCategory()
req 200 "filter by category อาหาร" \
  -G "$BASE/api/products" --data-urlencode "category=อาหาร"

# Covers: category that exists but has 0 matching extra items still returns array
req 200 "filter by category เสื้อผ้า" \
  -G "$BASE/api/products" --data-urlencode "category=เสื้อผ้า"

# Covers: list() invalid category → 400
req 400 "filter by unknown category" \
  -G "$BASE/api/products" --data-urlencode "category=ของเล่น"

# ------------------------------------------------------------
# GET /api/products/search
# ------------------------------------------------------------
section "GET /api/products/search"

# Covers: search() keyword undefined
req 400 "search without keyword" \
  -X GET "$BASE/api/products/search"

# Covers: search() keyword whitespace-only
req 400 "search with blank keyword" \
  -G "$BASE/api/products/search" --data-urlencode "keyword=   "

# Covers: store.search() match on name (Thai), case-insensitive lowercasing
req 200 "search by name substring" \
  -G "$BASE/api/products/search" --data-urlencode "keyword=ข้าว"

# Covers: store.search() match on sku, case-insensitive
req 200 "search by sku case-insensitive" \
  -G "$BASE/api/products/search" --data-urlencode "keyword=food"

# Covers: store.search() no matches → empty array
req 200 "search with no matches" \
  -G "$BASE/api/products/search" --data-urlencode "keyword=zzzz-not-found"

# ------------------------------------------------------------
# POST /api/products/sell
# ------------------------------------------------------------
section "POST /api/products/sell"

# Covers: quantity missing → Number(undefined) is NaN → not finite
req 400 "sell quantity missing" \
  -X POST "$BASE/api/products/sell" \
  -H "Content-Type: application/json" \
  -d '{"productId":1}'

# Covers: quantity === 0 → quantity <= 0
req 400 "sell quantity is 0" \
  -X POST "$BASE/api/products/sell" \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":0}'

# Covers: quantity < 0
req 400 "sell quantity is negative" \
  -X POST "$BASE/api/products/sell" \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":-2}'

# Covers: quantity not a number
req 400 "sell quantity is not a number" \
  -X POST "$BASE/api/products/sell" \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":"two"}'

# Covers: product not found (id 999)
req 404 "sell unknown productId" \
  -X POST "$BASE/api/products/sell" \
  -H "Content-Type: application/json" \
  -d '{"productId":999,"quantity":1}'

# Covers: productId not a number → Number(...) is NaN → findById fails → 404
req 404 "sell productId is not a number" \
  -X POST "$BASE/api/products/sell" \
  -H "Content-Type: application/json" \
  -d '{"productId":"abc","quantity":1}'

# Covers: stock < quantity (id=2 was created with stock 0)
req 400 "sell when stock is insufficient" \
  -X POST "$BASE/api/products/sell" \
  -H "Content-Type: application/json" \
  -d '{"productId":2,"quantity":1}'

# Covers: happy path stock -= quantity (id=1 stock 20 → 17)
req 200 "sell success, reduce stock" \
  -X POST "$BASE/api/products/sell" \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":3}'

# Confirm stock after sell (id=1 should now be 17)
req 200 "list after sell to confirm stock" \
  -X GET "$BASE/api/products"

# ------------------------------------------------------------
# PUT /api/products/bulk-price-update
# ------------------------------------------------------------
section "PUT /api/products/bulk-price-update"

# Covers: body is not an array
req 400 "bulk update body is an object, not array" \
  -X PUT "$BASE/api/products/bulk-price-update" \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"newPrice":50}'

# Covers: empty array → updated 0, failed 0 (loop does not run)
req 200 "bulk update empty array" \
  -X PUT "$BASE/api/products/bulk-price-update" \
  -H "Content-Type: application/json" \
  -d '[]'

# Covers: product not found in loop
req 200 "bulk update unknown productId" \
  -X PUT "$BASE/api/products/bulk-price-update" \
  -H "Content-Type: application/json" \
  -d '[{"productId":999,"newPrice":50}]'

# Covers: newPrice <= 0
req 200 "bulk update price is 0 (item fails)" \
  -X PUT "$BASE/api/products/bulk-price-update" \
  -H "Content-Type: application/json" \
  -d '[{"productId":1,"newPrice":0}]'

# Covers: newPrice not finite
req 200 "bulk update price is not a number (item fails)" \
  -X PUT "$BASE/api/products/bulk-price-update" \
  -H "Content-Type: application/json" \
  -d '[{"productId":1,"newPrice":"cheap"}]'

# Covers: null item → optional chaining item?.productId, findById(NaN) fails
req 200 "bulk update null item in array" \
  -X PUT "$BASE/api/products/bulk-price-update" \
  -H "Content-Type: application/json" \
  -d '[null]'

# Covers: mixed success + both failure reasons in one request
#   id=1 valid update, id=3 valid update, 999 missing, id=2 invalid price
req 200 "bulk update mixed success and failures" \
  -X PUT "$BASE/api/products/bulk-price-update" \
  -H "Content-Type: application/json" \
  -d '[{"productId":1,"newPrice":50},{"productId":3,"newPrice":30},{"productId":999,"newPrice":1},{"productId":2,"newPrice":-5}]'

# Confirm prices after bulk update
req 200 "list after bulk price update" \
  -X GET "$BASE/api/products"

echo "Done. Re-run against a fresh server if IDs drifted."
