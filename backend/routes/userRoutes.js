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

router.get("/homepage", requireLogin, async(req, res) => {
  const curUser = await User.findById(req.session.user._id);
  req.session.user = curUser; // update session
  res.render("./user/homepage", {
      title: "Homepage | WhisperCloud",
      user:curUser
  })
})

router.post("/update-last-seen", requireLogin, async (req, res) => {
  try {
    const { userId } = req.body;
    const curUser = await User.findById(userId);
    if (!curUser) return res.status(404).json({ error: "User not found" });

    curUser.lastSeen = Date.now();
    await curUser.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("update-last-seen error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

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



router.get("/peers", requireLogin, async (req, res) => {
  try {
    const currentUser = await User.findById(req.session.user._id).populate("peers");
    if (!currentUser) {
      return res.status(404).send("User not found");
    }

    const peers = currentUser.peers || [];
    const peerCount = peers.length;

    res.render("user/peers", {
      currentUser,
      peers,
      peerCount,
    });
  } catch (err) {
    console.error("Error fetching user peers:", err);
    res.status(500).send("Server Error");
  }
});

router.post("/update_leader", requireLogin, async (req, res) => {
  try {
    const { userId,newLeaderId } = req.body;
    const curUser = await User.findById(userId);
    if (!curUser) return res.status(404).json({ error: "User not found" });
    curUser.leaderId = newLeaderId;
    await curUser.save();
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("update_leader error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});


module.exports = router;
