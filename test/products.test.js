const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { ProductStore } = require("../src/store/productStore");

function request(app, { method, path, body }) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const { port } = server.address();
      try {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = await response.json();
        resolve({ status: response.status, body: json });
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });
}

describe("product API", () => {
  let app;
  let store;

  beforeEach(() => {
    store = new ProductStore();
    app = createApp(store);
  });

  it("creates a product", async () => {
    const result = await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "ข้าวผัด",
        sku: "FOOD001",
        price: 45.0,
        stock: 20,
        category: "อาหาร",
      },
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.name, "ข้าวผัด");
    assert.equal(result.body.sku, "FOOD001");
    assert.equal(result.body.id, 1);
    assert.ok(result.body.createdAt);
  });

  it("rejects invalid product data", async () => {
    const result = await request(app, {
      method: "POST",
      path: "/api/products",
      body: { name: "", sku: "AB", price: 0, stock: -1, category: "ของเล่น" },
    });

    assert.equal(result.status, 400);
    assert.ok(Array.isArray(result.body.errors));
    assert.ok(result.body.errors.length >= 4);
  });

  it("rejects duplicate SKU", async () => {
    await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "ข้าวผัด",
        sku: "FOOD001",
        price: 45,
        stock: 20,
        category: "อาหาร",
      },
    });

    const result = await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "น้ำเปล่า",
        sku: "food001",
        price: 10,
        stock: 5,
        category: "เครื่องดื่ม",
      },
    });

    assert.equal(result.status, 400);
    assert.ok(
      result.body.errors.includes("รหัสสินค้าต้องไม่ซ้ำกับสินค้าที่มีอยู่แล้ว")
    );
  });

  it("lists and filters by category", async () => {
    await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "ข้าวผัด",
        sku: "FOOD001",
        price: 45,
        stock: 20,
        category: "อาหาร",
      },
    });
    await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "น้ำเปล่า",
        sku: "DRINK001",
        price: 10,
        stock: 50,
        category: "เครื่องดื่ม",
      },
    });

    const all = await request(app, { method: "GET", path: "/api/products" });
    assert.equal(all.status, 200);
    assert.equal(all.body.length, 2);

    const foods = await request(app, {
      method: "GET",
      path: `/api/products?category=${encodeURIComponent("อาหาร")}`,
    });
    assert.equal(foods.body.length, 1);
    assert.equal(foods.body[0].sku, "FOOD001");
  });

  it("sells a product and reduces stock", async () => {
    await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "ข้าวผัด",
        sku: "FOOD001",
        price: 45,
        stock: 20,
        category: "อาหาร",
      },
    });

    const sold = await request(app, {
      method: "POST",
      path: "/api/products/sell",
      body: { productId: 1, quantity: 3 },
    });

    assert.equal(sold.status, 200);
    assert.equal(sold.body.product.stock, 17);
  });

  it("does not sell when stock is insufficient", async () => {
    await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "ข้าวผัด",
        sku: "FOOD001",
        price: 45,
        stock: 2,
        category: "อาหาร",
      },
    });

    const sold = await request(app, {
      method: "POST",
      path: "/api/products/sell",
      body: { productId: 1, quantity: 5 },
    });

    assert.equal(sold.status, 400);
    assert.equal(store.findById(1).stock, 2);
  });

  it("searches by name or sku case-insensitively", async () => {
    await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "ข้าวผัด",
        sku: "FOOD001",
        price: 45,
        stock: 20,
        category: "อาหาร",
      },
    });

    const byName = await request(app, {
      method: "GET",
      path: `/api/products/search?keyword=${encodeURIComponent("ข้าว")}`,
    });
    assert.equal(byName.body.length, 1);

    const bySku = await request(app, {
      method: "GET",
      path: "/api/products/search?keyword=food",
    });
    assert.equal(bySku.body.length, 1);
  });

  it("updates prices in bulk", async () => {
    await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "ข้าวผัด",
        sku: "FOOD001",
        price: 45,
        stock: 20,
        category: "อาหาร",
      },
    });
    await request(app, {
      method: "POST",
      path: "/api/products",
      body: {
        name: "น้ำเปล่า",
        sku: "DRINK001",
        price: 10,
        stock: 50,
        category: "เครื่องดื่ม",
      },
    });

    const result = await request(app, {
      method: "PUT",
      path: "/api/products/bulk-price-update",
      body: [
        { productId: 1, newPrice: 50 },
        { productId: 2, newPrice: 12 },
        { productId: 99, newPrice: 1 },
      ],
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.updated, 2);
    assert.equal(result.body.failed, 1);
    assert.equal(store.findById(1).price, 50);
    assert.equal(store.findById(2).price, 12);
  });
});
