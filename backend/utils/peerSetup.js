async function setupRandomPeers(userId, targetConnections = 2) {
    const MAX_CONNECTIONS_PER_PEER = 4;
    
    // STEP 1: Get the new user
    const newUser = await User.findById(userId);
    
    // STEP 2: Get all existing peers (excluding self)
    const existingPeers = await User.find({
        _id: { $ne: userId },
        type: 'peer'
    });
    
    if (existingPeers.length === 0) {
        console.log('First peer in network - no connections to make');
        return;
    }
    
    // STEP 3: Filter - Only peers that aren't full
    const availablePeers = existingPeers.filter(peer => 
        peer.peers.length < MAX_CONNECTIONS_PER_PEER &&
        !peer.peers.includes(userId) // Not already connected
    );
    
    // STEP 4: CRITICAL - Sort by connection count (ascending)
    // This creates LOAD BALANCING
    const sortedByConnections = availablePeers.sort((a, b) => {
        const diff = a.peers.length - b.peers.length;
        if (diff !== 0) return diff; // Primary: by connection count
        return Math.random() - 0.5;   // Secondary: random (for ties)
    });
    
    // STEP 5: Select from the LEAST-connected peers
    const connectCount = Math.min(targetConnections, sortedByConnections.length);
    const selectedPeers = sortedByConnections.slice(0, connectCount);
    
    // STEP 6: Create BIDIRECTIONAL connections
    for (const peer of selectedPeers) {
        // Add peer to new user's list
        await User.findByIdAndUpdate(newUser._id, {
            $addToSet: { peers: peer._id }
        });
        
        // Add new user to peer's list (BIDIRECTIONAL)
        await User.findByIdAndUpdate(peer._id, {
            $addToSet: { peers: newUser._id }
        });
        
        console.log(`✓ Connected: ${newUser.name} ←→ ${peer.name}`);
    }
}