const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema"); 
const Cart = require("../../models/cartSchema");



const getCartPage = async (req, res) => {
    try {
        // user is authenticated
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "User not authenticated." });
        }

        const userId = req.user._id;

        //  product and variant details
        const cart = await Cart.findOne({ user: userId })
            .populate({
                path: "items.product",
                populate: {
                    path: "variants",
                    select: "type weight price stock ", 
                },
                select: "productName salePrice productImages variants", 
            });

           
            
        
        if (!cart || cart.items.length === 0) {
            return res.render("shop-cart", { cart: { items: [], total: 0 } });
        }

        // cart total
        const cartTotal = cart.items.reduce((total, item) => {
            const selectedVariant = item.product.variants.find(
                (variant) => variant._id.toString() === item.variantId.toString()
            );
            return total + (selectedVariant ? selectedVariant.price * item.quantity : 0);
        }, 0);

        //  data for rendering
        const preparedCart = {
            items: cart.items.map(item => {
                const selectedVariant = item.product.variants.find(
                    (variant) => variant._id.toString() === item.variantId.toString()
                );
                return {
                    itemId:item._id,
                    productId: item.product._id,
                    name: item.product.productName,
                    productImage:item.product.productImages,
                    variant: selectedVariant
                        ? {
                            variantId:selectedVariant._id,
                              type: selectedVariant.type,
                              weight: selectedVariant.weight,
                              price: selectedVariant.price,
                              stock: selectedVariant.stock,
                          }
                        : null,
                    quantity: item.quantity,
                    total: selectedVariant ? selectedVariant.price * item.quantity : 0,
                };
            }),
            total: cartTotal,
        };


        
        res.render("shop-cart", { cart: preparedCart });
    } catch (error) {
        console.error("Error fetching cart page:", error);
        res.status(500).render("error-page", {
            error: "Something went wrong while fetching your cart. Please try again later.",
        });
    }
};


const addToCart = async (req, res) => {
    const { productId, variantId, quantity } = req.body;
    const userId = req.session.user;
    const MAX_QUANTITY = 5;

    try {
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User not logged in' });
        }

        if (!productId || !variantId || !quantity) {
            return res.status(400).json({ success: false, message: 'Product ID, variant ID, and quantity are required' });
        }

        const parsedQuantity = Number(quantity);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive number' });
        }
        

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        if (variant.stock < parsedQuantity) {
            return res.status(400).json({ success: false, message: `Only ${variant.stock} units are available.` });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        if (!Array.isArray(cart.items)) {
            cart.items = [];
        }

        const itemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId && 
            item.variantId && item.variantId.toString() === variantId // Check for undefined
        );

        let newQuantity = parsedQuantity;

        if (itemIndex !== -1) {
            const currentQuantity = cart.items[itemIndex].quantity;
            newQuantity += currentQuantity;

            if (newQuantity > MAX_QUANTITY) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add up to ${MAX_QUANTITY} units of this product.`,
                });
            }

            if (newQuantity > variant.stock) {
                return res.status(400).json({ success: false, message: `Only ${variant.stock} units are available.` });
            }

            cart.items[itemIndex].quantity = newQuantity;
        } else {
            if (newQuantity > MAX_QUANTITY) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add up to ${MAX_QUANTITY} units of this product.`,
                });
            }

            cart.items.push({
                product: productId,
                variantId: variantId,
                quantity: newQuantity,
                price: variant.price,
            });
        }


        await cart.save();
       
        res.status(200).json({ success: true, message: 'Item added to cart', cart });
    } catch (error) {
        console.error("Error adding item to cart:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const removeProductFromCart = async (req, res) => {
    const { productId, variantId } = req.body;
    const userId = req.session.user;
   

    console.log("product:",productId,"variant:",variantId)
    try {
        
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User not logged in' });
        }

        if (!productId || !variantId) {
            return res.status(400).json({ success: false, message: 'Product ID and variant ID are required' });
        }

        const cart = await Cart.findOne({ user: userId });

        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(404).json({ success: false, message: 'Cart is empty or not found' });
        }

    
        const itemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId && item.variantId.toString() === variantId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product or variant not found in the cart' });
        }

    
        cart.items.splice(itemIndex, 1);

        
        await cart.save();

       
        res.status(200).json({
            success: true,
            message: 'Item removed from cart successfully',
            cart,
        });

    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



const updateCartQuantity = async (req, res) => {
    const { productId, variantId, change } = req.body;
    const userId = req.session.user;

    try {
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User not logged in' });
        }

        if (!productId || !variantId || typeof change !== 'number') {
            return res.status(400).json({ success: false, message: 'Product ID, variant ID, and valid change value are required' });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart || !Array.isArray(cart.items)) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(item =>
            item.product.toString() === productId &&
            item.variantId.toString() === variantId
        );

        if (!item) {
            return res.status(404).json({ success: false, message: 'Product or variant not found in cart' });
        }

        
        
        const newQuantity = item.quantity + change;

        if (newQuantity <1) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
        }

        if (newQuantity > 5) {
            return res.status(400).json({ success: false, message: 'You can only add up to 5 units of this product.' });
        }
        

        // Fetch product and variant for stock validation
        const product = await Product.findById(productId);
        const variant = product.variants.find(v => v._id.toString() === variantId);

        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        if (newQuantity > variant.stock) {
            return res.status(400).json({ success: false, message: `Only ${variant.stock} units are available.` });
        }

        // Update the quantity in the cart
        item.quantity = newQuantity;
        await cart.save();

        
        const cartTotal = cart.items.reduce((total, cartItem) => {
            const variant = product.variants.find(v => v._id.toString() === cartItem.variantId.toString());
            return total + cartItem.quantity * (variant ? variant.price : 0);
        }, 0);

        res.status(200).json({
            success: true,
            message: 'Quantity updated successfully',
            updatedItem: {
                productId,
                variantId,
                quantity: item.quantity,
                variantPrice: variant.price,
            },
            newCartTotal: cartTotal,
        });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};







