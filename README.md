# FlowAccount Product API

Express (Node.js) product management API for the FlowAccount backend coding challenge. Data is stored in memory.

## Setup

```bash
npm install
npm start
```

Server: `http://localhost:3000`

```bash
npm test
```

## Endpoints

### Create product

`POST /api/products`

```json
{
  "name": "ข้าวผัด",
  "sku": "FOOD001",
  "price": 45.0,
  "stock": 20,
  "category": "อาหาร"
}
```

**201** on success. **400** with `{ "errors": [...] }` when validation fails.

Rules:

- `name` required
- `sku` required, at least 3 characters, unique (case-insensitive)
- `price` > 0
- `stock` >= 0
- `category` one of: `อาหาร`, `เครื่องดื่ม`, `ของใช้`, `เสื้อผ้า`

### List products

`GET /api/products`

`GET /api/products?category=อาหาร`

### Sell (reduce stock)

`POST /api/products/sell`

```json
{
  "productId": 1,
  "quantity": 2
}
```

Checks, in order: quantity > 0, product exists, stock >= quantity. Then `stock -= quantity`.

### Search (bonus)

`GET /api/products/search?keyword=ข้าว`

Matches `name` or `sku`, case-insensitive.

### Bulk price update (bonus)

`PUT /api/products/bulk-price-update`

```json
[
  { "productId": 1, "newPrice": 50 },
  { "productId": 2, "newPrice": 12 }
]
```

Response includes how many prices were updated and which items failed.
