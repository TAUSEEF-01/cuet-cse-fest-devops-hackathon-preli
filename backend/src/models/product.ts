import mongoose from "mongoose";
import { Product } from "../types";

// Product document type for mongoose
export type ProductDocument = mongoose.Document & Product;

// Product schema with enhanced fields
const ProductSchema = new mongoose.Schema<ProductDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "uncategorized",
      index: true,
    },
    stock: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    // Add text index for search functionality
    autoIndex: true,
  }
);

// Compound index for common queries
ProductSchema.index({ category: 1, price: 1 });
ProductSchema.index({ name: "text", description: "text" });

// Pre-save middleware for additional validation
ProductSchema.pre("save", function (next) {
  if (this.stock < 0) {
    this.stock = 0;
  }
  next();
});

export const ProductModel = mongoose.model<ProductDocument>(
  "Product",
  ProductSchema
);