module.exports = { 
    getCartPage,
     addToCart,
     removeProductFromCart,
     updateCartQuantity
    
 };




//Get Cart Page

// const getCartPage = async (req, res) => {
//     try {
//         if (!req.user || !req.user._id) {
//             return res.status(400).json({ error: "User not authenticated or missing ID." });
//         }

//         const userId = req.user._id;

//         const cart = await Cart.findOne({ user: userId }).populate('items.product');

//         res.render('shop-cart', { cart });
//     } catch (error) {
//         console.error("Error fetching cart page:", error);
//         res.status(500).json({ error: "Server error while fetching the cart page." });
//     }
// };




 // const getCartPage = async (req, res) => {

//     const userId = req.user._id;
//     try {
//         const cart = await Cart.findOne({ user:userId }).populate('items.productId');

//         if (!cart || cart.items.length === 0) {
//             return res.render('shop-cart', { items: [], cartTotal: 0, discount: 0, message: 'Your cart is empty.' });
//         }
//         // cart.items = cart.items.filter(item => !item.productId.isBlocked);
//         // await cart.save();
//         // const cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
//          // res.render('users/cart', { items: cart.items, cartTotal, discount: 0 });

//         // const cartTotal = cart.items.reduce((total, item) => !item.productId.isBlocked ? total + item.totalPrice : total, 0); 
//         res.render('cart', { items: cart.items, cartTotal, discount: 0, message: '' });
        
//     } catch (error) {
//         console.error("Error loading cart:", error);
//         res.status(500).send("Internal server error");
//     }
// };




// const addToCart = async (req, res) => {
//     const { productId, variantId, quantity } = req.body; // Include variantId in the request
//     const userId = req.session.user;
//     const MAX_QUANTITY = 5; 

//     try {
//         if (!userId) {
//             return res.status(400).json({ success: false, message: 'User not logged in' });
//         }

//         if (!productId || !variantId || !quantity) {
//             return res.status(400).json({ success: false, message: 'Product ID, variant ID, and quantity are required' });
//         }

//         const parsedQuantity = Number(quantity);
//         if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
//             return res.status(400).json({ success: false, message: 'Quantity must be a positive number' });
//         }

//         // Fetch the product and its variant
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ success: false, message: 'Product not found' });
//         }

//         const variant = product.variants.find(v => v._id.toString() === variantId);
//         if (!variant) {
//             return res.status(404).json({ success: false, message: 'Variant not found' });
//         }

//         // Check stock availability
//         if (variant.stock < parsedQuantity) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: `Only ${variant.stock} units are available for this variant.` 
//             });
//         }

//         // Find the user's cart
//         let cart = await Cart.findOne({ user: userId });
//         if (!cart) {
//             cart = new Cart({ user: userId, items: [] });
//         }

//         // Ensure cart.items is an array
//         if (!Array.isArray(cart.items)) {
//             cart.items = [];
//         }

//         // Check if the variant is already in the cart
//         const itemIndex = cart.items.findIndex(item => 
//             item.product.toString() === productId && item.variantId.toString() === variantId
//         );

//         let newQuantity = parsedQuantity;

//         if (itemIndex !== -1) {
//             // Update the existing item's quantity
//             const currentQuantity = cart.items[itemIndex].quantity;
//             newQuantity += currentQuantity;

//             if (newQuantity > MAX_QUANTITY) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `You can only add up to ${MAX_QUANTITY} units of this product.`,
//                 });
//             }

//             // Check stock again after addition
//             if (newQuantity > variant.stock) {
//                 return res.status(400).json({ 
//                     success: false, 
//                     message: `Only ${variant.stock} units are available for this variant.` 
//                 });
//             }

//             cart.items[itemIndex].quantity = newQuantity;
//         } else {
//             // Check if the new item exceeds the maximum limit
//             if (newQuantity > MAX_QUANTITY) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `You can only add up to ${MAX_QUANTITY} units of this product.`,
//                 });
//             }

//             cart.items.push({
//                 product: productId,
//                 variantId: variantId,
//                 quantity: newQuantity,
//                 price: variant.price, // Price based on the variant
//             });
//         }

//         // Reduce stock in the product variant
//         variant.stock -= parsedQuantity;

//         // Save both cart and product changes
//         await cart.save();
//         await product.save();

//         res.status(200).json({ success: true, message: 'Item added to cart', cart });
//     } catch (error) {
//         console.error("Error adding item to cart:", error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// };
