const Order = require("../../models/orderSchema")
const Poduct = require("../../models/productSchema");
const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const pdfDoc = require('pdfkit-table'); 

const loadSalesReport = async (req,res) => {

  try {

    const orders = await Order.find().populate('user')
    .populate({path:'cartItems.product',
        select:'productName'
  })
    
    const totalSales = orders.reduce((total,order)=>total+(order.finalPrice || 0),0)
    const finalTotal = Math.floor(totalSales)
    const previousSales = 10000; // Replace with actual previous sales value
    const isSalesIncreased = totalSales > previousSales;
    const totalDiscount = orders.reduce((discountTotal,order)=>discountTotal + (order.discount || 0),0)
    const finalDiscount = Math.floor(totalDiscount)
    const totalOrderCount = orders.length;

    res.render("salesReport",{
      orders,
      totalSales:finalTotal,
      orderCount:totalOrderCount,
      discount:finalDiscount,
      inc:isSalesIncreased

    })
    
  } catch (error) {
    
  }

}

const getFilteredOrders = async (range, startDate, endDate) => {
  let filter = {};
  const today = moment().startOf('day');

  if (range === 'daily') {
      filter = { createdAt: { $gte: today.toDate(), $lte: moment(today).endOf('day').toDate() } };
  } else if (range === 'weekly') {
      filter = { createdAt: { $gte: moment(today).subtract(7, 'days').toDate(), $lte: today.toDate() } };
  } else if (range === 'monthly') {
      filter = { createdAt: { $gte: moment(today).subtract(1, 'month').toDate(), $lte: today.toDate() } };
  } else if (range === 'yearly') {
      filter = { createdAt: { $gte: moment(today).subtract(1, 'year').toDate(), $lte: today.toDate() } };
  } else if (range === 'custom' && startDate && endDate) {
      filter = {
          createdAt: { $gte: moment(startDate).toDate(), $lte: moment(endDate).endOf('day').toDate() },
      };
  }

  return await Order.find(filter).populate('user').populate('cartItems.product');
};


const filteredData = async (req, res) => {
  try {
      const { range, startDate, endDate } = req.body;

      console.log('Range:', range, 'StartDate:', startDate, 'EndDate:', endDate);

      // Fetch filtered orders
      const orders = await getFilteredOrders(range, startDate, endDate);
     console.log("object",orders);
      // Calculate stats
      const totalSales = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed();
      const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0).toFixed();
      const orderCount = orders.length;
      const avgOrderValue = orderCount ? (totalSales / orderCount).toFixed() : 0;

      // Respond with data
      res.json({
          orders,
          summary: { totalSales, totalDiscount, orderCount, avgOrderValue },
      });
  } catch (err) {
      console.error('Error fetching orders:', err.message);
      res.status(500).send('Error fetching orders');
  }
};


