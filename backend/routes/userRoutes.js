const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/user");
const requireLogin = require("../middleware/requireLogin");
const requireLogout = require("../middleware/requireLogout");

router.get("/login",requireLogout,(req,res)=>{
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

router.get("/signup",requireLogout,(req,res)=>{
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

/**
 * Retrieves admins from the database
 */
router.get("/retrieve-admins", requireLogin, async (req, res) => {
    try {
        const admins = await User.find({ type: "admin" })
        if (admins.length === 0) return res.status(404).json({ error: "Admins were not found in the database." })

        return res.status(200).json(admins)
    } catch (error) {
        return res.status(500).json({ success: false, error: "Admin retrieval was unsuccessful." })
    }
})

/**
 * Retrieves peers from the database
 */
router.get("/retrieve-peers", requireLogin, async (req, res) => {
    try {
        const peers = await User.find({ type: "peer" })
        if (peers.length === 0) return res.status(404).json({ error: "Peers were not found in the database." })

        return res.status(200).json(peers)
    } catch (error) {
        return res.status(500).json({ success: false, error: "Peer retrieval was unsuccessful." })
    }
})

/**
 * Pushes broadcast message to a peer's local array
 */
router.post("/push-message", requireLogin, async (req, res) => {
    try {
        const { peerID, content, messageID } = req.body;

        const message = {
            messageId: messageID,
            content: content,
            timestamp: new Date()
        }

        const curPeer = await User.findByIdAndUpdate(
            peerID,
            { $push: {
                broadcastMessages: message
            }}
        )

        if (!curPeer) return res.status(404).json({ error: "Peer update failed" })

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
