class ProductStore {
  constructor() {
    this.products = [];
    this.nextId = 1;
  }

  reset() {
    this.products = [];
    this.nextId = 1;
  }

  create(data) {
    const product = {
      id: this.nextId++,
      name: data.name.trim(),
      sku: data.sku.trim(),
      price: Number(data.price),
      stock: Number(data.stock),
      category: data.category,
      createdAt: new Date().toISOString(),
    };
    this.products.push(product);
    return product;
  }

  findAll() {
    return this.products;
  }

  findById(id) {
    return this.products.find((product) => product.id === id) ?? null;
  }

  findBySku(sku) {
    const normalized = String(sku).trim().toLowerCase();
    return (
      this.products.find((product) => product.sku.toLowerCase() === normalized) ??
      null
    );
  }

  findByCategory(category) {
    return this.products.filter((product) => product.category === category);
  }

  search(keyword) {
    const needle = String(keyword).trim().toLowerCase();
    if (!needle) {
      return [];
    }

    return this.products.filter((product) => {
      return (
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle)
      );
    });
  }
}

module.exports = { ProductStore };
