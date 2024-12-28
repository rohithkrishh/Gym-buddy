// const express=require("express")
// const app=express()
// const path=require("path")
// const env=require("dotenv").config();
// const session=require("express-session");
// const passport=require("./config/passport")
// const db=require("./config/db")
// const userRouter = require("./routes/userRouter");
// const adminRouter = require("./routes/adminRouter");


// db()

// app.use(express.json())
// app.use(express.urlencoded({extended:true}))


// app.use((req,res,next)=>{

//     res.set('cache-control','no-store')
//     next()
// })


// app.use(session({

//     secret:process.env.SESSION_SECRET,
//     resave:false,
//     saveUninitialized:false,
//     cookie:{
//         secure:false,
//         httpOnly:true,
//         maxAge:72*60*60*1000
//     }

// }))


// app.use(passport.initialize())

// app.use(passport.session())


// app.set("view engine","ejs")
// app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")])
// app.use(express.static(path.join(__dirname, "public")));


// app.use("/",userRouter)
// app.use("/admin",adminRouter)

// const PORT = process.env.PORT || 3000;


// app.listen(process.env.PORT,()=>{
//     console.log("Server is Running on http://localhost:3000");
    
// })

// module.exports=app




const express = require('express');
const app = express();
const env = require('dotenv').config;
const path = require('node:path');
const session = require('express-session');
const passport =require('./config/passport');
const nocache = require('nocache');
    
const db=require("./config/db")
db()

const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')

app.use(nocache())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

app.use(passport.initialize());
app.use(passport.session());
app.use((req,res,next)=>{
    res.locals.user = req.user || null ;
    next();
})

app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")])
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));


app.use('/',userRouter)
app.use('/admin',adminRouter)


app.listen(process.env.PORT,()=>{
    console.log('http://localhost:3000/')
    console.log('http://localhost:3000/admin/login')
})

