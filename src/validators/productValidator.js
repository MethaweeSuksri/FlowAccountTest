const { CATEGORIES } = require("../constants");

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function validateCreateProduct(body, findBySku) {
  const errors = [];
  const data = body && typeof body === "object" ? body : {};

  if (isBlank(data.name)) {
    errors.push("ชื่อสินค้าต้องไม่ว่าง");
  }

  if (isBlank(data.sku)) {
    errors.push("รหัสสินค้าต้องไม่ว่าง");
  } else if (String(data.sku).trim().length < 3) {
    errors.push("รหัสสินค้าต้องมีอย่างน้อย 3 ตัวอักษร");
  } else if (findBySku(data.sku)) {
    errors.push("รหัสสินค้าต้องไม่ซ้ำกับสินค้าที่มีอยู่แล้ว");
  }

  const price = Number(data.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.push("ราคาต้องมากกว่า 0");
  }

  const stock = Number(data.stock);
  if (!Number.isFinite(stock) || stock < 0) {
    errors.push("จำนวนคงเหลือต้องไม่ติดลบ");
  }

  if (!CATEGORIES.includes(data.category)) {
    errors.push(`หมวดหมู่ต้องเป็นหนึ่งใน: ${CATEGORIES.join(", ")}`);
  }

  return errors;
}

function validateSell(body) {
  const data = body && typeof body === "object" ? body : {};
  const quantity = Number(data.quantity);
  const productId = Number(data.productId);

  return { data, quantity, productId };
}

function validateBulkPriceUpdate(body) {
  if (!Array.isArray(body)) {
    return { ok: false, error: "ต้องส่งเป็น array ของ {productId, newPrice}" };
  }
  return { ok: true, items: body };
}

module.exports = {
  validateCreateProduct,
  validateSell,
  validateBulkPriceUpdate,
};
