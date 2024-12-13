const User=require("../../models/userSchema");
const env= require("dotenv").config()
const nodemailer=require("nodemailer")
const bcrypt = require("bcrypt");

const pageNotFound=async(req,res)=>{


    try {
        
        res.render("page-404")
    
    } catch (error) {
        res.redirect("/pageNotFound")
    }
    
    }

const loadHomepage=async (req,res)=>{

    try {
        const user = req.session.user;
       
        
if(user){
    const userData= await User.findOne({_id:user});
    res.render("home",{user:userData})
    console.log("-----------",userData.name);
}else{
    return res.render("home")
}        
    } catch (error) {

        console.log("Home page is not found");
        res.status(500).send("Server error")
        
    }


}

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

        const{name,email,password,confirmPassword}=req.body 
        
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
req.session.userData={name,email,password};
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

const verifyOtp=async(req,res)=>{
try {

    const{otp}=req.body;
    console.log(otp);
    console.log("User Data from Session:", req.session.userData);
console.log("---------",req.body);
    if(otp===req.session.userOtp){
        const user=req.session.userData
        const passwordHash=await securePassword(user.password)

        const saveUserData=new User({
            name:user.name,
            email:user.email,
            phone:user.phone,
            password:passwordHash
        })
       
        
        await saveUserData.save()
        req.session.user=saveUserData._id;
        //res.json({success:true,redirectUrl:"/"})
        res.redirect("/")
    }else{
        res.status(400).json({success:false,message:"Invalid OTP, Please try again"})
    }


    
} catch (error) {
    
    console.error("Error Verifying OTP",error);
    res.status(500).json({success:false,message:"An error occured"})
    
}

}


// const verifyOtp = async (req, res) => {
//   try {
//     const { otp } = req.body;

//     if (!otp || !req.session.userData) {
//       return res.status(400).json({ success: false, message: "Invalid request data." });
//     }

//     if (otp !== req.session.userOtp) {
//       return res.status(400).json({ success: false, message: "Invalid OTP, please try again." });
//     }

//     const user = req.session.userData;

//     // Hash password
//     const passwordHash = await securePassword(user.password);

//     // Check for existing user
//     const existingUser = await User.findOne({ email: user.email });
//     if (existingUser) {
//       return res.status(400).json({ success: false, message: "User already exists. Please log in." });
//     }

//     // Create new user
//     const saveUserData = new User({
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       password: passwordHash,
//       googleId: user.googleId || undefined, // Avoid null assignment
//     });

//     await saveUserData.save();

//     req.session.user = saveUserData._id;
//     res.redirect("/");
//   } catch (error) {
//     console.error("Error Verifying OTP:", error);

//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: "Duplicate user detected. Please use a different email or phone.",
//       });
//     }

//     res.status(500).json({ success: false, message: "An error occurred. Please try again later." });
//   }
// };



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

const login = async(req,res)=>{
try {
    const {email,password} = req.body;
    const findUSer = await User.findOne({isAdmin:0,email:email});
    if(!findUSer){
return res.render("login",{message:"user Not Found"})
    }
    if(findUSer.isBlocked){
        return res.render("login",{message:"User is blocked by admin"})
    }
    const passwordMatch = await bcrypt.compare(password,findUSer.password)
    if(!passwordMatch){
        return res.render("login",{message:"Incorrect Password"})
    }
    req.session.user = findUSer._id;
    res.redirect("/")

} catch (error) {
    console.error("login error");
    res.render("login",{message:"login failed please try again later"})
}

}

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



module.exports={
    loadHomepage,pageNotFound,
    loadSignup,signup,verifyOtp,resendOtp,loadLogin,login,logout
}