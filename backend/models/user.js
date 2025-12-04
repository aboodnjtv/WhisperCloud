const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  password: {
    type: String,
    required: true
  },

   // Message identifiers for tracking
  bcastId:{ type: Number, default: null }, //used for broadcast
  whisId: { type: String, default: null }, // used for gossip / leader election (same as _id)

  // Node role in the system
  type: {
    type: String,
    enum: ['admin', 'peer'], // admin = introducer/server, peer = regular node
    default: 'peer'
  },

  // Network / gossip-related
  subscribedPages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Page' }],
  peers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  isLeader: { type: Boolean, default: false }, // global leader flag
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // the id of the admin

  // Messages received from pages (latest per page)
  messages: [
    {
      messageId: { type: String, required: true },
      page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page' },
      pageName: { type: String },
      content: { type: String, required: true },
      ttl: { type: Number, default: 7 },
      timestamp: { type: Date, default: Date.now },
      receivedVia: { type: String, enum: ['LEADER_FETCH', 'GOSSIP', 'BROADCAST'], default: 'GOSSIP' }
    }
  ],

  broadcastMessages: [
    {
      messageId: { type: String, required: true, unique: true},
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  createdAt: { type: Date, default: Date.now }

});

const User = mongoose.model("User",userSchema);
module.exports = User;
