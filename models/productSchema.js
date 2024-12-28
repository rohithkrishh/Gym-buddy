
const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true, // Removes leading/trailing spaces
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
      min: 0, // Regular price must be non-negative
    },
    salePrice: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value <= this.regularPrice; // Sale price cannot exceed regular price
        },
        message: "Sale price cannot be greater than the regular price.",
      },
    },
    productOffer: {
      type: Number, // Represented as a percentage (e.g., 10 for 10%)
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0, // Ensures non-negative quantity
    },
    productImages: {
      type: [String],
      required: true,
      validate: {
        validator: function (value) {
          return value.length > 0; // At least one image is required
        },
        message: "At least one product image is required.",
      },
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["available", "out of stock", "discontinued"],
      required: true,
      default: "available",
    },
  },
  { timestamps: true }
);

// Index for faster queries on category and block status
productSchema.index({ category: 1, isBlocked: 1 });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;


































// const mongoose=require("mongoose");
// const {Schema}=mongoose;


// const productSchema=new Schema({

//     productName:{
//         type:String,
//         required:true,
//     },
//     discription:{
//         type:String,
//         required:true
//     },
//     brand:{
//         type:String,
//         required:true
//     },
//     category:{
//         type:Schema.Types.ObjectId,
//         ref:"Category",
//         required:true
//     },
//     regularPrice:{
//         type:Number,
//         required:true
//     },
//     salePrice:{
//         type:Number,
//         required:true
//     },
//     productOffer:{
//         type:Number,
//         default:0
//     },
//     quantity:{
//         type:Number,
//         default:true
//     },
//     color:{
//         type:String,
//         required:true
//     },
//     productImage:{
// type:[String],
// required:true
//     },
//     isBlocked:{
//         type:Boolean,
//         default:false
//     },
//     status:{
//         type:String,
//         enum:["available","out of stock","discontinued"],
//         required:true,
//         default:"Available"
//     },},{timestamps:true})

//     const product=mongoose.model("product",productSchema)
//     module.exports=product