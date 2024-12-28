const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");


const LoadWishlist = async (req,res)=>{

try {

    const userId = req.session.user;
    const user = await User.findById(userId);
    const products = await Product.find({_id:{$in:user.wishlist}}).populate('category');

    res.render("wishlist",{
        user,
        wishlist:products}
       )
    
} catch (error) {
    res.redirect("/pageNotFound")
}

}


module.exports = {

    LoadWishlist

}