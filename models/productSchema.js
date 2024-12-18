
const mongoose = require("mongoose");
const { Schema } = mongoose;

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
    category:{
      type:Schema.Types.ObjectId,
      ref:"Category",
      required:true
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value <= this.regularPrice; // Ensures salePrice is not higher than regularPrice
        },
        message: "Sale price should not exceed the regular price.",
      },
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
          return value.length > 0; // Ensures at least one image is provided
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

const product = mongoose.model("Product", productSchema);
module.exports = product;


































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