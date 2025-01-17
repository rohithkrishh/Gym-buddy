
const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    phone: {
      type: String,
      default: null,
      sparse: true
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    password: {
      type: String
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    cart: {
      type: Schema.Types.ObjectId,
      ref: "Cart"
    },
    wallet: {
      type: Schema.Types.ObjectId,
      ref: "Wallet"
    },
    wishlist: {
      type: Schema.Types.ObjectId,
      ref: "Wishlist"
    },
    orderHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order"
      }
    ],
    referalCode: {
      type: String,
      unique: true,
      sparse: true
    },
    redeemed: {
      type: Boolean
    },
    redeemedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    searchHistory: [
      {
        category: {
          type: Schema.Types.ObjectId,
          ref: "Category"
        },
        brand: {
          type: String
        },
        searchOn: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;








// const mongoose = require("mongoose");

// const { Schema } = mongoose;

// const userSchema = new Schema({
//     name: {
//         type: String, 
//         //required: true
//     },
//     email: {
//         type: String,  
//         required: true,
//         unique: true
//     },
//     phone: {
//         type: String,  
//         required: false,
//         unique: false,
//         sparse: true,
//         default:null
      
//     },
//     googleId: {
//         type: String,
//        // required:true,  
//          unique: true,
//          sparse:true
//     },
//     password: {
//         type: String,  
//         //required: false
//     },
//     isBlocked: {
//         type: Boolean,
//         default: false
//     },
//     isAdmin: {
//         type: Boolean,
//         default: false  
//     },
//     cart: [{
//         type: Schema.Types.ObjectId, 
//         ref: "Cart"  
//     }],
//     wallet: {
//         type: Schema.Types.ObjectId,  
//         ref: "Wishlist"  
//     },
//     wishlist: [{
//         type: Schema.Types.ObjectId,  
//         ref: "Wishlist" 
//     }],
//     orderHistory: [{
//         type: Schema.Types.ObjectId,  
//         ref: "Order"  
//     }],
//     createdOn: {
//         type: Date,
//         default: Date.now
//     },
//     referalCode: {
//         type: String
//     },
//     redeemed: {
//         type: Boolean
//     },
//     redeemedUsers: [{
//         type: Schema.Types.ObjectId, 
//         ref: "User"
//     }],
//     searchHistory: [{
//         category: {
//             type: Schema.Types.ObjectId,  
//             ref: "Category"
//         },
//         brand: {
//             type: String
//         },
//         searchOn: {
//             type: Date,
//             default: Date.now
//         }
//     }]
// });

// const User = mongoose.model("User", userSchema);

// module.exports = User;









