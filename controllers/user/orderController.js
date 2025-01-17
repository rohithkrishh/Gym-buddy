const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema"); 
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");



const loadCheckout = async (req, res) => {
    try {
        
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "User not authenticated." });
        }

        const userId = req.user._id;

        // Fetch the user's cart
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
            return res.render("checkout", { cart: { items: [], total: 0 }, addresses: [] });
        }

        // Calculate cart total
        const cartTotal = cart.items.reduce((total, item) => {
            const selectedVariant = item.product.variants.find(
                (variant) => variant._id.toString() === item.variantId.toString()
            );
            return total + (selectedVariant ? selectedVariant.price * item.quantity : 0);
        }, 0);

        //  cart data for rendering
        const preparedCart = {
            items: cart.items.map(item => {
                const selectedVariant = item.product.variants.find(
                    (variant) => variant._id.toString() === item.variantId.toString()
                );
                return {
                    productId: item.product._id,
                    name: item.product.productName,
                    productImage: item.product.productImages,
                    variant: selectedVariant
                        ? {
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

        
        const addressDocument = await Address.findOne({ userId: userId }); 

        
        if (!addressDocument || addressDocument.address.length === 0) {
            return res.render("checkout", { cart: preparedCart, addresses: [] });
        }

        
        const preparedAddresses = addressDocument.address.map(address => ({
            _id: address._id,
            addressType: address.addressType,
            name: address.name,
            city: address.city,
            landMark: address.landMark,
            state: address.state,
            pincode: address.pincode,
            phone: address.phone,
            altPhone: address.altPhone,
            fullAddress: `${address.name}, ${address.landMark}, ${address.city}, ${address.state} - ${address.pincode}`,
        }));

        
        res.render("checkout", { cart: preparedCart, addresses: preparedAddresses });
    } catch (error) {
        console.error("Error fetching checkout page:", error);
        res.status(500).render("error-page", {
            error: "Something went wrong while loading the checkout page. Please try again later.",
        });
    }
};


const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const userId = req.user._id;

        // user cart
        const cart = await Cart.findOne({ user: userId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: "Cart is empty." });
        }

        
        const userAddress = await Address.findOne({ userId });
        const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
        if (!selectedAddress) {
            return res.status(404).json({ error: "Address not found." });
        }

        
        const subtotal = cart.totalPrice;
        const discount = 0; 
        const finalPrice = subtotal - discount;

        // Create order
        const newOrder = new Order({
            user: userId,
            cartItems: cart.items.map(item => ({
                product: item.product._id,
                variant: item.variantId,
                quantity: item.quantity,
                price: item.price
            })),
            shippingAddress: selectedAddress,
            paymentMethod,
            totalPrice: subtotal,
            discount,
            finalPrice
        });

        await newOrder.save();

        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            if (product) {
                const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
                if (variant) {
                    variant.stock -= item.quantity;

                    if (variant.stock < 0) {
                        return res.status(400).json({
                            error: `Insufficient stock for product: ${product.name}`,
                        });
                    }
                }
                await product.save();
            }
        }

        // Clear user's cart
        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        await cart.save();

        return res.status(201).json({ message: "Order placed successfully!", orderId: newOrder._id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "An error occurred while placing the order." });
    }
};

const orderDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderId } = req.params; 

        // Fetch order details from the database
        const order = await Order.findById(orderId).populate("cartItems.product");

        // console.log('order:', JSON.stringify(order, null, 2))

        if (!order) {
            return res.status(404).send("Order not found");
        }

        res.render("orderdetails", { order ,userId});

    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal server error");
    }
};



const cancelOrder = async (req, res) => {
    try {
      const orderId = req.params.id;
  
      // Find the order and populate cart items
      const order = await Order.findById(orderId).populate('cartItems.product');
  
      if (!order) {
        return res.status(404).send('Order not found');
      }
  
      if (order.orderStatus === 'Shipped' || order.orderStatus === 'Delivered') {
        return res.status(400).send('Cannot cancel shipped or delivered orders');
      }
  
      // Update the order status to 'Cancelled'
      order.orderStatus = 'Cancelled';
      await order.save();
  
      // Loop through cart items and update stock of variants in the corresponding product
      for (const item of order.cartItems) {
        const product = await Product.findById(item.product._id);
        if (product) {
          // Find the specific variant in the product's variants array
          const variant = product.variants.id(item.variant);
          if (variant) {
            variant.stock += item.quantity; // Increment the stock by the canceled quantity
            await product.save();
          }
        }
      }
  
      res.status(200).send('Order cancelled successfully');
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  




module.exports = {
    loadCheckout,
    placeOrder,
    cancelOrder,
    orderDetails
};





// const loadCheckout = async (req, res) => {
//     try {
//         // Ensure user is authenticated
//         if (!req.user || !req.user._id) {
//             return res.status(401).json({ error: "User not authenticated." });
//         }

//         const userId = req.user._id;

//         // Fetch the user's cart
//         const cart = await Cart.findOne({ user: userId })
//             .populate({
//                 path: "items.product",
//                 populate: {
//                     path: "variants",
//                     select: "type weight price stock ", // Fields you want to select from Variant
//                 },
//                 select: "productName salePrice productImages variants", // Fields you want to select from Product
//             });

//         // Check if cart exists
//         if (!cart || cart.items.length === 0) {
//             return res.render("checkout", { cart: { items: [], total: 0 } });
//         }

//         // Calculate cart total
//         const cartTotal = cart.items.reduce((total, item) => {
//             const selectedVariant = item.product.variants.find(
//                 (variant) => variant._id.toString() === item.variantId.toString()
//             );
//             return total + (selectedVariant ? selectedVariant.price * item.quantity : 0);
//         }, 0);

//         // Prepare cart data for rendering
//         const preparedCart = {
//             items: cart.items.map(item => {
//                 const selectedVariant = item.product.variants.find(
//                     (variant) => variant._id.toString() === item.variantId.toString()
//                 );
//                 return {
//                     productId: item.product._id,
//                     name: item.product.productName,
//                     productImage: item.product.productImages,
//                     variant: selectedVariant
//                         ? {
//                               type: selectedVariant.type,
//                               weight: selectedVariant.weight,
//                               price: selectedVariant.price,
//                               stock: selectedVariant.stock,
//                           }
//                         : null,
//                     quantity: item.quantity,
//                     total: selectedVariant ? selectedVariant.price * item.quantity : 0,
//                 };
//             }),
//             total: cartTotal,
//         };

//         // Render the checkout page
//         res.render("shop-checkout", { cart: preparedCart });
//     } catch (error) {
//         console.error("Error fetching checkout page:", error);
//         res.status(500).render("error-page", {
//             error: "Something went wrong while loading the checkout page. Please try again later.",
//         });
//     }
// };







