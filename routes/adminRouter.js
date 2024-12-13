const express=require("express");
const router=express.Router();
const adminController = require("../controllers/admin/adminController");
//const { loadLogin } = require("../controllers/user/userControllers");
const {userAuth,adminAuth} = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")


router.get("/pageerror",adminController.pageerror);
//Login Management
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login);
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)
//Customer Management
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked)


module.exports = router


