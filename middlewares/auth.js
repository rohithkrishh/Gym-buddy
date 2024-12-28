const User = require("../models/userSchema");

const userAuth = (req,res,next)=>{

if(req.session.user){
  console.log('qwertyu',req.session.user)
User.findById(req.session.user)
.then(data=>{
    if(data && !data.isBlocked){
        next();
    }else{
      console.log('1login')
        res.redirect("/login")
    }
})
.catch(error=>{
  
    console.log("Error in user auth middleware");
    res.status(500).send("Internal Server error")
    

})
}else{
  console.log('2login')
    res.redirect("/login")
}
 
}


const adminAuth = async (req, res, next) => {
  try {
   
    // Check if session exists and user is an admin
    if (req.session && req.session.admin) {
      return next(); // Admin is authenticated
    }

    // Redirect to login if not authenticated as admin
    return res.redirect("/admin/login");
  } catch (error) {
    console.error("Error in adminAuth middleware:", error.message, error.stack);
    return res.redirect("/admin/pageerror"); // Redirect to error page on unexpected issues
  }
};




module.exports={
    userAuth,adminAuth,
}















// const adminAuth = (req,res,next)=>{

//     User.findOne({isAdmin:true})
//     .then(data=>{
// if(data){
//     next();
// }else{
//     res.redirect("/admin/login")
// }
//     })
//     .catch(error=>{
//         console.log("Error in adminauth middleware",error);
//         res.status(500).send("Internal Server Error")
        
//     })
// }





// const adminAuth = async (req, res, next) => {
//   try {
//     // Check if the logged-in user is an admin
//     const userId = req.session.user; // Assuming `req.session.user` holds the logged-in user's ID

//     if (!userId) {
//       return res.redirect("/admin/login"); // Redirect if no user is logged in
//     }

//     const user = await User.findById(userId);

//     if (user && user.isAdmin) {
//       // User is an admin, proceed to the next middleware or route
//       return next();
//     }

//     // User is not an admin
//     res.redirect("/admin/login");
//   } catch (error) {
//     console.error("Error in adminAuth middleware:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };