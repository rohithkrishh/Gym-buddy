const User = require("../../models/userSchema");// Assuming you have a User model
const Product = require("../../models/productSchema"); // Assuming you have a Product model


//Get Cart Page

const getCartPage = async (req, res) => {
    try {
        // if (!req.session.user || !req.session.user._id) {
        //     return res.redirect("/login"); // Redirect to login if not authenticated
        // }

        const userId = req.user._id
        console.log("Fetching cart for User ID:", userId); // Debugging

    const user = await User.findById(userId).populate("cart.productId").lean();
    console.log('----------',user);
    

        const cart = await cart.findOne({ userId: mongoose.Types.ObjectId(userId) });

        if (!user) {
            console.error("User not found");
            return res.redirect("/login"); // Redirect to login if user does not exist
        }

        console.log("User Object:", user); // Debugging

        const cartProducts = (User.cart || []).map((item) => {
            return {
                ...item.productsId,
                quantity: item.quantity,
                subtotal: item.productsId.price * item.quantity,
            };
        });

        console.log("Cart Products:", cartProducts); // Debugging

        const total = cartProducts.reduce((acc, item) => acc + item.subtotal, 0);

        res.render("shop-cart", { products: cartProducts, total });
    } catch (error) {
        console.error("Error fetching cart page:", error);
        res.redirect("/error"); // Redirect to error page in case of an issue
    }
};

// const getCartPage = async (req, res) => {
//     try {
//         if (!req.user || !req.user._id) {
//             return res.status(400).json({ error: "User not authenticated or missing ID." });
//         }

//         const userId = req.user._id;
//         console.log("------------",userId);
        
//         const cart = await cart.findOne({ userId });

//         // if (!cart) {
//         //     return res.status(404).json({ error: "Cart not found" });
//         // }

//         res.render('shop-cart');
//     } catch (error) {
//         console.error("Error fetching cart page:", error);
//         res.status(500).json({ error: "Server error while fetching the cart page." });
//     }
// };



// Add to Cart
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user._id;

        const user = await User.findById(userId);
        const product = await Product.findById(productId);

        if (!product || product.isBlocked || product.quantity < quantity) {
            return res.status(400).json({ message: "Product not available or quantity exceeds stock." });
        }

        const cartItem = user.cart.find((item) => item.productId.toString() === productId);

        if (cartItem) {
            cartItem.quantity += quantity;
            if (cartItem.quantity > 10) cartItem.quantity = 10; // Max quantity per product per user
        } else {
            user.cart.push({ productId, quantity: quantity > 10 ? 10 : quantity });
        }

        await user.save();

        res.status(200).json({ message: "Product added to cart" });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Remove Product from Cart
const removeProductFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user._id;

        const user = await User.findById(userId);
        user.cart = user.cart.filter((item) => item.productId.toString() !== productId);

        await user.save();

        res.status(200).json({ message: "Product removed from cart" });
    } catch (error) {
        console.error("Error removing product from cart:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update Quantity in Cart
const updateCartQuantity = async (req, res) => {
    try {
        const { productId, delta } = req.body;
        const userId = req.session.user._id;

        const user = await User.findById(userId);
        const cartItem = user.cart.find((item) => item.productId.toString() === productId);

        if (cartItem) {
            cartItem.quantity += delta;
            if (cartItem.quantity <= 0) cartItem.quantity = 1; // Minimum quantity per product per user
            if (cartItem.quantity > 10) cartItem.quantity = 10; // Maximum quantity limit
        }

        await user.save();

        res.status(200).json({ message: "Cart updated successfully" });
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Clear Cart
const clearCart = async (req, res) => {
    try {
        const userId = req.session.user._id;

        const user = await User.findById(userId);
        user.cart = [];

        await user.save();

        res.status(200).json({ message: "Cart cleared" });
    } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    getCartPage,
    addToCart,
    removeProductFromCart,
    updateCartQuantity,
    clearCart,
};
