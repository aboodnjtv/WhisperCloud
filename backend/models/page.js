const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  // API details
  apiUrl: {
    type: String,
    required: true,
    trim: true
  },
  apiKey: {
    type: String, // optional if the API needs authentication
    default: null
  },

  // Latest message from the API
  message: {
    messageId: { type: String, required: true }, // unique message identifier
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },

  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const Page = mongoose.model('Page', pageSchema);
module.exports = Page;