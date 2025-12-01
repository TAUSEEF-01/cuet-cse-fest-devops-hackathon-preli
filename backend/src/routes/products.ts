import express, { Request, Response } from "express";
import { ProductModel } from "../models/product";
import mongoose from "mongoose";

const router = express.Router();

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to sanitize string input
const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, "");
};

// Create a product
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, price, description, category, stock } = req.body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res
        .status(400)
        .json({
          error: "Invalid name",
          message: "Name is required and must be a non-empty string",
        });
    }

    // Validate price
    if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
      return res
        .status(400)
        .json({
          error: "Invalid price",
          message: "Price must be a non-negative number",
        });
    }

    // Build product object with optional fields
    const productData: Record<string, unknown> = {
      name: sanitizeString(name),
      price,
    };

    // Add optional fields if provided
    if (description && typeof description === "string") {
      productData.description = sanitizeString(description);
    }
    if (category && typeof category === "string") {
      productData.category = sanitizeString(category);
    }
    if (typeof stock === "number" && stock >= 0) {
      productData.stock = Math.floor(stock);
    }

    const product = new ProductModel(productData);
    const saved = await product.save();
    console.log("Product created:", saved._id);
    return res.status(201).json(saved);
  } catch (err) {
    console.error("POST /api/products error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to create product" });
  }
});

// List products with pagination and filtering
router.get("/", async (req: Request, res: Response) => {
  try {
    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 10)
    );
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = (req.query.sortBy as string) || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortOrder };

    // Filtering
    const filter: Record<string, unknown> = {};

    // Filter by category
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) {
        (filter.price as Record<string, number>).$gte = parseFloat(
          req.query.minPrice as string
        );
      }
      if (req.query.maxPrice) {
        (filter.price as Record<string, number>).$lte = parseFloat(
          req.query.maxPrice as string
        );
      }
    }

    // Filter by stock availability
    if (req.query.inStock === "true") {
      filter.stock = { $gt: 0 };
    }

    // Execute query with pagination
    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    return res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to fetch products" });
  }
});

// Search products
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q;

    if (!query || typeof query !== "string" || query.trim() === "") {
      return res
        .status(400)
        .json({ error: "Invalid query", message: "Search query is required" });
    }

    const searchRegex = new RegExp(sanitizeString(query), "i");

    const products = await ProductModel.find({
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ products, count: products.length });
  } catch (err) {
    console.error("GET /api/products/search error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to search products" });
  }
});

// Get product statistics
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await ProductModel.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          totalStock: { $sum: "$stock" },
        },
      },
    ]);

    const categoryStats = await ProductModel.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return res.json({
      overview: stats[0] || {
        totalProducts: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalStock: 0,
      },
      byCategory: categoryStats,
    });
  } catch (err) {
    console.error("GET /api/products/stats error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to get statistics" });
  }
});

// Get single product by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ error: "Invalid ID", message: "Product ID is not valid" });
    }

    const product = await ProductModel.findById(id).lean();

    if (!product) {
      return res
        .status(404)
        .json({ error: "Not found", message: "Product not found" });
    }

    return res.json(product);
  } catch (err) {
    console.error("GET /api/products/:id error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to fetch product" });
  }
});

// Update product by ID
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ error: "Invalid ID", message: "Product ID is not valid" });
    }

    const { name, price, description, category, stock } = req.body;
    const updateData: Record<string, unknown> = {};

    // Validate and add fields to update
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return res
          .status(400)
          .json({
            error: "Invalid name",
            message: "Name must be a non-empty string",
          });
      }
      updateData.name = sanitizeString(name);
    }

    if (price !== undefined) {
      if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
        return res
          .status(400)
          .json({
            error: "Invalid price",
            message: "Price must be a non-negative number",
          });
      }
      updateData.price = price;
    }

    if (description !== undefined) {
      updateData.description =
        typeof description === "string" ? sanitizeString(description) : "";
    }

    if (category !== undefined) {
      updateData.category =
        typeof category === "string" ? sanitizeString(category) : "";
    }

    if (stock !== undefined) {
      if (typeof stock !== "number" || stock < 0) {
        return res
          .status(400)
          .json({
            error: "Invalid stock",
            message: "Stock must be a non-negative number",
          });
      }
      updateData.stock = Math.floor(stock);
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ error: "No data", message: "No valid fields to update" });
    }

    const updated = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res
        .status(404)
        .json({ error: "Not found", message: "Product not found" });
    }

    console.log("Product updated:", id);
    return res.json(updated);
  } catch (err) {
    console.error("PUT /api/products/:id error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to update product" });
  }
});

