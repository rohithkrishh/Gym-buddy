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
       
        const categories = await Category.find({ isListed: true });

        const productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map((category) => category._id) },
            variants: { $elemMatch: { stock: { $gt: 0 } } }, 
        }).populate("category", "name categoryOffer")
        .sort({ createdAt: 1 });

        if (req.isAuthenticated()) {
            const userData = await User.findOne({ _id: req.user._id });
           
            return res.render("home", { user: userData, products: productData, });
        } else {
            
            return res.render("home", { user: null, products: productData, });
        }
    } catch (error) {
        console.error("Error loading homepage:", error);
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

        console.log(name,email,password)
        
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
                req.session.user = saveUserData._id; 
                return res.redirect("/"); 
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

        
        const findUser = await User.findOne({ isAdmin: 0, email: email });
        if (!findUser) {
            return res.render("login", { message: "User Not Found" });
        }

        
        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect Password" });
        }

        req.login(findUser, (err) => {
            if (err) {
                console.error("Login failed:", err);
                return res.render("login", { message: "Login failed, please try again later" });
            }

           
            req.session.user = findUser._id;



            
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

const loadShopingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });

        
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((category) => category._id.toString()); 
        
      
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

       
        let filterConditions = {
            isBlocked: false,
            category: { $in: categoryIds },
            variants: { $elemMatch: { stock: { $gt: 0 } } }, 
        };

        
        if (req.query.categoryType) {
            filterConditions['variants.categoryType'] = req.query.categoryType;
        }

        
        if (req.query.minPrice && req.query.maxPrice) {
            filterConditions['variants.price'] = { 
                $gte: req.query.minPrice, 
                $lte: req.query.maxPrice 
            };
        }

        
        if (req.query.inStock) {
            filterConditions['variants.stock'] = { $gt: 0 }; 
        }

       
        if (req.query.searchWord) {
            filterConditions.$or = [
                { productName: { $regex: req.query.searchWord, $options: 'i' } },
                { description: { $regex: req.query.searchWord, $options: 'i' } },
                { brand: { $regex: req.query.searchWord, $options: 'i' } },
            ];
        }
        

        
        const products = await Product.find(filterConditions).populate("category","name categoryOffer" )
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);

       
        const totalProducts = await Product.countDocuments(filterConditions);
        
        const totalPages = Math.ceil(totalProducts / limit);

        const brands = await Brand.find({ isBlocked: false });

        const categoriesWithIds = categories.map(category => ({
            _id: category._id,
            name: category.name,
        }));

        res.render("shops", {
            user: userData,
            products,
            categories: categoriesWithIds,
            brands,
            totalProducts,
            currentPage: page,
            totalPages,
            searchWord: req.query.searchWord || '' 
           
        });
    } catch (error) {
        console.error("Error loading shopping page:", error);
        res.redirect("/pageNotFound");
    }
};


const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const category = req.query.category; 

        
        const findCategory = category ? await Category.findOne({ _id: category }) : null;

        const query = {
            isBlocked: false, 
        };

        if (findCategory) {
            query.category = findCategory._id; 
        }

       
        let findProducts = await Product.find(query).lean();

        // Pagination 
        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const totalProducts = findProducts.length;
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const currentProduct = findProducts.slice(startIndex, startIndex + itemsPerPage);

        const categories = await Category.find({ isListed: true });

        res.render("shops", {
            user,
            products: currentProduct,
            categories,
            totalPages,
            currentPage,
            selectedCategory: category || null,
        });
    } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
    }
};


const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user;

        
        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user }).lean();
        }

        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();

        
        const sortType = req.query.sort || "featured";
        let sortOption = {};

        if (sortType === "lowToHigh") {
            sortOption["variants.regularPrice"] = 1; 
        } else if (sortType === "highToLow") {
            sortOption["variants.regularPrice"] = -1; 
        } else if (sortType === "aA-zZ") {
            sortOption.productName = 1; 
        } else if (sortType === "zZ-aA") {
            sortOption.productName = -1; 
        }

        
        let findProducts = await Product.find({
            
        })
            .sort(sortOption) 
            .lean();




        // Pagination 
        const itemsPerPage = 6; 
        const currentPage = parseInt(req.query.page) || 1; 
        const totalProducts = findProducts.length; 
        const totalPages = Math.ceil(totalProducts / itemsPerPage); 
        const startIndex = (currentPage - 1) * itemsPerPage; 
        const currentProduct = findProducts.slice(startIndex, startIndex + itemsPerPage); 

        req.session.filterProducts = findProducts;

        res.render("shops", {
            user: userData, 
            products: currentProduct, 
            categories, 
            brands, 
            totalPages, 
            currentPage, 
            sortType, 
        });
    } catch (error) {
        console.error(error); 
        res.redirect("/pageNotFound"); 
    }
};


const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;

        
        const userData = userId ? await User.findById(userId).lean() : null;

        
        const { id: productId } = req.query;

        
        const product = await Product.findById(productId).populate('category').lean();
        if (!product) {
            throw new Error("Product not found");
        }

        // Fetch category offer
        const categoryOffer = product.category?.categoryOffer || 0;

        // Fetch product offer
        const productOffer = product.productOffer || 0;

        
        const highestOffer = Math.max(categoryOffer, productOffer);
        console.log("highest",highestOffer)

        // Update sale price for all variants based on the highest offer
        const variants = product.variants.map((variant) => {
            const salePrice = variant.regularPrice - (variant.regularPrice * highestOffer) / 100;
            return {
                ...variant,
                salePrice: parseFloat(salePrice.toFixed(2)), 
            };
        });

        // Select the default variant (first one or fallback)
        const defaultVariant = variants.length > 0 ? variants[0] : null;

        // Render the product details page
        res.render('product-details', {
            user: userData,                
            product,                      
            variants,                    
            defaultVariant,               
            category: product.category,   
            highestOffer,                 
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect("/pageNotFound");
    }
};




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
     
    
}