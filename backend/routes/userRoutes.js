const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/user");
const requireLogin = require("../middleware/requireLogin");

router.get("/login",(req,res)=>{
    res.render("./user/login",{
        title: "Login | WhisperCloud"
    });
})

router.post("/login", async(req, res) => {
    try {
        const {email, password} = req.body
        const foundUser = await User.findOne({email});
        if(!foundUser) return res.redirect("/login");
        const result = await bcrypt.compare(password, foundUser.password)
        if(!result) return res.redirect("/login");
        req.session.user = foundUser;
        res.redirect("/homepage")
    } catch (error) {
        console.log(error)
    }

})

router.get("/homepage", requireLogin, (req, res) => {
    res.render("./user/homepage", {
        title: "Homepage | WhisperCloud",
        user:req.session.user
    })
})

// Destroy session
router.post("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login")
})

router.get("/signup",(req,res)=>{
    res.render("./user/signup",{
        title: "Sign Up | WhisperCloud"
    });
})
router.post("/signup",async(req,res)=>{
     try{
        const {name,email,password} = req.body;
        const hashedPassowrd = await bcrypt.hash(password,12);
        const newUser = new User({
            name:name, 
            email: email,
            password:hashedPassowrd
        });
        await newUser.save();
        console.log("User created successfully!");

    }catch(error){
        console.log("Error !! User was not created");
        console.log(error);
    }
    res.redirect("/");

})



module.exports = router;