const pdfDownload =  async (req, res) => {
  const { range, startDate, endDate } = req.query;

  try {
      const orders = await getFilteredOrders(range, startDate, endDate);

      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Disposition', 'attachment; filename=SalesReport.pdf');
      res.setHeader('Content-Type', 'application/pdf');

      pdfDoc.pipe(res);

      pdfDoc.fontSize(18).text('Sales Report', { align: 'center' });
      pdfDoc.moveDown();

      orders.forEach((order, index) => {
          pdfDoc
              .fontSize(12)
              .text(`Order ${index + 1}`, { underline: true })
              .moveDown(0.5);
          pdfDoc.text(`Date: ${moment(order.createdAt).format('DD-MM-YYYY')}`);
          pdfDoc.text(`Customer: ${order.user?.name || 'Unknown User'}`);
          pdfDoc.text(`Total Price: ₹${order.totalPrice}`);
          pdfDoc.text(`Discount: ₹${order.discount}`);
          pdfDoc.text(`Payment Method: ${order.paymentMethod}`);
          pdfDoc.text(`Order Status: ${order.orderStatus}`);
          pdfDoc.moveDown();
      });

      pdfDoc.end();
  } catch (err) {
      console.error(err);
      res.status(500).send('Error generating PDF');
  }
}


 const excelDownload = async (req, res) => {
  const { range, startDate, endDate } = req.query;

  try {
      const orders = await getFilteredOrders(range, startDate, endDate);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sales Report');

      // Header
      sheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Customer', key: 'customer', width: 20 },
          { header: 'Product', key: 'product', width: 25 },
          { header: 'Quantity', key: 'quantity', width: 10 },
          { header: 'Sale Price', key: 'salePrice', width: 15 },
          { header: 'Total Price', key: 'totalPrice', width: 15 },
          { header: 'Discount', key: 'discount', width: 15 },
          { header: 'Payment Method', key: 'paymentMethod', width: 20 },
          { header: 'Order Status', key: 'orderStatus', width: 15 },
      ];

      // Data
      orders.forEach((order) => {
          order.cartItems.forEach((item) => {
              sheet.addRow({
                  date: moment(order.createdAt).format('DD-MM-YYYY'),
                  customer: order.user?.name || 'Unknown User',
                  product: item.product?.productName || 'N/A',
                  quantity: item.quantity,
                  salePrice: item.salePrice,
                  totalPrice: order.totalPrice,
                  discount: order.discount,
                  paymentMethod: order.paymentMethod,
                  orderStatus: order.orderStatus,
              });
          });
      });

      res.setHeader('Content-Disposition', 'attachment; filename=SalesReport.xlsx');
      res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      await workbook.xlsx.write(res);
      res.end();
  } catch (err) {
      console.error(err);
      res.status(500).send('Error generating Excel');
  }
}

 
// const dashBoard = async(req,res)=>{
//   try {

//       // Best selling product order
//       const product = await Order.aggregate([
//           { $unwind: "$items" },
//           {
//               $group: {
//                   _id: "$items.productId",
//                   totalOrder: { $sum: "$items.quantity" },
//               },
//           },
//           {
//               $lookup: {
//                   from: "products",
//                   localField: "_id",
//                   foreignField: "_id",
//                   as: "productDetails",
//               },
//           },
//           { $unwind: "$productDetails" },
//           {
//               $project: {
//                   _id: 1,
//                   productName: "$productDetails.productName",
//                   totalOrder: 1,
//                   productImage: { $arrayElemAt: ["$productDetails.productImage", 0] },
//               },
//           },
//           { $sort: { totalOrder: -1 } },
//           { $limit: 10 }, 
//       ]);


//       // Best selling category order
//       const category = await Order.aggregate([
//           { $unwind: "$items" },
//           {
//               $lookup: {
//                   from: "products",
//                   localField: "items.productId",
//                   foreignField: "_id",
//                   as: "productDetails",
//               },
//           },
//           { $unwind: "$productDetails" },
//           {
//               $group: {
//                   _id: "$productDetails.category",
//                   totalOrder: { $sum: "$items.quantity" },
//               },
//           },
//           {
//               $lookup: {
//                   from: "categories",
//                   localField: "_id",
//                   foreignField: "_id",
//                   as: "categoryDetails",
//               },
//           },
//           { $unwind: "$categoryDetails" },
//           {
//               $project: {
//                   categoryName: "$categoryDetails.name",
//                   totalOrder: 1,
//               },
//           },
//           { $sort: { totalOrder: -1 } },
//           { $limit: 10 }, // Limit to top 10 categories
//       ]);


//       // chart data for product
//       const productData = product.map((item) => ({
//           productName: item.productName,
//           totalOrder: item.totalOrder,
//       }));
      

//       // chart data for category
//       const categoryData = category.map((cat) => ({
//           categoryName: cat.categoryName,
//           totalOrder: cat.totalOrder,
//       }));
      

//       //console.log("pr",categoryData)

//       res.render("adminDashboard",{product,category,productData,categoryData})
//   } catch (error) {
//       console.error("Error in Loading Admin Dashboard",error);
//   }
// }
  

  module.exports = {
    loadSalesReport,
    filteredData,
    pdfDownload,
    excelDownload

  }