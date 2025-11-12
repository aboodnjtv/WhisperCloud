module.exports = {
    // Core gossip parameters
    fanout: 2,              // Gossip to 2 random peers
    gossipInterval: 5000,   // 5 seconds between rounds
    ttl: 7,                 // Max 7 rounds
    
    // Message tracking
    messageIdExpiry: 3600000,  // 1 hour (in ms)
    
    // Delivery tracking
    trackPropagation: true,     // Record message paths
    logDuplicates: true         // Log duplicate detections
};