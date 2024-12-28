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


const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;

        // Validate input
        if (!productId || !percentage || percentage <= 0) {
            return res.status(400).json({ status: false, message: "Invalid input data" });
        }

        // Find the product
        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Find the category
        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (!findCategory) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        // Check if category offer is greater
        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This product's category already has a higher category offer" });
        }

        // Calculate sale price
        const newSalePrice = Math.floor(findProduct.regularPrice * (1 - percentage / 100));

        // Update product offer
        findProduct.salePrice = newSalePrice;
        findProduct.productOffer = parseInt(percentage, 10);
        await findProduct.save();

        // Update category offer (optional: set to 0 only if product offer overrides)
        findCategory.categoryOffer = 0;
        await findCategory.save();

        return res.json({ status: true, message: "Product offer updated successfully" });
    } catch (error) {
        console.error("Error in addProductOffer:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};


const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
console.log(req.body);

        // Validate productId
        if (!productId) {
            return res.status(400).json({ status: false, message: "Product ID is required." });
        }

        // Find the product
        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found." });
        }

        // Calculate salePrice after removing the offer
        const percentage = findProduct.productOffer;
        if (percentage === 0 || !percentage) {
            return res.status(400).json({ status: false, message: "No active offer to remove." });
        }

        findProduct.salePrice = findProduct.regularPrice; // Reset salePrice to regularPrice
        findProduct.productOffer = 0; // Remove product offer

        // Save updated product
        await findProduct.save();

        // Success response
        return res.json({ status: true, message: "Product offer removed successfully." });

    } catch (error) {
        console.error("Error removing product offer:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};
const blockProduct = async (req,res)=>{
try {
    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect("/admin/products")
} catch (error) {
   res.redirect("/pageerror") 
}

}

const unblockProduct = async (req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/products")
    } catch (error) {
       res.redirect("/pageerror") 
    }
    
    }
// const getEditProduct = async (req,res)=>{
// try {
//     const id = req.query.id;
//     const product = await Product.findOne({_id:id});
//     const category = await Category.find({});
//     const brand = await Brand.find({});
//     res.render("edit-product",{
// product:product,
// cat:category,
// brand:brand,

//     })
// } catch (error) {
//     res.redirect("/pageerro")
// }
// }

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("edit-product", {
            product: product,
            cat: category,
            brand: brand,
        });
    } catch (error) {
        console.error(error);
        res.redirect("/pagenotdound");
    }
};

// const updateProduct = async (req, res) => {
//     try {
//         const id = req.params.id.replace(/^id=/, "");
//         console.log("Extracted Product ID:", id);

//         if (!id.match(/^[0-9a-fA-F]{24}$/)) {
//             return res.status(400).json({ error: "Invalid Product ID format" });
//         }

//         const product = await Product.findOne({ _id: id });
//         if (!product) {
//             return res.status(404).json({ error: "Product not found" });
//         }

//         const data = req.body;
//         console.log("Request body data:", data);

//         const existingProduct = await Product.findOne({
//             productName: data.productName,
//             _id: { $ne: id },
//         });
//         if (existingProduct) {
//             return res.status(400).json({
//                 error: "Product already exists. Please try again with another name.",
//             });
//         }

//         const image = [];
//         if (req.files && req.files.length > 0) {
//             for (let i = 0; i < req.files.length; i++) {
//                 image.push(req.files[i].filename);
//             }
//         }

//         const updateFields = {
//             productName: data.productName,
//             description: data.description,
//             brand: data.brand,
//             category: product.category,
//             regularPrice: data.regularPrice,
//             salePrice: data.salePrice,
//             quantity: data.quantity,
            
//         };

//         if (image.length > 0) {
//             updateFields.$push = { productImage: { $each: image } };
//         }

//         console.log("Update fields:", updateFields);

//         await Product.findByIdAndUpdate(id, updateFields, { new: true });

//         console.log("Product updated successfully");
//         res.redirect("/admin/products");
//     } catch (error) {
//         console.error("Error updating product:", error);
//         res.redirect("/pagenotfound");
//     }
// };


// const updateProduct=async (req,res)=>{
//         try {
//             const id = req.params.id;
//             console.log("id",id)
//             const product = await Product.findOne({_id:id});
//             console.log("product")
    
//             const data = req.body;
//             console.log(data)
//             const existingProduct= await Product.findOne({
//                 productName:data.productName,
//                 _id:{$ne:id}
//             })
//             console.log(existingProduct)
    
//             if(existingProduct){
//                 return res.status(400).json({error:"Product is allready exist, Please try again with another name "})
//             }
    
//             console.log("exist")
    
//             const image=[];
//             console.log("image")
    
//             if(req.files && req.files.length>0){
//                 for(let i=0;i<req.files.length;i++){
//                     image.push(req.files[i].filename)
//                 }
    
//             }
    
//             const updateFields={
//                 productName:data.productName,
//                 description:data.description,
//                 brand:data.brand,
//                 category:product.category,
//                 regularPrice:product.regularPrice,
//                 salePrice:data.salePrice,
//                 quantity:data.quantity,
//                 size:data.size,
//                 color:data.color
//             }
//             console.log("hai")
//             if(req.files.length>0){
//                 updateFields.$push={productImage:{$each:image}}
//             }
//             console.log("hello")
//             await Product.findByIdAndUpdate(id,updateFields,{new:true});
//             res.redirect('/admin/products')
    
//         } catch (error) {
//             // console.error(error);
//             res.redirect('/pagenotfound')
    
//         }
//     }

const updateProduct = async (req, res) => {
    try {
      const id = req.params.id;
      console.log("Product ID:", id);
  
      // Find the product by ID
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
  
      const data = req.body;
      console.log("Request Data:", data);
  
      // Check if another product with the same name exists (excluding the current product)
      const existingProduct = await Product.findOne({
        productName: data.productName,
        _id: { $ne: id },
      });
  
      if (existingProduct) {
        return res
          .status(400)
          .json({ error: "Product already exists. Please try with another name." });
      }
  
      console.log("No existing product with the same name found.");
  
      // Handle product images
      const images = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          images.push(req.files[i].filename);
        }
      }
  
      // Prepare fields for update
      const updateFields = {
        productName: data.productName,
        description: data.description,
        brand: data.brand,
        category: data.category,
        regularPrice: data.regularPrice,
        salePrice: data.salePrice,
        productOffer: data.productOffer || 0,
        quantity: data.quantity,
        isBlocked: data.isBlocked,
        status: data.status,
      };
  
      // Add new images to the existing productImages array if files are provided
      if (images.length > 0) {
        updateFields.productImages = [...product.productImages, ...images];
      }
  
      console.log("Fields to Update:", updateFields);
  
      // Update the product
      const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, {
        new: true, // Return the updated document
        runValidators: true, // Ensure schema validations are run
      });
  
      console.log("Product updated successfully:", updatedProduct);
  
      // Redirect or respond
      res.redirect("/admin/products");
    } catch (error) {
      console.error("Error updating product:", error);
      res.redirect("/pagenotfound");
    }
  };
  



module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    getEditProduct,
    updateProduct,
    blockProduct,
    unblockProduct
}