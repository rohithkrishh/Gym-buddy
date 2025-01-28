const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");


const getOrderList = async(req,res)=>{
try {
  
    const orders = await Order.find().populate("cartItems.product");
  
    
    res.render("orderList",{orders})
    
} catch (error) {
    
}

}


const getOrderDetails = async (req, res) => {
    try {
        const orderId  = req.params.id; 
        console.log("ddddd",orderId)

        
        const order = await Order.findById(orderId)
            .populate("cartItems.product", ) 
            

            console.log(order)

        if (!order) {
            return res.status(404).render("error", { message: "Order not found" }); 
        }

        
        res.render("orderDetails", { order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).render("error", { message: "Internal server error" }); 
    }
};


const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params; 
        const { status } = req.body; 

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        
        const order = await Order.findByIdAndUpdate(
            orderId,
            { orderStatus: status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.redirect("/admin/orderList"); 
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




module.exports = {

    getOrderList,
    updateOrderStatus,
    getOrderDetails
}
