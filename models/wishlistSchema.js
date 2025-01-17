// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const wishlistSchema = new Schema(
//   {
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true
//     },
//     items: [
//       {
//         product: {
//           type: Schema.Types.ObjectId,
//           ref: "Product",
//           required: true
//         },
//         addedOn: {
//           type: Date,
//           default: Date.now
//         }
//       }
//     ],
//     createdOn: {
//       type: Date,
//       default: Date.now
//     },
//     updatedOn: {
//       type: Date,
//       default: Date.now
//     }
//   },
//   { timestamps: true }
// );

// wishlistSchema.pre("save", function (next) {
//   this.updatedOn = Date.now();
//   next();
// });

// const Wishlist = mongoose.model("Wishlist", wishlistSchema);

// module.exports = Wishlist;


const mongoose = require("mongoose");
const { Schema } = mongoose;

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            addedAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
});


const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;



