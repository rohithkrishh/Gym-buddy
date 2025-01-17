const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { clearScreenDown } = require("readline");



 const getProductAddPage = async (req, res) => {
    try {
        const { page = 1, search = '' } = req.query;
        const limit = 10; 

        const query = search
            ? { productName: { $regex: search, $options: 'i' } }
            : {};
      const category = await Category.find({ isListed: true });

        const products = await Product.find(query)
            .populate('category')
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);
        const brands = await Brand.find({ isBlocked: false });

        res.render('product-add', {
            cat:category,
             brand: brands, 
            data: products,
            totalPages,
            currentPage: Number(page),
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.redirect('/admin/pageerror');
    }
};


const addProducts = async (req, res) => {
    try {
        const products = req.body;
        console.log("Received products:", products);

        // Extract and validate category
        const categoryValue = products.category; 
        const [categoryId, categoryType] = categoryValue.split('|');

        if (!categoryId || !categoryType) {
            return res.status(400).json({ error: "Invalid category format." });
        }

        const category = await Category.findById(categoryId);
        if (!category || category.type !== categoryType) {
            return res.status(400).json({ error: "Invalid category data." });
        }

        const productExists = await Product.findOne({ productName: products.productName });
        if (productExists) {
            return res.status(400).json({ error: "Product already exists, please try with another name." });
        }

        // image resizing and saving
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const originalImagePath = file.path;
                const resizedImagePath = path.join('public', 'assets', 'product-images', file.filename);
                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);
                images.push(file.filename);
            }
        } else {
            return res.status(400).json({ error: "At least one product image is required." });
        }

        // Parse and validate variants
        const variants = [];
        if (Array.isArray(products.variants) && products.variants.length > 0) {
            for (const variant of products.variants) {
               
                if (!variant.price || !variant.stock || !variant.sku) {
                    return res.status(400).json({
                        error: "Each variant must have price, stock, and SKU.",
                    });
                }

                //  dynamic validation for categoryType
                if (categoryType === "strength" && !variant.weight) {
                    return res.status(400).json({
                        error: "Weight is required for strength variants.",
                    });
                } else if (categoryType === "cardio" && !variant.type) {
                    return res.status(400).json({
                        error: "Type is required for cardio variants.",
                    });
                }

                //  validated variant to the array
                variants.push({
                    categoryType,
                    weight: categoryType === "strength" ? parseFloat(variant.weight) : undefined,
                    type: categoryType === "cardio" ? variant.type : undefined,
                    price: parseFloat(variant.price),
                    stock: parseInt(variant.stock, 10),
                    sku: variant.sku.trim(),
                });
            }
        } else {
            return res.status(400).json({ error: "Variants are required and must be an array." });
        }

        // Create a new product
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: products.brand,
            category: category._id,
            regularPrice: parseFloat(products.regularPrice),
            salePrice: parseFloat(products.salePrice),
            productImages: images,
            status: 'available',
            variants,
        });

        console.log("New Product:", newProduct);

        
        await newProduct.save();
        // return res.status(200).json({ message: "Product added successfully." });
        return res.redirect("/admin/products")

    } catch (error) {
        console.error("Error saving product:", error.message);
        return res.status(500).json({ error: "An error occurred while saving the product." });
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
       

        if (!productId || !percentage) {
            return res.status(400).json({ status: false, message: 'Invalid input' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: 'Product not found' });
        }

        product.offer = parseFloat(percentage);
        product.offerAmount =  (product.salePrice * percentage) / 100;

        await product.save();

        res.json({ status: true, message: 'Offer added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
console.log("dhf",productId)
        if (!productId) {
            return res.status(400).json({ status: false, message: 'Invalid input' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: 'Product not found' });
        }

        product.offerAmount = 0;
        product.offer = 0;

        await product.save();

        res.json({ status: true, message: 'Offer removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Internal server error' });
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


// const editProduct = async (req, res) => {
//     try {
//         const id = req.params.id;
//         console.log("Editing Product ID:", id);

//         const product = await Product.findOne({ _id: id });
//         if (!product) {
//             return res.status(404).json({ error: "Product not found." });
//         }

//         const data = req.body;
//         console.log("Updated Data:", data);

//         // Check for duplicate product name
//         const existingProduct = await Product.findOne({
//             productName: data.productName,
//             _id: { $ne: id },
//         });
//         if (existingProduct) {
//             return res.status(400).json({ error: "Product already exists. Please use a different name." });
//         }

//         // Handle images
//         const image = [];
//         if (req.files && req.files.length > 0) {
//             for (let file of req.files) {
//                 image.push(file.filename);
//             }
//         }

//         // Parse and validate variants
//         if (data.variants && Array.isArray(data.variants)) {
//             updatedVariants = data.variants.map((variant) => {
//                 // Start with the existing variant from the database
//                 const existingVariant = product.variants.find((v) => v.sku === variant.sku) || {};
        
//                 // Build the updated variant
//                 const updatedVariant = {
//                     ...existingVariant, // Retain existing values
//                     price: parseFloat(variant.price) || existingVariant.price,
//                     stock: parseInt(variant.stock, 10) || existingVariant.stock,
//                     sku: variant.sku.trim(),
//                 };
        
//                 // Dynamically handle fields based on categoryType
//                 if (product.categoryType === "strength") {
//                     updatedVariant.weight = parseFloat(variant.weight) || existingVariant.weight;
//                 } else if (product.categoryType === "cardio") {
//                     updatedVariant.type = variant.type || existingVariant.type;
//                 }
        
//                 return updatedVariant;
//             });
//         } else {
//             return res.status(400).json({ error: "Variants are required and must be an array." });
//         }
        

//         // Prepare update fields
//         const updateFields = {
//             productName: data.productName,
//             description: data.description,
//             brand: data.brand,
//             salePrice: parseFloat(data.salePrice) || null,
//             variants: updatedVariants,
//         };

//         if (image.length > 0) {
//             updateFields.$push = { productImages: { $each: image } };
//         }

//         // Update the product
//         await Product.findByIdAndUpdate(id, updateFields, { new: true });
//         res.redirect("/admin/products");
//     } catch (error) {
//         console.error("Error updating product:", error);
//         res.redirect("/pagenotfound");
//     }
// };

const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        console.log("Editing Product ID:", productId);

        // Fetch the existing product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        const updatedData = req.body;
        

        // Check for duplicate product name (excluding the current product)
        const duplicateProduct = await Product.findOne({
            productName: updatedData.productName,
            _id: { $ne: productId },
        });
        if (duplicateProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please choose a different name." });
        }

        // Handle uploaded images
        let updatedImages = product.productImages || [];
        if (req.files && req.files.length > 0) {
            const uploadedImages = req.files.map((file) => file.filename);
            updatedImages = [...updatedImages, ...uploadedImages];
        }

        // Parse and validate variants
        let updatedVariants = [];
        if (updatedData.variants && Array.isArray(updatedData.variants)) {
            updatedVariants = updatedData.variants.map((variant) => {
                const existingVariant = product.variants.find((v) => v.sku === variant.sku) || {};
                console.log("dhdhhhhhhhhhhhhhhhhhhhhhhhh",existingVariant);
                const updatedVariant = {
                    ...existingVariant, // Keep existing variant data
                    price: parseFloat(variant.price) || existingVariant.price,
                    stock: parseInt(variant.stock, 10) || existingVariant.stock,
                    sku: variant.sku.trim(),
                };

                // Handle category-specific fields
                if (variant.categoryType === "strength") {
                    updatedVariant.weight = parseFloat(variant.weight) || existingVariant.weight;
                } else if (variant.categoryType === "cardio") {
                    updatedVariant.type = variant.type || existingVariant.type;
                }
                console.log("_______________",updatedVariant);

                return updatedVariant;
            });
        } else {
            return res.status(400).json({ error: "Variants are required and must be an array." });
        }

        // Prepare the fields to update
        const updateFields = {
            productName: updatedData.productName,
            description: updatedData.description,
            brand: updatedData.brand,
            salePrice: parseFloat(updatedData.salePrice) || null,
            variants: updatedVariants,
            productImages: updatedImages,
        };

        // Update the product in the database
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            updateFields,
            { new: true }
        );

        console.log("Product updated successfully:", updatedProduct);
        res.redirect("/admin/products");
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).redirect("/pagenotfound");
    }
};




module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    getEditProduct,
    editProduct,
    blockProduct,
    unblockProduct,
  
}