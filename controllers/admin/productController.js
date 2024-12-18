const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


const getProductAddPage = async (req,res)=>{

    try {
        const Categories = await Category.find({isListed:true});
        const brands = await Brand.find({isBlocked:false});
        res.render("product-add",{
            cat:Categories,
            brand:brands
        })
    } catch (error) {
        res.redirect("/pageerror")
    }

}


// const addProducts =async (req,res)=>{

//     try {

//         const products = req.body;
//         const productExists = await Product.findOne({
//             productName:products.productName,
//         });
//         if(!productExists){
//             const images = [];

//             if(req.files && req.files.length>0){
//                 for(let i=0; i<req.files.length;i++){
//             const orginalImagePath = req.files[i].path;
//             const resizedImagePath = path.join('public','assets','product-images',req.files[i].filename);
//             await sharp(orginalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
//             images.push(req.files[i].filename);
//                 }
//             }
//      const categoryId = await Category.findOne({name:products.Category});

//      if(!categoryId){
//         return res.status(400).join("Invalid Category name")
//      }
//    const newProduct = new Product({
// productName:products.productName,
// description:products.description,
// brand:products.brand,
// category:categoryId._id,
// regularPrice:products.regularPrice,
// saleprice:products.saleprice,
// createdOn: new Date(),
// quantity:products.quantity,
// size:products.size,
// color:products.color,
// productImage:images,
// status:'available'

//    });

//    await newProduct.save();
//    return res.redirect("/admin/addProducts");

//         }else{
//             return res.status(400).json("Products already exist,please try with another name");
//         }
        
//     } catch (error) {
//       console.error("Error saving products",error);
//       return res.redirect("/admin/pageerror")  
//     }

// }

const addProducts = async (req, res) => {
    try {
        const products = req.body;

        // Check if a product with the same name already exists
        const productExists = await Product.findOne({ productName: products.productName });
        if (productExists) {
            return res.status(400).json({ error: "Product already exists, please try with another name" });
        }

        const images = [];
        // Handle image resizing and saving
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join('public', 'assets', 'product-images', req.files[i].filename);
                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);
                images.push(req.files[i].filename);
            }
        }

        // Validate category
        const category = await Category.findOne({ name: products.category });
        if (!category) {
            return res.status(400).json({ error: "Invalid Category name" });
        }

        // Create a new product
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: products.brand,
            category: category._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            quantity: products.quantity,
            productImages: images, // Corrected field name to match the schema
            status: 'available',
        });

        // Save the product to the database
        await newProduct.save();
        return res.redirect("/admin/addProducts");

    } catch (error) {
        console.error("Error saving products:", error.message);
        return res.status(500).redirect("/admin/pageerror"); // Redirect to the error page on failure
    }
};

const getAllProducts = async (req,res)=>{

    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;
        const productData = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                {brand:{$regex:new RegExp(".*"+search+".*","i")}},

            ],
        }).limit(limit*1).skip((page-1)*limit).populate('category').exec();

        const count = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                {brand:{$regex:new RegExp(".*"+search+".*","i")}},

            ],
        }).countDocuments();

const category = await Category.find({isListed:true});
const brand = await Brand.find({isBlocked:false})

if(category && brand){
res.render("products",{
    data:productData,
    currentPage:page,
    totalPages:Math.ceil(count/limit),
    cat:category,
    brand:brand,
})

}else{
    res.render("page-404");
}

    } catch (error) {
        res.redirect("/pageerror");
    }


}



module.exports = {
    getProductAddPage,addProducts,getAllProducts
}