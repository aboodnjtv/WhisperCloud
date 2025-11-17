// Only run for logged-in peers (not admins)
if (window.user && window.user.type === 'peer') {
    
    const GOSSIP_CHECK_INTERVAL = 5000; // Check every 5 seconds
    const FANOUT = 2; // Gossip to 2 random peers
    const MAX_TTL = 7;

    // Track what messages I've already gossiped
    const gossipedMessages = new Set();

    /**
     * Main gossip loop - runs continuously on each peer
     */
    async function runGossipCycle() {
        try {
            // STEP 1: Check if I have any new messages to gossip
            const newMessages = await getMyUnGossipedMessages();
            
            if (newMessages.length === 0) {
                // Nothing to gossip, check again later
                setTimeout(runGossipCycle, GOSSIP_CHECK_INTERVAL);
                return;
            }

            console.log(`[GOSSIP] Found ${newMessages.length} new messages to propagate`);

            // STEP 2: For each new message, gossip to my peers
            for (const message of newMessages) {
                await gossipMessageToMyPeers(message);
                
                // Mark as gossiped so I don't send it again
                gossipedMessages.add(message.messageId);
            }

        } catch (error) {
            console.error('[GOSSIP] Error in gossip cycle:', error);
        }

        // Schedule next cycle
        setTimeout(runGossipCycle, GOSSIP_CHECK_INTERVAL);
    }

    /**
     * Get messages from MY database that I haven't gossiped yet
     */
    async function getMyUnGossipedMessages() {
        try {
            const response = await fetch('/gossip/my-messages', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            
            if (!data.success) return [];

            // Filter out messages I've already gossiped
            const unGossiped = data.messages.filter(msg => 
                !gossipedMessages.has(msg.messageId) &&
                msg.ttl > 0 // Only gossip if TTL not expired
            );

            return unGossiped;

        } catch (error) {
            console.error('[GOSSIP] Error fetching my messages:', error);
            return [];
        }
    }

    /**
     * Gossip a message to my peers
     */
    async function gossipMessageToMyPeers(message) {
        try {
            // Get my peer connections
            const response = await fetch('/gossip/my-peers', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            
            if (!data.success || !data.peers || data.peers.length === 0) {
                console.log('[GOSSIP] No peers to gossip to');
                return;
            }

            // Filter to only online peers
            const onlinePeers = data.peers.filter(p => p.isOnline);

            if (onlinePeers.length === 0) {
                console.log('[GOSSIP] No online peers');
                return;
            }

            // Select random peers (fanout)
            const selectedPeers = selectRandomPeers(onlinePeers, FANOUT);

            console.log(`[GOSSIP] Gossiping message ${message.messageId} to ${selectedPeers.length} peers`);

            // Send gossip message to each selected peer
            for (const peer of selectedPeers) {
                await sendGossipMessage(peer._id, message);
            }

        } catch (error) {
            console.error('[GOSSIP] Error gossiping to peers:', error);
        }
    }

    /**
     * Send a gossip message to a specific peer
     */
    async function sendGossipMessage(peerId, message) {
        try {
            const response = await fetch('/gossip/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: peerId,
                    pageId: message.pageId,
                    pageName: message.pageName,
                    messageId: message.messageId,
                    content: message.content,
                    ttl: message.ttl - 1 // Decrement TTL
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log(`[GOSSIP] ✓ Gossiped to peer ${peerId}`);
            } else {
                console.log(`[GOSSIP] ✗ Failed to gossip to peer ${peerId}: ${data.reason}`);
            }

        } catch (error) {
            console.error(`[GOSSIP] Error sending to peer ${peerId}:`, error);
        }
    }

    /**
     * Select random peers (Fisher-Yates shuffle)
     */
    function selectRandomPeers(peers, count) {
        if (peers.length <= count) return peers;
        
        const shuffled = [...peers].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    /**
     * Check if I'm the leader (for initiating gossip from pages)
     */
    async function leaderFetchAndInitiate() {
        if (!window.user.isLeader) return;

        try {
            console.log('[LEADER] Fetching from pages...');

            const response = await fetch('/gossip/leader-fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                console.log(`[LEADER] Fetched ${data.messagesCount} new page updates`);
                // These will be gossiped in the next cycle
            }

        } catch (error) {
            console.error('[LEADER] Error fetching from pages:', error);
        }
    }

    // If leader, fetch from pages periodically
    if (window.user.isLeader) {
        setInterval(leaderFetchAndInitiate, 30000); // Every 30 seconds
        leaderFetchAndInitiate(); // Run immediately
    }

    // Start the gossip cycle
    console.log('[GOSSIP] Starting distributed gossip protocol');
    runGossipCycle();
}