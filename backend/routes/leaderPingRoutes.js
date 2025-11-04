// a rotue to update users last-seen to current time
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Message = require("../models/message");
const requireLogin = require("../middleware/requireLogin");
const message = require("../models/message");


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


// a route to ping leader
// it sends a messages to the leader to ask for its last-seen
router.post("/ping-leader", requireLogin, async (req, res) => {
  try {
    const { userId,leaderId } = req.body;
    const PING_message = new Message({
      type:"PING",
      senderId:userId,
      receiverId:leaderId,
      payload:{data:"LEADER: Are you alive?"},
      status:"PENDING",
      timestamp: Date.now()
    })
    await PING_message.save();
    return res.status(200).json({ success: true});

  } catch (error) {
    console.error("Error pinging leader:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});



// returns any PENDING messages to the leader
router.post("/check-leader-ping-messages", requireLogin, async (req, res) => {
  try {
    const { leaderId } = req.body;
    const leader = await User.findById(leaderId);
    if (!leader) return res.status(404).json({ success: false, error: "Leader not found" });

    const messages = await Message.find({
      receiverId:leaderId,
      type:"PING",
      status:"PENDING",
    });

    //filter old messages > 5000ms
    const filtered_messaged = []
    for(let message of messages){
      if(Date.now() - message.timestamp <= 5000){
          filtered_messaged.push(message)
      }
      
    }

    // delete them after we send them to the leader 
    await Message.deleteMany({ _id: { $in: messages.map(m => m._id) } });


    return res.status(200).json({ success: true, messages:filtered_messaged });
  } catch (error) {
    console.error("check-leader-ping-messages Error", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// Leader reply to PING messages with ACK
router.post("/reply-leader-ack", requireLogin, async (req, res) => {
  try {
    const { senderId,receiverId,type } = req.body;
    const ACK_message = new Message({
      senderId,
      receiverId,
      type,
      status:"PENDING",
      timestamp: Date.now()
    });
    await ACK_message.save();
    return res.status(200).json({ success: true });


  } catch (error) {
    console.error("reply-leader-ack Error", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});




// Peer check for leader ACK
router.post("/check-leader-ack", requireLogin, async (req, res) => {
  try {
    const {userId} = req.body;
    
    const ACK = await Message.findOne({
      receiverId:userId,
      type:"ACK",
      status:"PENDING",
    });

    if (!ACK) {
          return res.status(200).json({ success: true, ACK: null });
        }

    // delete so we don't read it again
    await Message.deleteOne({ _id: ACK._id });
    return res.status(200).json({ success: true, ACK});

  } catch (error) {
    console.error("check-leader-ack Error", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////

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
