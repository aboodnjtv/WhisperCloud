// a rotue to update users last-seen to current time
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Message = require("../models/message");
const requireLogin = require("../middleware/requireLogin");

// A route to send messages 
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

// a route to listen for any messages
router.post("/listen", requireLogin, async (req, res) => {
  try {
    const {type,senderId,receiverId} = req.body;
    const filter = { type };
    if (senderId) filter.senderId = senderId;
    if (receiverId) filter.receiverId = receiverId;

    const messages = await Message.find(filter);

    if (messages.length === 0) {
          return res.status(200).json({ success: true, messages: [] });
    }

    // delete messages so we don't read it again
    await Message.deleteMany({ _id: { $in: messages.map(m => m._id) } });

    //filter old messages > 20000ms
    const filtered_messaged = []
    for(let message of messages){
      if(Date.now() - message.timestamp <= 100000){
          filtered_messaged.push(message)
      }
    }
    return res.status(200).json({ success: true, messages:filtered_messaged});

  } catch (error) {
    console.error("/listen Error", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});


module.exports = router;
