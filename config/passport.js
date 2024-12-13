const passport=require("passport")
const GoogleStrategy=require("passport-google-oauth20").Strategy
const User=require("../models/userSchema")
const env=require("dotenv").config()



passport.use(new GoogleStrategy({

    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"/google/callback"
},

async (accessToken,refresToken,profile,done)=>{

try {
  
    let user= await User.findOne({googleId:profile.id })
    if(user){
        console.log("mmmmmmmmmmmm");
        return done(null,user)
    }else{
        user= new User({
name:profile.displayName,
email:profile.emails[0].value,
googleId:profile.id
        })
        await user.save()
        return done(null,user)
    }
    
} catch (error) {

 return done(error,null)   
}

}
))

passport.serializeUser((user,done)=>{
    done(null,user.id)
    console.log("Serializing user:", user);

})

passport.deserializeUser((id,done)=>{

    User.findById(id)
    .then(user=>{
        done(null,user)
        console.log("deSerializing user:", user);

    })
    .catch(err=>{
        done(err,null)
    })
})





module.exports=passport