// Partial update product (PATCH)
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ error: "Invalid ID", message: "Product ID is not valid" });
    }

    const updates = req.body;
    const allowedFields = ["name", "price", "description", "category", "stock"];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (
          field === "name" &&
          (typeof updates.name !== "string" || updates.name.trim() === "")
        ) {
          continue;
        }
        if (
          field === "price" &&
          (typeof updates.price !== "number" || updates.price < 0)
        ) {
          continue;
        }
        if (
          field === "stock" &&
          (typeof updates.stock !== "number" || updates.stock < 0)
        ) {
          continue;
        }

        if (typeof updates[field] === "string") {
          updateData[field] = sanitizeString(updates[field]);
        } else {
          updateData[field] = updates[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ error: "No data", message: "No valid fields to update" });
    }

    const updated = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res
        .status(404)
        .json({ error: "Not found", message: "Product not found" });
    }

    console.log("Product patched:", id);
    return res.json(updated);
  } catch (err) {
    console.error("PATCH /api/products/:id error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to update product" });
  }
});

// Delete product by ID
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ error: "Invalid ID", message: "Product ID is not valid" });
    }

    const deleted = await ProductModel.findByIdAndDelete(id).lean();

    if (!deleted) {
      return res
        .status(404)
        .json({ error: "Not found", message: "Product not found" });
    }

    console.log("Product deleted:", id);
    return res.json({
      message: "Product deleted successfully",
      product: deleted,
    });
  } catch (err) {
    console.error("DELETE /api/products/:id error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to delete product" });
  }
});

// Bulk delete products
router.post("/bulk-delete", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ error: "Invalid request", message: "IDs array is required" });
    }

    // Validate all IDs
    const validIds = ids.filter((id) => isValidObjectId(id));

    if (validIds.length === 0) {
      return res
        .status(400)
        .json({
          error: "Invalid IDs",
          message: "No valid product IDs provided",
        });
    }

    const result = await ProductModel.deleteMany({ _id: { $in: validIds } });

    console.log("Bulk delete:", result.deletedCount, "products");
    return res.json({
      message: "Products deleted successfully",
      deletedCount: result.deletedCount,
      requestedCount: ids.length,
      validIdsCount: validIds.length,
    });
  } catch (err) {
    console.error("POST /api/products/bulk-delete error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to delete products" });
  }
});

// Update stock (increment/decrement)
router.patch("/:id/stock", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ error: "Invalid ID", message: "Product ID is not valid" });
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return res
        .status(400)
        .json({
          error: "Invalid quantity",
          message: "Quantity must be a positive number",
        });
    }

    const increment = operation === "decrement" ? -quantity : quantity;

    // Use findOneAndUpdate with condition to prevent negative stock
    const updated = await ProductModel.findOneAndUpdate(
      {
        _id: id,
        ...(operation === "decrement" ? { stock: { $gte: quantity } } : {}),
      },
      { $inc: { stock: increment } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      const product = await ProductModel.findById(id).lean();
      if (!product) {
        return res
          .status(404)
          .json({ error: "Not found", message: "Product not found" });
      }
      return res
        .status(400)
        .json({
          error: "Insufficient stock",
          message: "Not enough stock to decrement",
        });
    }

    console.log("Stock updated:", id, operation, quantity);
    return res.json(updated);
  } catch (err) {
    console.error("PATCH /api/products/:id/stock error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: "Failed to update stock" });
  }
});

export default router;
