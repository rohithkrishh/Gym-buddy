const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema"); 
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const dotenv = require("dotenv")
dotenv.config()
const axios = require("axios")

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


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


const razorpayCreatOrder = async (req, res) => {
    const { amount, currency } = req.body;

    try {
        const order = await razorpayInstance.orders.create({
            amount: amount * 100, // Convert amount to paise
            currency: currency || "INR",
            receipt: `receipt_${Date.now()}`,
        });

        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: "Unable to create Razorpay order" });
    }
};


const varifyPayment = async (req, res) => {
    const userId = req.session.user;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, data } = req.body;

    console.log("req.body", req.body);

    const key_secret = process.env.RAZORPAY_SECRET;
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
        try {
            const { selectedAddress, paymentMethod, coupenCode, totalAmount, coupenOffer, totalregularPrice } = data;
            const cart = await Cart.findOne({ user: userId }).populate('items.product');

            if (!cart || !cart.items || cart.items.length === 0) {
                return res.status(400).json({ message: 'Your cart is empty.' });
            }

            const addressDocument = await Address.findOne({ userId, 'address._id': selectedAddress });
            if (!addressDocument) {
                return res.status(400).json({ message: 'Selected address not found' });
            }

            const address = addressDocument.address.find(
                (addr) => addr._id.toString() === selectedAddress
            );

            
            const validPaymentMethods = ["COD", "Online"];

            if (!validPaymentMethods.includes(paymentMethod)) {
                return res.status(400).json({ message: 'Invalid payment method' });
            }

            for (const item of cart.items) {
                const product = await Product.findOne(
                    { _id: item.product._id, "variants.size": item.size },
                    { "variants.$": 1 }
                );

                if (!product || product.variants[0].quantity < item.quantity) {
                    throw new Error(
                        `Insufficient stock for product "${item.product.productName}" (size: ${item.size}).`
                    );
                }
            }

            const orderData = {
                userId,
                items: cart.items.map((item) => ({
                    productId: item.product._id,
                    quantity: item.quantity,
                    size: item.size,
                    price: item.price,
                    regularPrice: item.regularPrice,
                })),
                shippingAddress: address,
                paymentMethod,
                coupenOffer,
                totalAmount,
                totalregularPrice,
            };

            const order = await Order.create(orderData);

            const variantData = order.items.map((item) => ({
                quantity: item.quantity,
                size: item.size,
                id: item.productId,
            }));

            const updatePromises = variantData.map((variant) =>
                Product.updateOne(
                    { _id: variant.id, "variants.size": variant.size },
                    { $inc: { "variants.$.quantity": -variant.quantity } }
                )
            );

            await Promise.all(updatePromises);

            await Cart.findByIdAndDelete(cart._id);

            // Respond with success
            res.status(200).json({ success: true, message: "Payment verified and order placed", order });
        } catch (error) {
            console.error("Error saving order:", error);
            res.status(500).json({ success: false, message: "Failed to save order", error: error.message });
        }
    } else {
        res.status(400).json({ success: false, message: "Payment verification failed" });
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
    orderDetails,
   razorpayCreatOrder,
   varifyPayment

};











