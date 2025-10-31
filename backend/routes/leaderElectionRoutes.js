// a rotue to update users last-seen to current time
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const requireLogin = require("../middleware/requireLogin");


router.post("/update-last-seen", requireLogin, async (req, res) => {
  try {
    const { userId } = req.body;
    const curUser = await User.findById(userId);
    if (!curUser) return res.status(404).json({ error: "User not found" });

    curUser.lastSeen = Date.now();
    await curUser.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating lastSeen:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});


// returns the lastSeen of the leader
router.post("/leader-last-seen", requireLogin, async (req, res) => {
  try {
    const { leaderId } = req.body;
    const leader = await User.findById(leaderId);
    if (!leader) return res.status(404).json({ success: false, error: "Leader not found" });

    const leaderLastSeen = leader.lastSeen;

    return res.status(200).json({ success: true, leaderLastSeen });
  } catch (error) {
    console.error("Error getting leader lastSeen:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});


router.post("/start-election", requireLogin, async (req, res) => {
  try {
    console.log("***** STARTING ELECTION PROCESS")
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error Election:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
