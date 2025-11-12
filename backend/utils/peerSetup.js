const User = require('../models/user');

/**
 * Connect a user to random peers (BALANCED APPROACH)
 * Prevents star topology by preferring peers with fewer connections
 * @param {String} userId - User ID to connect
 * @param {Number} targetConnections - Target number of connections (default: 2)
 */
async function setupRandomPeers(userId, targetConnections = 2) {
    try {
        const MAX_CONNECTIONS_PER_PEER = 4; // Maximum connections any peer should have
        
        // Get the new user
        const newUser = await User.findById(userId);
        if (!newUser) {
            console.log('User not found');
            return;
        }
        
        // Get all existing peers (excluding self)
        const existingPeers = await User.find({
            _id: { $ne: userId },
            type: 'peer'
        });
        
        if (existingPeers.length === 0) {
            console.log('No existing peers to connect to (first peer in network)');
            return;
        }
        
        // Filter: Only peers that haven't reached max connections
        const availablePeers = existingPeers.filter(peer => 
            peer.peers.length < MAX_CONNECTIONS_PER_PEER &&
            !peer.peers.includes(userId) // Not already connected
        );
        
        if (availablePeers.length === 0) {
            console.log('⚠ All peers are at max connections. Connecting to least-connected peers.');
            // Fallback: connect to least-connected peers
            const sortedPeers = existingPeers
                .filter(p => !p.peers.includes(userId))
                .sort((a, b) => a.peers.length - b.peers.length);
            
            const connectCount = Math.min(targetConnections, sortedPeers.length);
            const selectedPeers = sortedPeers.slice(0, connectCount);
            await createConnections(newUser, selectedPeers);
            return;
        }
        
        // SMART SELECTION: Prefer peers with fewer connections (load balancing)
        const sortedByConnections = availablePeers.sort((a, b) => {
            // Primary sort: by number of connections (ascending)
            const diff = a.peers.length - b.peers.length;
            if (diff !== 0) return diff;
            
            // Secondary sort: random (for ties)
            return Math.random() - 0.5;
        });
        
        // Select from the least-connected peers
        const connectCount = Math.min(targetConnections, sortedByConnections.length);
        const selectedPeers = sortedByConnections.slice(0, connectCount);
        
        await createConnections(newUser, selectedPeers);
        
    } catch (error) {
        console.error('Error setting up random peers:', error);
    }
}

/**
 * Create bidirectional connections between user and selected peers
 */
async function createConnections(user, selectedPeers) {
    for (const peer of selectedPeers) {
        // Add peer to user's list
        await User.findByIdAndUpdate(user._id, {
            $addToSet: { peers: peer._id }
        });
        
        // Add user to peer's list (bidirectional)
        await User.findByIdAndUpdate(peer._id, {
            $addToSet: { peers: user._id }
        });
        
        console.log(`✓ Connected: ${user.name} ←→ ${peer.name} (peer now has ${peer.peers.length + 1} connections)`);
    }
    
    console.log(`✓ ${user.name} successfully connected to ${selectedPeers.length} peers`);
}

/**
 * Rebalance network connections (optional maintenance function)
 * Call this periodically to maintain balanced topology
 */
async function rebalanceNetwork() {
    const MAX_CONNECTIONS = 4;
    const MIN_CONNECTIONS = 2;
    
    try {
        const peers = await User.find({ type: 'peer' });
        
        console.log('=== Network Rebalance Starting ===');
        
        // Find under-connected peers
        const underConnected = peers.filter(p => p.peers.length < MIN_CONNECTIONS);
        
        for (const peer of underConnected) {
            console.log(`⚠ ${peer.name} has only ${peer.peers.length} connections`);
            
            // Find available peers (not at max, not already connected)
            const available = peers.filter(p => 
                p._id.toString() !== peer._id.toString() &&
                p.peers.length < MAX_CONNECTIONS &&
                !peer.peers.includes(p._id) &&
                !p.peers.includes(peer._id)
            );
            
            if (available.length === 0) continue;
            
            // Connect to least-connected available peer
            const sorted = available.sort((a, b) => a.peers.length - b.peers.length);
            const target = sorted[0];
            
            peer.peers.push(target._id);
            target.peers.push(peer._id);
            
            await peer.save();
            await target.save();
            
            console.log(`✓ Connected ${peer.name} ←→ ${target.name}`);
        }
        
        console.log('=== Network Rebalance Complete ===');
        
    } catch (error) {
        console.error('Error rebalancing network:', error);
    }
}

/**
 * Get network statistics
 */
async function getNetworkStats() {
    try {
        const peers = await User.find({ type: 'peer' });
        
        const stats = {
            totalPeers: peers.length,
            avgConnections: 0,
            minConnections: Infinity,
            maxConnections: 0,
            distribution: {}
        };
        
        let totalConnections = 0;
        
        for (const peer of peers) {
            const count = peer.peers.length;
            totalConnections += count;
            
            stats.minConnections = Math.min(stats.minConnections, count);
            stats.maxConnections = Math.max(stats.maxConnections, count);
            
            stats.distribution[count] = (stats.distribution[count] || 0) + 1;
        }
        
        stats.avgConnections = (totalConnections / peers.length).toFixed(2);
        
        return stats;
        
    } catch (error) {
        console.error('Error getting network stats:', error);
        return null;
    }
}

module.exports = { 
    setupRandomPeers, 
    rebalanceNetwork,
    getNetworkStats
};