const User = require("../../models/userSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

const pageNotFound=async(req,res)=>{


    try {
        
        res.render("page-404")
    
    } catch (error) {
        res.redirect("/pageNotFound")
    }
    
    }


const loadHomepage = async (req, res) => {
    try {
        // Fetch categories that are listed
        const categories = await Category.find({ isListed: true });

        // Fetch products based on listed categories and availability
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map((category) => category._id) },
            quantity: { $gt: 0 },
        });

        // Sort products by creation date (newest first) and limit to 4
        productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        productData = productData.slice(0, 4);

        // Check if user is authenticated
        if (req.isAuthenticated()) {
            const userData = await User.findOne({ _id: req.user._id }); // Use req.user from Passport
            console.log("-----------", userData.name);
            return res.render("home", { user: userData, products: productData });
        } else {
            return res.render("home", { user: null, products: productData });
        }
    } catch (error) {
        console.log("Home page is not found:", error);
        res.status(500).send("Server error");
    }
};




const loadSignup= async(req,res)=>{

    try {
        return res.render('signup')
        
    } catch (error) {
console.log("Homepage not loading:",error);
res.status(500).send("server error")
        
    }
}

function generateOtp(){

    return Math.floor(100000 + Math.random()*900000).toString();
   
}


async function sendVerificationEmail(email,otp) {
    try {

        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
           requireTLS:true,
           auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD
           } 
        })

        const info=await transporter.sendMail({
form:process.env.NODEMAILER_EMAIL,
to:email,
subject:"Verify your account",
text:`Your OTP is ${otp}`,
html:`<b>Your OTP is ${otp}</b>`

 })
 return info.accepted.length>0
        
    } catch (error) {

        console.error("Error sending email",error)
        return false
        
    }

}

const signup=async(req,res)=>{

    try {

        const{name,email,password,confirmPassword,phone}=req.body 
        
        if(password !== confirmPassword){
      
            return res.render("signup",{message:"password do not match"})
        }
        
        const findUSer=await User.findOne({email});
        
        if(findUSer){
            return res.render("signup",{message:"user with this email already exists"})
        }
       
        const otp=generateOtp()
    
        const emailSent= await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.json("email-error")
        }
        
req.session.userOtp=otp;
req.session.userData={name,email,password,phone};
console.log(req.session.userData);

res.render("verify-otp");
console.log("OTP Sent",otp);

    } catch (error) {
        console.error("signup error",error);
        res.redirect("/pageNotFound")
    }

}

const securePassword=async (password)=>{

    try {
        const passwordHash= await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.error("this is error",error)
    }

}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(otp);
        console.log("User Data from Session:", req.session.userData);
        console.log("---------", req.body);

        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash
            });

            await saveUserData.save();

            // Log the user in after registration
            req.login(saveUserData, (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: "Login failed" });
                }
                req.session.user = saveUserData._id; // Store user ID in session
                return res.redirect("/"); // Redirect to the home page after login
            });
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const resendOtp = async(req,res)=>{
try {
    console.log("Session Data:", req.session.userData);
    const {email}=req.session.userData
    if(!email){

        return res.status(400).json({success:false,message:"Email not Found in session"})
    }

    const otp=generateOtp();
    req.session.userOtp = otp;
  
    
const emailSent = await sendVerificationEmail(email,otp);

if(emailSent){
    console.log("Resend OTP:",otp);
    //res.status(200).json({success:true,message:"OTP Resend Successfully"})
    res.redirect("/")
}else{
    res.status(500).json({success:false,message:"Failed to resend OTP. Please try again"})
}
    
} catch (error) {
    console.error("Error resending OTP",error);
    res.status(500).json({success:false,message:"Internal Server Error. Please try again"})
}


}

const loadLogin = async(req,res)=>{
   
    try {
        if(!req.session.user){
            return res.render("login")
        }else{
            res.redirect("/")
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }

}

// const login = async(req,res)=>{
// try {
//     const {email,password} = req.body;
//     const findUSer = await User.findOne({isAdmin:0,email:email});
//     if(!findUSer){
// return res.render("login",{message:"user Not Found"})
//     }
//     if(findUSer.isBlocked){
//         return res.render("login",{message:"User is blocked by admin"})
//     }
//     const passwordMatch = await bcrypt.compare(password,findUSer.password)
//     if(!passwordMatch){
//         return res.render("login",{message:"Incorrect Password"})
//     }
//     req.session.user = findUSer._id;
//     res.redirect("/")

// } catch (error) {
//     console.error("login error");
//     res.render("login",{message:"login failed please try again later"})
// }

// }
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email and ensure they are not an admin
        const findUser = await User.findOne({ isAdmin: 0, email: email });
        if (!findUser) {
            return res.render("login", { message: "User Not Found" });
        }

        // Check if the user is blocked
        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" });
        }

        // Compare the provided password with the stored hash
        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect Password" });
        }

        // Optionally use Passport's req.login to handle the session management
        // This is useful if you want Passport to manage the session
        req.login(findUser, (err) => {
            if (err) {
                console.error("Login failed:", err);
                return res.render("login", { message: "Login failed, please try again later" });
            }

            // Set session user ID manually (if not using req.login)
            req.session.user = findUser._id;

            // Redirect to homepage
            return res.redirect("/");
        });

    } catch (error) {
        console.error("Login error:", error);
        res.render("login", { message: "Login failed, please try again later" });
    }
};


const logout = async(req,res)=>{

try {
    req.session.destroy((err)=>{
        if(err){
            console.log("session destruction error",err.message);
            return res.redirect("/pageNotFound")
            
        }
        return res.redirect("/login")
    })

} catch (error) {
    console.log("logout error",error);
    res.redirect("/pageNotFound")
}

}


const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;

        const userData = await User.findById(userId)

        const { id: productId } = req.query;

        const product = await Product.findById(productId).populate('category');

        const findCategory = product.category;
        const categoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;

        const totalOffer = categoryOffer + productOffer

        res.render('product-details', {
            user: userData,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory,
          
        })

    } catch (error) {
        console.log("Error on fetching productdetails ", error);
        res.redirect("/pageNotFound")
    }
}


module.exports={
    loadHomepage,pageNotFound,
    loadSignup,signup,verifyOtp,resendOtp,loadLogin,login,logout,productDetails
}