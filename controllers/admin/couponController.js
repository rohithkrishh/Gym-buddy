const Coupon = require("../../models/couponSchema")

const CouponPage = async(req,res)=>{
    try {
        const coupon = await Coupon.find();
       
        res.render("coupon",{coupon})
    } catch (error) {
        console.error("Error in loading copen page",error);
    }
}


const addCopon = async(req,res)=>{
    try {
        const {code,offerPrice,minPurchase,expiry,status,UsageLimit} = req.body;
         
        const copon = new Coupon({
            name:code,
            offerPrice:offerPrice,
            minimumPrice: minPurchase || 0,
            expireOn:expiry,
            UsageLimit,
            isList:status ==="active"
        })
        await copon.save();
        res.redirect("/admin/coupon");
        console.log("copen created successfully");
    } catch (error) {
        console.error("Error in adding copon",error);
    }
}



const deleteCoupon = async(req,res)=>{
    try {
        const couponId = req.query.couponId;
        console.log("cop id",couponId);

        await Coupon.findByIdAndDelete(couponId);
        res.redirect("/admin/coupon")
        console.log("coupon deleted successfully");
        
    } catch (error) {
        console.error("Error in deleting coupon");
        res.status(500).send("An Error occured while deleting the coupon..")       
    }
}


const editCoupon = async(req,res)=>{
    try {
        const {couponId,amount,expiryDate,minPurchase} = req.body
        console.log(" cop body :",req.body);
        
        const coupon = await Coupon.findById(couponId)

        coupon.offerPrice = amount
        coupon.expireOn = expiryDate
        coupon.minimumPrice = minPurchase
        coupon.save()

        res.status(200).send("Coupon Updated Succesfully")
        console.log("Coupon Updated Successfully")
    } catch (error) {
        console.error("Error in Editing Coupon",error);
        res.status(500).send("An error occured in updating Coupon..!")
    }
}


module.exports ={
    CouponPage,
    addCopon,
    deleteCoupon,
    editCoupon
}