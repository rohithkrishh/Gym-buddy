const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema"); 
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const dotenv = require("dotenv")
dotenv.config()
const axios = require("axios")

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const loadCheckout = async (req, res) => {
    try {
        console.log("ssss");
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
                    select: "type weight salePrice stock ", 
                },
                select: "productName productImages variants", 
            });
       console.log("object",cart);
        
        // if (!cart || cart.items.length === 0) {
        //     return res.render("checkout", { cart: { items: [], total: 0 }, addresses: [] });
        // }

        // Calculate cart total
        const cartTotal = cart.items.reduce((total, item) => {
            const selectedVariant = item.product.variants.find(
                (variant) => variant._id.toString() === item.variantId.toString()
            );
            return total + (selectedVariant ? selectedVariant.salePrice * item.quantity : 0);
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
                              salePrice: selectedVariant.salePrice,
                              stock: selectedVariant.stock,
                          }
                        : null,
                    quantity: item.quantity,
                    total: selectedVariant ? selectedVariant.salePrice * item.quantity : 0,
                };
            }),
            total: cartTotal,
        };

        
        const addressDocument = await Address.findOne({ userId: userId }); 

        const activeCoupon = await Coupon.find({isList:true});
        
        if (!addressDocument || addressDocument.address.length === 0) {
            return res.render("checkout", { cart: preparedCart, addresses: [], coupons:activeCoupon });
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
        
console.log("addredd",preparedAddresses)
        
      console.log("object",activeCoupon);
        // console.log("shhhh",activeCoupon);

        if(!activeCoupon){
            res.render("checkout",{ cart: preparedCart, addresses: preparedAddresses,})
        }
        res.render("checkout", { cart: preparedCart, addresses: preparedAddresses,coupons:activeCoupon });
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
        const finalPrice = Math.trunc(subtotal - discount);
        // Create order
        const newOrder = new Order({
            user: userId,
            cartItems: cart.items.map(item => ({
                product: item.product._id,
                variant: item.variantId,
                quantity: item.quantity,
                salePrice: item.salePrice
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
console.log("object",amount,currency);
    try {
        const order = await razorpayInstance.orders.create({
            amount: amount * 100, // Convert amount to paise
            currency: currency || "INR",
            receipt: `receipt_${Date.now()}`,
        });
console.log("order",order)
        res.status(200).json({ success: true, orderId: order.id,key:process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: "Unable to create Razorpay order" });
    }
};


// const verifyPayment = async (req, res) => {
//     const userId = req.session.user;
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, finalAmount, addressId, paymentMethod,couponCode } = req.body;
// console.log("dhdh",couponCode);
//     const key_secret = process.env.RAZORPAY_KEY_SECRET;
//     const hmac = crypto.createHmac('sha256', key_secret);
//     hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
//     const generated_signature = hmac.digest('hex');

//     if (!razorpay_signature || generated_signature !== razorpay_signature) {
//         return res.status(400).json({ message: 'Payment verification failed.' });
//     }

//     try {
//         if (!addressId) {
//             return res.status(400).json({ message: 'Address is required.' });
//         }

//         const cart = await Cart.findOne({ user: userId }).populate('items.product');
//         if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
//             return res.status(400).json({ message: 'Your cart is empty.' });
//         }

//         // Fetch the selected address using addressId
//         const addressDocument = await Address.findOne({ userId });
//         const address = addressDocument?.address?.find(
//             (addr) => addr._id.toString() === addressId
//         );
     
//         if (!address) {
//             return res.status(404).json({ message: 'Selected address not found.' });
//         }

//         const validPaymentMethods = ["COD", "Online"];
//         if (!validPaymentMethods.includes(paymentMethod)) {
//             return res.status(400).json({ message: 'Invalid payment method.' });
//         }

//         const calculatedSubTotal = cart.items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);

//         let discount = 0;
//         let coupon = await Coupon.findOne({name:couponCode,isList:true});
//         discount = coupon.offerValue || 0 ;
//         let calculatedTotal =calculatedSubTotal-discount

//         if (calculatedTotal !== finalAmount) {
//             return res.status(400).json({ message: 'Invalid total amount.' });
//         }

//         // Create the order
//         const newOrder = new Order({
//             user: userId,
//             cartItems: cart.items.map(item => ({
//                 product: item.product._id,
//                 variant: item.variantId,
//                 quantity: item.quantity,
//                 salePrice: item.salePrice,
//             })),
//             shippingAddress: address,
//             paymentMethod,
//             totalPrice: calculatedSubTotal,
//             discount,
//             finalPrice: calculatedTotal,
//         });

//         await newOrder.save();
       

//         for (const item of cart.items) {
//             const product = await Product.findById(item.product._id);
//             if (product) {
//                 const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
//                 if (variant.stock < item.quantity) {
//                     return res.status(400).json({
//                         error: `Insufficient stock for product: ${product.name}`,
//                     });
//                 }
//                 variant.stock -= item.quantity;
//                 await product.save();
//             }
//         }

//         // Clear the cart
//         cart.items = [];
//         cart.totalItems = 0;
//         cart.totalPrice = 0;
//         await cart.save();

//         return res.status(201).json({ success: true, message: 'Order placed successfully!', orderId: newOrder._id });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'An error occurred while placing the order.' });
//     }
// };


const verifyPayment = async (req, res) => {
    const userId = req.session.user;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, finalAmount, addressId, paymentMethod, couponCode } = req.body;

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (!razorpay_signature || generated_signature !== razorpay_signature) {
        return res.status(400).json({ message: 'Payment verification failed.' });
    }

    try {
        if (!addressId) {
            return res.status(400).json({ message: 'Address is required.' });
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(400).json({ message: 'Your cart is empty.' });
        }

        // Fetch the selected address using addressId
        const addressDocument = await Address.findOne({ userId });
        const address = addressDocument?.address?.find(
            (addr) => addr._id.toString() === addressId
        );

        if (!address) {
            return res.status(404).json({ message: 'Selected address not found.' });
        }

        const validPaymentMethods = ["COD", "Online"];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method.' });
        }

        const calculatedSubTotal = cart.items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);

        // Handle coupon validation and discount
        let discount = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({ name: couponCode, isList: true });
            if (coupon) {
                // Check if the coupon is expired
                if (new Date() > new Date(coupon.expireOn)) {
                    return res.status(400).json({ message: 'Coupon has expired.' });
                }

                // Calculate discount based on the offer type
                if (coupon.offerType === 'flat') {
                    discount = coupon.offerValue;
                } else if (coupon.offerType === 'percentage') {
                    discount = calculatedSubTotal * coupon.offerValue / 100;
                   
                }
            } else {
                return res.status(400).json({ message: 'Invalid or expired coupon.' });
            }
        }

        const calculatedTotal = calculatedSubTotal - discount;

       

        // if (calculatedTotal !== finalAmount) {
        //     return res.status(400).json({ message: 'Invalid total amount.' });
        // }

        // Create the order
        const newOrder = new Order({
            user: userId,
            cartItems: cart.items.map(item => ({
                product: item.product._id,
                variant: item.variantId,
                quantity: item.quantity,
                salePrice: item.salePrice,
            })),
            shippingAddress: address,
            paymentMethod,
            totalPrice: calculatedSubTotal,
            discount,
            finalPrice: calculatedTotal,
        });

        await newOrder.save();

        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            if (product) {
                const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
                if (variant.stock < item.quantity) {
                    return res.status(400).json({
                        error: `Insufficient stock for product: ${product.name}`,
                    });
                }
                variant.stock -= item.quantity;
                await product.save();
            }
        }

        // Clear the cart
        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        await cart.save();

        return res.status(201).json({ success: true, message: 'Order placed successfully!', orderId: newOrder._id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while placing the order.' });
    }
};


const verifyCoupon = async (req,res) => {
   
    const { couponCode,subtotal } = req.body;

    try {
        // Find the coupon in the database
        const coupon = await Coupon.findOne({ name: couponCode, isList: true });
               console.log("dh",coupon);
        if (!coupon) {
            return res.status(400).json({ message: 'Invalid or expired coupon.' });
        }

        // Check if the coupon is expired
        if (new Date() > new Date(coupon.expireOn)) {
            return res.status(400).json({ message: 'Coupon has expired.' });
        }
        let discount=0;
        if(coupon.offerType ==='flat'){
            discount = coupon.offerValue
        }else if(coupon.offerType === 'percentage'){
            discount = subtotal*coupon.offerValue/100
        }

        // Return the discount amount to the client
        res.json({ discount });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
   
}


const orderDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderId } = req.params; 

        // Fetch order details from the database
        const order = await Order.findById(orderId).populate("cartItems.product")
        
        

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

    order.orderStatus = 'Cancelled';
    await order.save();
  
      for (const item of order.cartItems) {
        const product = await Product.findById(item.product._id);
        if (product) {
          
          const variant = product.variants.id(item.variant);
          if (variant) {
            variant.stock += item.quantity; 
            await product.save();
          }
        }
      }

    const user = await User.findById(order.user._id)

    if(!user){
        return res.status(404).send("ueser not found")
    }

    const refundAmount = order.finalPrice;
    user.wallet.balance += refundAmount;

    user.wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        description: `Refund for cancelled order ${order._id}`,
    });

    await user.save();

    
      res.status(200).send('Order cancelled successfully');
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).send('Internal Server Error');
    }
  };


  const returnOrder = async (req, res) => {
    try {
        const { orderId } = req.body; 
        const userId = req.session.user; 

        // Find the order
        const order = await Order.findOne({ _id: orderId, user: userId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        // Ensure the order has been delivered
        if (order.orderStatus !== 'Delivered') {
            return res.status(400).json({ message: 'Only delivered orders can be returned.' });
        }

        // Validate the return window (10 days from delivery date)
        // if (!order.deliveredAt) {
        //     return res.status(400).json({ message: 'Delivery date not found.' });
        // }

        const deliveredAt = new Date(order.updatedAt);
        
        const currentDate = new Date();
        const returnWindow = new Date(deliveredAt);
        returnWindow.setDate(returnWindow.getDate() + 10);

        if (currentDate > returnWindow) {
            return res.status(400).json({ message: 'Return window has expired.' });
        }

        order.orderStatus = 'Returned';
        await order.save();
        

        for (const item of order.cartItems) {
            const product = await Product.findById(item.product._id);
            if (product) {
              
              const variant = product.variants.id(item.variant);
              if (variant) {
                variant.stock += item.quantity; 
                await product.save();
              }
            }
          }

          const user = await User.findById(order.user._id)

          if(!user){
              return res.status(404).send("ueser not found")
          }
      
          const refundAmount = order.finalPrice;
          user.wallet.balance += refundAmount;
      
          user.wallet.transactions.push({
              type: 'credit',
              amount: refundAmount,
              description: `Refund for cancelled order ${order._id}`,
          });
      
          await user.save();

        return res.status(200).json({ message: 'Order has been returned successfully.' });
    } catch (error) {
        console.error('Error processing order return:', error);
        return res.status(500).json({ message: 'An error occurred while processing the return request.' });
    }
};

 

module.exports = {
    loadCheckout,
    placeOrder,
    cancelOrder,
    orderDetails,
   razorpayCreatOrder,
   verifyPayment,
   verifyCoupon,
   returnOrder

};











