const express=require("express")
const router=express.Router();
const userController=require("../controllers/user/userControllers");
const passport = require("passport");



router.get("/pageNotFound",userController.pageNotFound)
router.get("/",userController.loadHomepage);
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)


router.get("/google",passport.authenticate('google',{scope:['profile','email']}))

router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/signup" }),
 (req, res) => {
        // Successful authentication
        console.log("Redirecting after successful login");
        res.redirect("/");
    }
);

router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/logout",userController.logout)

module.exports=router