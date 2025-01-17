
const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    cartItems: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        variant: { type: Schema.Types.ObjectId, ref: "Variant" },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      }
    ],
    shippingAddress: {
      addressType: { type: String, required: true },
      name: { type: String, required: true },
      city: { type: String, required: true },
      landMark: { type: String },
      state: { type: String, required: true },
      pincode: { type: Number, required: true },
      phone: { type: String, required: true },
      altPhone: { type: String }
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Credit Card", "Debit Card", "PayPal", "COD"]
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending"
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Pending"
    },
    coupon: {
      code: { type: String },
      discountAmount: { type: Number, default: 0 }
    },
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    transactionId: { type: String },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
module.exports= Order















// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const orderSchema = new Schema(
//   {
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true
//     },
//     cart: {
//       type: Schema.Types.ObjectId,
//       ref: "Cart",
//       required: true
//     },
//     shippingAddress: {
//       type: Schema.Types.ObjectId,
//       ref: "Address",
//       required: true
//     },
//     paymentMethod: {
//       type: String,
//       required: true,
//       enum: ["Credit Card", "Debit Card", "PayPal", "Cash on Delivery"]
//     },
//     paymentStatus: {
//       type: String,
//       required: true,
//       enum: ["Pending", "Completed", "Failed"],
//       default: "Pending"
//     },
//     orderStatus: {
//       type: String,
//       required: true,
//       enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
//       default: "Pending"
//     },
//     coupon: {
//       type: Schema.Types.ObjectId,
//       ref: "Coupon"
//     },
//     totalPrice: {
//       type: Number,
//       required: true
//     },
//     discount: {
//       type: Number,
//       default: 0
//     },
//     finalPrice: {
//       type: Number,
//       required: true
//     },
//     transactionId: {
//       type: String // For payment tracking
//     },
//     isPaid: {
//       type: Boolean,
//       default: false
//     },
//     paidAt: {
//       type: Date
//     },
//     isDelivered: {
//       type: Boolean,
//       default: false
//     },
//     deliveredAt: {
//       type: Date
//     }
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Order", orderSchema);
