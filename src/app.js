const express = require("express");
const { ProductStore } = require("./store/productStore");
const { ProductService } = require("./services/productService");
const { createProductRouter } = require("./routes/products");

function createApp(store = new ProductStore()) {
  const app = express();
  const productService = new ProductService(store);

  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/products", createProductRouter(productService));

  return app;
}

module.exports = { createApp };
