const mongoose = require("mongoose");

const {Schema} = mongoose

const couponSchema = new Schema({

    name:{
        type:String,
        required:true,
        unique:true
    },
    createon:{
        type:Date,
        default:Date.now,
        required:true
    },
    expireOn:{
        type:Date,
        required:true
    },
    offerPrice:{
        type:Number,
        required:true
    },
    minimumPrice:{
       type:Number,
       required:true
    },
    isList:{
        type:Boolean,
        default:true
    },
    UsageLimit:{
        type:Number,
        required:false
    },
    userId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }]
})

const Coupon = mongoose.model("Coupon", couponSchema)

module.exports = Coupon