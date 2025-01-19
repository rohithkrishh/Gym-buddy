const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const passport = require("passport");
const cartController = require("../controllers/user/cartController");
const WishlistController = require("../controllers/user/wishlistController");
const {userAuth,adminAuth} = require("../middlewares/auth");
const orderController = require("../controllers/user/orderController");


//Error Management
router.get("/pageNotFound",userController.pageNotFound);

//Login Management
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);

//Sign up Management
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email",] })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/signup" }),
    (req, res) => {
        if (req.user) {
            console.log("Authenticated user:", req.user);
            req.session.user = req.user._id; // Explicitly set the user in the session
            res.redirect("/"); 
        } else {
            console.error("No user found after Google login.");
            res.redirect("/signup");
        }
    }
);



//Home Page & Shopping Page 
router.get("/logout",userController.logout);
router.get("/",userController.loadHomepage);
router.get("/shop",userController.loadShopingPage);
 router.get("/filter",userController.filterProduct);
router.get("/filterPrice",userController.filterByPrice);
 


//Profile Management
router.get("/forgot-password",profileController.getForgotPassPage);
router.post("/forgot-email-valid",profileController.forgotEmailValid);
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassPage);
router.post("/resend-forgot-otp",profileController.resendOtp);
router.post("/reset-password",profileController.postNewPassword);
router.get("/userProfile",profileController.userProfile);
router.get("/change-email",profileController.changeEmail);
router.get("/change-password",profileController.changePassword);
router.post("/change-password",profileController.changePasswordValid);
router.post("/verify-changepassword-otp",profileController.verifyChangePassOtp);


//Address Management 
router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress",userAuth,profileController.postAddAddress);
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress);
router.get("/deleteAddress",userAuth,profileController.deleteAddress);


//Cart Management
router.get("/cart",cartController.getCartPage);
router.post("/cart/addItem",userAuth, cartController.addToCart);
router.post("/cart/remove-item",userAuth,cartController.removeProductFromCart);
router.post("/update-quantity",userAuth,cartController.updateCartQuantity);


//Order Management
router.get("/checkout",userAuth,orderController.loadCheckout);
router.post("/place-order",userAuth,orderController.placeOrder);
router.get("/orderDetails/:orderId",userAuth,orderController.orderDetails)
router.post("/cancel/:id",userAuth,orderController.cancelOrder);
router.post("/create-order",userAuth,orderController.razorpayCreatOrder);
router.post("/verify-payment",userAuth,orderController.varifyPayment);


//Whishlist Management
router.get("/whishlist",WishlistController.LoadWishlist);
router.post("/addToWishlist",WishlistController.addToWishlist);


//ProductDetails Management
router.get("/productDetails",userController.productDetails);

module.exports=router