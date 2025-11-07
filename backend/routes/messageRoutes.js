// a rotue to update users last-seen to current time
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Message = require("../models/message");
const requireLogin = require("../middleware/requireLogin");

// a route to ping leader
// it sends a messages to the leader to ask for its last-seen
router.post("/send", requireLogin, async (req, res) => {
  try {
    const { type,senderId,receiverId,payload,status,timestamp } = req.body;
    const message = new Message({
      type,
      senderId,
      receiverId,
      payload,
      status,
      timestamp
    })
    await message.save();
    return res.status(200).json({ success: true});

  } catch (error) {
    console.error("/send error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});



// // returns any PENDING messages to the leader
// router.post("/check-leader-ping-messages", requireLogin, async (req, res) => {
//   try {
//     const { leaderId } = req.body;
//     const leader = await User.findById(leaderId);
//     if (!leader) return res.status(404).json({ success: false, error: "Leader not found" });

//     const messages = await Message.find({
//       receiverId:leaderId,
//       type:"PING",
//       status:"PENDING",
//     });

//     //filter old messages > 5000ms
//     const filtered_messaged = []
//     for(let message of messages){
//       if(Date.now() - message.timestamp <= 5000){
//           filtered_messaged.push(message)
//       }
      
//     }

//     // delete them after we send them to the leader 
//     await Message.deleteMany({ _id: { $in: messages.map(m => m._id) } });


//     return res.status(200).json({ success: true, messages:filtered_messaged });
//   } catch (error) {
//     console.error("check-leader-ping-messages Error", error);
//     return res.status(500).json({ success: false, error: "Server error" });
//   }
// });


// a route to listen for any messages
router.post("/listen", requireLogin, async (req, res) => {
  try {
    const {type,senderId,receiverId} = req.body;
    
    const messages = await Message.find({
        type,
        senderId,
        receiverId,
    });

    if (messages.length === 0) {
          return res.status(200).json({ success: true, messages: [] });
    }

    // delete messages so we don't read it again
    await Message.deleteMany({ _id: { $in: messages.map(m => m._id) } });

    return res.status(200).json({ success: true, messages});

  } catch (error) {
    console.error("/listen Error", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});


module.exports = router;
