
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Dynamic Variant Schema
const variantSchema = new Schema({
  categoryType: {
    type: String,
    required: true,
    enum: ["strength", "cardio",], 
  },
  weight: {
    type: Number, // For strength machines
    required: function () {
      return this.categoryType === "strength";
    },
    min: 0,
  },
  type: {
    type: String, // For cardio equipment
    enum: ["automated", "semi-automated", "manual"],
    required: function () {
      return this.categoryType === "cardio";
    },
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
  },
});

// Main Product Schema
const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    regularPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value <= this.regularPrice;
        },
        message: "Sale price cannot be greater than the regular price.",
      },
    },
    productImages: {
      type: [String],
      required: true,
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: "At least one product image is required.",
      },
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    offer:{
    type:Number,
    default:0 , 
    },
    offerAmount:{
      type:Number,
      default:0,
    },
    status: {
      type: String,
      enum: ["available", "out of stock", "discontinued"],
      required: true,
      default: "available",
    },
    variants: {
      type: [variantSchema], // Store all variants dynamically
      default: [],
    },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, isBlocked: 1 });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
