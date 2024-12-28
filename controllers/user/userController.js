const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema")
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");


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
        }).sort({createdAt:-1})

     
        // Check if user is authenticated
        if (req.isAuthenticated()) {
            const userData = await User.findOne({ _id: req.user._id }); // Use req.user from Passport
          
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

const loadShopingPage = async(req,res)=>{

    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        const categories = await Category.find({isListed:true});
        const categoryIds = categories.map((category)=>category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page-1)*limit;
        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0},

        }).sort({createdOn:-1}).skip(skip).limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity:{$gt:0},
        })
  
const totalPages = Math.ceil(totalProducts/limit);

const brands = await Brand.find({isBlocked:false});
const categoriesWithIds = categories.map(category => ({_id:category._id,name:category.name}));

        res.render("shops",{user:userData,
            products:products,
            category:categoriesWithIds,
            brand:brands,
            totalProducts:totalProducts,
            currentPage:page,
            totalPages:totalPages
        })
    } catch (error) {
       res.redirect("/pageNotFound") 
    }
}

const filterProduct = async(req,res)=>{

try {

    const user = req.session.user;
    const category = req.query.category;
    const brand = req.query.brand;
    const findCategory = category ? await Category.findOne({_id:category}) : null;
    const findBrand = brand ? await Brand.findOne({_id:brand}) : null;
    const brands = await Brand.find({}).lean();
    const query = {
        isBlocked:false,
        quantity:{$gt:0}
    }
    if(findCategory){
        query.category = findCategory._id;
    }
    if(findBrand){
        query.brand = findBrand.brandName;
    }

    let findProducts = await Product.find(query).lean();
    findProducts.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
    const categories = await Category.find({isListed:true});

    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage-1) * itemsPerPage; 
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(findProducts.length/itemsPerPage);
    const currentProduct = findProducts.slice(startIndex,endIndex);
    let userData = null;
    if(user){
        userData = await User.findOne({_id:user});
        if(userData){
            const searchEntry = {
                category : findCategory ? findCategory._id : null,
                brand : findBrand ? findBrand.brandName : null,
                searchedOn : new Date(),
            }
            userData.searchHistory.push(searchEntry)
            await userData.save();
        }
    }   
req.session.filterProducts = currentProduct;

res.render("shops",{
    user : userData,
    products : currentProduct,
    category : categories,
    brand : brands,
    totalPages,
    currentPage,
    selectedCategory : category || null,
    selectedBrand : brand ||null,

})

} catch (error) {
  res.redirect("/pageNotFound");  
}

}


const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();

        const sortType = req.query.sort || "featured";
        let sortOption = {};

        // Set sort option based on sortType
        if (sortType === "lowToHigh") {
            sortOption.salePrice = 1; 
        } else if (sortType === "highToLow") {
            sortOption.salePrice = -1; 
        } else if (sortType === "aA-zZ") {
            sortOption.productName = 1; 
        } else if (sortType === "zZ-aA") {
            sortOption.productName = -1; 
        }
        // Fetch products with sorting
        let findProducts = await Product.find({
            salePrice: { $gt: req.query.gt || 0, $lt: req.query.lt || Infinity },
            isBlocked: false,
            quantity: { $gt: 0 },
        })
            .sort(sortOption) // Apply sorting
            .lean();

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);

        req.session.filterProducts = findProducts;

        res.render("shops", {
            user: userData,
            products: currentProduct,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            sortType
        });
    } catch (error) {
        console.log(error);
        res.redirect("/pageNotFound");
    }
};



const searchProducts = async (req,res)=>{

    try {
        const user = req.session.user;
        const userData = await User.findOne({_id:user});
        let search = req.body.query;

        const brands = await Brand.find({}).lean();
        const categories = await Category.find({isListed:true}).lean();
        const categoryIds = categories.map(category=>category._id.toString());
        let searchResult = [];

        if(req.session.filterProducts && req.session.filterProducts.length>0){
            searchResult = req.session.filterProducts.filter(product=>
                product.productName.toLowerCase().includes(search.toLowerCase())
            )
        }else{
            searchResult = await Product.find({
                productName:{$regex:".*"+search+".*",$options:"i"},
                isBlocked:false,
                quantity:{$gt:0},
                category:{$in:categoryIds}
            })
        }

        searchResult.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));
        
        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage-1) * itemsPerPage; 
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(searchResult.length/itemsPerPage);
        const currentProduct = searchResult.slice(startIndex,endIndex);

        res.render("shops",{
            user : userData,
            products : currentProduct,
            category : categories,
            brand : brands,
            totalPages,
            currentPage,
            count:searchResult.length,
           
        })
       

    } catch (error) {
        console.log("Error",error);
        res.redirect("/pageNotFound");
        
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
    loadHomepage,
    pageNotFound,
    loadSignup,signup,
    verifyOtp,resendOtp,
    loadLogin,login,logout,
    productDetails,
    loadShopingPage,
    filterProduct,
    filterByPrice,
    searchProducts,
  

}