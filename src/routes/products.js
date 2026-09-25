const express = require("express");

function createProductRouter(productService) {
  const router = express.Router();

  router.post("/", (req, res) => {
    const result = productService.create(req.body);
    return res.status(result.status).json(result.body);
  });

  router.get("/", (req, res) => {
    const result = productService.list(req.query.category);
    return res.status(result.status).json(result.body);
  });

  router.get("/search", (req, res) => {
    const result = productService.search(req.query.keyword);
    return res.status(result.status).json(result.body);
  });

  router.post("/sell", (req, res) => {
    const result = productService.sell(req.body);
    return res.status(result.status).json(result.body);
  });

  router.put("/bulk-price-update", (req, res) => {
    const result = productService.bulkPriceUpdate(req.body);
    return res.status(result.status).json(result.body);
  });

  return router;
}

module.exports = { createProductRouter };
