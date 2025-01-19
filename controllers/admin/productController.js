const mongoose = require("mongoose");
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
        res.render("edit-productsss", {
            product,
            cat: category,
            brand: brand,
            variants: product.variants || [], 
        });
    } catch (error) {
        console.error(error);
        res.redirect("/pagenotdound");
    }
};



const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
      
        // Validate product ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid product ID" });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const data = req.body;

       

        // Check for duplicate product name
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id },
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists" });
        }

        // Handle and validate category ID
        const category = data.category ? data.category.trim() : null;
      

        if (category && !mongoose.Types.ObjectId.isValid(category)) {
            return res.status(400).json({ error: "Invalid category ID" });
        }

        

        // Validate and parse variants
        const variants = [];
        if (data.variants) {
            for (const variant of data.variants) {
                const { categoryType, weight, type, price, stock, sku } = variant;

                // Validate categoryType
                if (!["strength", "cardio"].includes(categoryType)) {
                    return res.status(400).json({ error: "Invalid category type for variant." });
                }

                // Ensure required fields are present based on categoryType
                if (
                    (categoryType === "strength" && !weight) ||
                    (categoryType === "cardio" && !type) ||
                    !price ||
                    !stock ||
                    !sku
                ) {
                    return res.status(400).json({
                        error: "Missing required fields for variant.",
                    });
                }

                // Add to the variants array
                variants.push({
                    categoryType,
                    weight: categoryType === "strength" ? parseFloat(weight) : undefined,
                    type: categoryType === "cardio" ? type : undefined,
                    price: parseFloat(price),
                    stock: parseInt(stock),
                    sku,
                });
            }
        }


                   console.log("jdhkjhfihdhf",variants);

        // Process images if any
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }


        //  update fields with explicit ObjectId casting for category
        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            regularPrice: parseFloat(data.regularPrice),
            salePrice: parseFloat(data.salePrice),

            ...(category && { category:  new mongoose.Types.ObjectId(category) }),
            ...(variants.length > 0 && { variants }),
        };

        // Update product in the database
        if (images.length > 0) {
            await Product.findByIdAndUpdate(
                id,
                { ...updateFields, $push: { productImages: { $each: images } } },
                { new: true }
            );
        } else {
            await Product.findByIdAndUpdate(id, updateFields, { new: true });
        }

        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        res.redirect(`/pageerror?message=${encodeURIComponent(error.message)}`);
    }
};



const deleteSingleImage = async(req,res)=>{

try {

    const {imageNameToServer,productIdToServer} = req.body;
    const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImages:imageNameToServer}},{new:true});
    const imagePath = path.join("public","assets","login",imageNameToServer);
    if(fs.existsSync(imagePath)){
        await fs.unlinkSync(imagePath);
        console.log(`Image ${imageNameToServer} deleted successfully`);
    }else{
        console.log(`Image ${imageNameToServer} not found`);
    }
    
    res.send({status:true});

} catch (error) {
    res.redirect("/admin/pageerror")
}


}



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
    deleteSingleImage,

  
}