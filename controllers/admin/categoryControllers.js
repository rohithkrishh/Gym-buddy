const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const product = require("../../models/productSchema")

const categoryInfo = async(req,res)=>{

    try{
        const page = parseInt(req.query.page) || 1
        const limit = 4;
        const skip = (page-1)*limit;
         
        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);

        const totalCategory = await Category.countDocuments()
        const totalPages = Math.ceil(totalCategory / limit);
        res.render("category",{cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            categories:totalCategory
        })
    }catch(error){
console.error(error)
res.redirect("/pageerror")
    }

}



// const addCategory = async (req, res) => {
//     const { name, description } = req.body;

//     // Log request data
//     console.log("name:", name, "description:", description);

//     // Validate input
//     if (!name || !description) {
//         return res.status(400).json({ error: "Name and description are required" });
//     }

//     try {
//         // Check if category already exists
//         const existingCategory = await Category.findOne({ name });
//         if (existingCategory) {
//             return res.status(400).json({ error: "Category already exists" });
//         }

//         // Create new category
//         const newCategory = new Category({
//             name,
//             description,
//         });

//         // Save category to database
//         await newCategory.save();
//         return res.json({ message: "Category added successfully" });

//     } catch (error) {
//         console.error("Error adding category:", error);
//         return res.status(500).json({ error: "Internal Server Error" });
//     }
// };


const addCategory = async (req, res) => {
    const { name, description, type } = req.body;

    // Log request data
    console.log("name:", name, "description:", description, "type:", type);

    // Validate input
    if (!name || !description || !type) {
        return res.status(400).json({ error: "Name, description, and type are required" });
    }

    try {
        // Check if category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        // Create new category
        const newCategory = new Category({
            name,
            description,
            type, // Include the type field
        });

        // Save category to database
        await newCategory.save();
        return res.json({ message: "Category added successfully" });
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};


// const addCategoryOffer = async (req,res)=>{
// try{
//     const percentage = parseInt(req.body.percentage);
   
//     const categoryId = req.body.categoryId;
    
//     const category = await Category.findById(categoryId);
//     const productData = await Product.find()
//     // console.log("product",productData)

//     if(!category){
//         return res.status(400).json({status:false,messsage:"Category not found"});
//     }

//     category.categoryOffer = percentage;
//     const productOffer = parseFloat(productData.productOffer || 0);

//     // Get the highest category offer
//     const categoryOffer = category.map((cat) => cat.categoryOffer || 0);

//     const highestOffer = Math.max(productOffer, categoryOffer);
   

//     await category.save();
   
//     res.status(200).json({status:true});

//  } catch (error){
   
// res.status(500).json({status:false,message:"Internal Server Error"})
//     }

// }

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        // Find the category by ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ status: false, message: "Category not found" });
        }

        // Update the category offer
        category.categoryOffer = percentage;
        await category.save();

        // Find all products under this category
        const productData = await Product.find({ category: categoryId });

        // Update the highest offer for each product
        for (const product of productData) {
            const productOffer = parseFloat(product.productOffer || 0); 
            const highestOffer = Math.max(productOffer, percentage);  
            product.highestOffer = highestOffer;                     
            await product.save();
        }

        res.status(200).json({ status: true, message: "Category offer and product highest offers updated" });
    } catch (error) {
        console.error("Error updating category offer:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};



const removeCategoryOffer = async (req,res)=>{
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if(!category){
            return res.status(404).json({status:false, message:"category not found"})
        }

        const percentage = category.categoryOffer;
      

        category.categoryOffer = 0;
        await category.save();
        res.json({status:true});

    } catch (error) {
        res.status(500).json({status:false, message:"Internal Server Error"})
    }
}

const getListCategory = async(req,res)=>{

    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect("/admin/category")

    } catch (error) {
      res.redirect("/pageerror")  
    }

}

const getUnlistCategory = async (req,res)=>{

    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/category")

    } catch (error) {
      res.redirect("/pageerror")  
    }

}

const getEditCategory = async (req,res)=>{

    try {
        console.log("Request query parameters:", req.query);
        const id = req.query.id;
        console.log("category id:",id);
        
        const category = await Category.findOne({_id:id});
        res.render("edit-category",{category:category});
    } catch (error) {
        res.redirect("/pageerror")
    }
}



const editCategory = async (req,res)=>{

    try {
        const id = req.params.id;
        const {categoryName,description} = req.body;
      
        
        const existingCategory = await Category.findOne({name:categoryName});
        if(existingCategory){
            return res.status(400).json({error:"category exists please choose another name"})
        }
const updateCategory = await Category.findByIdAndUpdate(id,{name:categoryName,
    description:description,},{new:true});
    if(updateCategory){
        res.redirect("/admin/category");
    }else{
        res.status(404).json({error:"Category not found"})
    }

    } catch (error) {
        res.status(500).json({error:"Internal Server Error"})
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,editCategory
}













// const addCategoryOffer = async (req, res) => {
//     try {
//         const percentage = parseInt(req.body.percentage, 10);
//         const categoryId = req.body.categoryId;

//         if (isNaN(percentage) || !categoryId) {
//             return res.status(400).json({ status: false, message: "Invalid input data" });
//         }

//         // Find the category
//         const category = await Category.findById(categoryId);
//         if (!category) {
//             return res.status(404).json({ status: false, message: "Category not found" });
//         }

//         // Check products in this category
//         const products = await product.find({ category: category._id });
//         const hasProductOffer = products.some(product => product.productOffer > percentage);
//         if (hasProductOffer) {
//             return res.json({
//                 status: false,
//                 message: "Products within this category already have higher product offers",
//             });
//         }

//         // Update category offer
//         await Category.updateOne(
//             { _id: categoryId },
//             { $set: { categoryOffer: percentage } }
//         );

//         // Reset product offers and prices in bulk
//         await product.updateMany(
//             { category: category._id },
//             { $set: { productOffer: 0 }, $set: { salePrice: "$regularPrice" } }
//         );

//         return res.json({ status: true, message: "Category offer added successfully" });
//     } catch (error) {
//         console.error(error); // Log for debugging
//         return res.status(500).json({ status: false, message: "Internal Server Error" });
//     }
// };