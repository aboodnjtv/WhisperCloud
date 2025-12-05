const mongoose = require("mongoose")
const { Schema } = mongoose

// Message model simulates inter-node communication in the distributed system.
// Each document represents a single message passed between peers.
const messageSchema = new mongoose.Schema({
  // Type of message — flexible to support various protocols.
  // Examples: "ELECTION", "COORDINATOR", "GOSSIP", "BROADCAST", "REPLY", etc.
  type: {
    type: String,
    required: true,
  },

  // Sender node (the user or peer initiating the message)
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Receiver node (the target peer, leader, or admin)
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Optional payload — stores any custom data the message carries
  // (e.g., election info, gossip content, coordinator notice, etc.)
  payload: {
    type: Schema.Types.Mixed,
    default: {},
  },

  // Message status — used to track lifecycle of the message.
  // PENDING: not yet read
  // READ: received/read by the target node
  // REPLIED: sender has received a reply
  status: {
    type: String,
    enum: ["PENDING", "READ", "REPLIED"],
    default: "PENDING",
  },

  // Timestamp for when the message was created (for ordering, timeouts, etc.)
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Message", messageSchema);
