const { CATEGORIES } = require("../constants");
const {
  validateCreateProduct,
  validateSell,
  validateBulkPriceUpdate,
} = require("../validators/productValidator");

class ProductService {
  constructor(store) {
    this.store = store;
  }

  create(body) {
    const errors = validateCreateProduct(body, (sku) => this.store.findBySku(sku));
    if (errors.length > 0) {
      return { status: 400, body: { errors } };
    }

    const product = this.store.create(body);
    return { status: 201, body: product };
  }

  list(category) {
    if (category !== undefined && category !== "") {
      if (!CATEGORIES.includes(category)) {
        return {
          status: 400,
          body: { errors: [`หมวดหมู่ต้องเป็นหนึ่งใน: ${CATEGORIES.join(", ")}`] },
        };
      }
      return { status: 200, body: this.store.findByCategory(category) };
    }

    return { status: 200, body: this.store.findAll() };
  }

  search(keyword) {
    if (keyword === undefined || String(keyword).trim() === "") {
      return { status: 400, body: { errors: ["กรุณาระบุ keyword"] } };
    }

    return { status: 200, body: this.store.search(keyword) };
  }

  sell(body) {
    const { quantity, productId } = validateSell(body);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { status: 400, body: { errors: ["จำนวนที่ขายต้องมากกว่า 0"] } };
    }

    const product = this.store.findById(productId);
    if (!product) {
      return { status: 404, body: { errors: ["ไม่พบสินค้าในระบบ"] } };
    }

    if (product.stock < quantity) {
      return {
        status: 400,
        body: {
          errors: [
            `สต็อกไม่เพียงพอ (คงเหลือ ${product.stock}, ต้องการขาย ${quantity})`,
          ],
        },
      };
    }

    product.stock -= quantity;
    return {
      status: 200,
      body: {
        message: "ขายสินค้าสำเร็จ",
        product,
        soldQuantity: quantity,
      },
    };
  }

  bulkPriceUpdate(body) {
    const parsed = validateBulkPriceUpdate(body);
    if (!parsed.ok) {
      return { status: 400, body: { errors: [parsed.error] } };
    }

    let updatedCount = 0;
    const failures = [];

    for (const item of parsed.items) {
      const productId = Number(item?.productId);
      const newPrice = Number(item?.newPrice);
      const product = this.store.findById(productId);

      if (!product) {
        failures.push({ productId, reason: "ไม่พบสินค้าในระบบ" });
        continue;
      }

      if (!Number.isFinite(newPrice) || newPrice <= 0) {
        failures.push({ productId, reason: "ราคาต้องมากกว่า 0" });
        continue;
      }

      product.price = newPrice;
      updatedCount += 1;
    }

    return {
      status: 200,
      body: {
        updated: updatedCount,
        failed: failures.length,
        failures,
      },
    };
  }
}

module.exports = { ProductService };
