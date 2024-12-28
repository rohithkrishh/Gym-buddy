const express=require("express")
const router=express.Router();
const userController=require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const passport = require("passport");
const {userAuth,adminAuth} = require("../middlewares/auth");
const cartController = require("../controllers/user/cartController");
const WishlistController = require("../controllers/user/wishlistController")

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
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/signup" }),
    (req, res) => {
        console.log("Redirecting after successful login");
        res.redirect("/");
    }
);


//Home Page & Shopping Page 
router.get("/logout",userController.logout);
router.get("/",userController.loadHomepage);
router.get("/shop",userController.loadShopingPage);
router.get("/filter",userController.filterProduct);
router.get("/filterPrice",userController.filterByPrice);
router.post("/search",userController.searchProducts);


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
router.get("/addAddress",profileController.addAddress);
router.post("/addAddress",profileController.postAddAddress);
router.get("/editAddress",profileController.editAddress);
router.post("/editAddress",profileController.postEditAddress);
router.get("/deleteAddress",profileController.deleteAddress);

//Cart Management
router.get("/cart",cartController.getCartPage);
router.post("/cart/add", cartController.addToCart);
router.post("/cart/remove-item", cartController.removeProductFromCart);
router.post("/cart/update-quantity", cartController.updateCartQuantity);
router.post("/cart/clear", cartController.clearCart);


//Whishlist Management
router.get("/whishlist",WishlistController.LoadWishlist);



router.get("/productDetails",userController.productDetails)

module.exports=router