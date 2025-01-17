const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    balance: {
      type: Number,
      default: 0, // Initial balance is 0
      required: true
    },
    transactions: [
      {
        transactionType: {
          type: String,
          required: true,
          enum: ["Credit", "Debit"] // Track if the transaction is adding or deducting balance
        },
        amount: {
          type: Number,
          required: true
        },
        description: {
          type: String // E.g., "Order refund", "Promotional credit"
        },
        createdOn: {
          type: Date,
          default: Date.now
        }
      }
    ],
    createdOn: {
      type: Date,
      default: Date.now
    },
    updatedOn: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

walletSchema.pre("save", function (next) {
  this.updatedOn = Date.now();
  next();
});

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
