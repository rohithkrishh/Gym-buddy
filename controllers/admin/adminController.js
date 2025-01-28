const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const pageerror = async (req,res)=>{
res.render("admin-error")
}

const loadLogin = (req,res)=>{

if(req.session.admin){

    return res.redirect("/admin")
}
console.log("---loadlogin");

res.render("adminlogin",{message:null})

}


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
console.log("---------",req.body)
    // Find admin user with the provided email
    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
        console.log("-----notadmin");
        
      return res.redirect("/admin/login"); 
    }

    // Check if the password matches
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (passwordMatch) {
      // Set admin session
      req.session.admin = true;
console.log("-------===correctp");

      // Redirect to admin dashboard
      return res.redirect('/admin')
     
    } else {
      // Redirect back to login on incorrect password
      console.log("-------incorrectp");
      return res.redirect("/admin/login");
      console.log('........................................');
      
    }
  } catch (error) {
    console.error("Login error:", error);

    // Redirect to a generic error page
    return res.redirect("/admin/pageerror");
  }
};


const loadDashboard = async(req,res)=>{

    if(req.session.admin){
        try {
            res.render("dashboard");
        } catch (error) {

            res.redirect("/pageerror")
            
        }
    }


}

const logout = async(req,res)=>{

  try {
    req.session.destroy(err=>{
if(err){
  console.log("Error destroying session",err);
  return res.redirect("/pageerror")
}
res.redirect("/admin/login")
    })
    
  } catch (error) {
    console.log("unexpected error during logout",error);
    res.redirect("/pageerror")
  }
 

}



module.exports = {
    loadLogin,login,loadDashboard,pageerror,logout,
}