const express = require('express');
const router = express.Router();
const User = require('../models/user');
const requireLogin = require('../middleware/requireLogin');
const apiFetcher = require('../services/apiFetcher');

/**
 * Get MY messages (for gossip propagation)
 */
router.get('/gossip/my-messages', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.json({ success: false, messages: [] });
        }

        // Return messages that should be gossiped
        // These are messages I received that still have TTL > 0
        const gossipableMessages = user.messages
            .filter(msg => msg.ttl && msg.ttl > 0)
            .map(msg => ({
                messageId: msg.messageId,
                pageId: msg.page,
                pageName: msg.pageName || 'Unknown',
                content: msg.content,
                ttl: msg.ttl,
                timestamp: msg.timestamp
            }));

        res.json({
            success: true,
            messages: gossipableMessages
        });

    } catch (error) {
        console.error('Error fetching my messages:', error);
        res.json({ success: false, messages: [] });
    }
});

/**
 * Get MY peer connections
 */
router.get('/gossip/my-peers', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId).populate('peers', '_id name isOnline lastSeen');

        if (!user) {
            return res.json({ success: false, peers: [] });
        }

        // Calculate online status based on lastSeen
        const ONLINE_THRESHOLD_MS = 30000; // 30 seconds
        const now = Date.now();
        
        const peersWithOnlineStatus = (user.peers || []).map(peer => {
            const timeSinceLastSeen = now - new Date(peer.lastSeen).getTime();
            const isActuallyOnline = timeSinceLastSeen < ONLINE_THRESHOLD_MS;
            
            return {
                _id: peer._id,
                name: peer.name,
                isOnline: isActuallyOnline,  // ← Computed, not from DB
                lastSeen: peer.lastSeen
            };
        });

        res.json({
            success: true,
            peers: peersWithOnlineStatus
        });

    } catch (error) {
        console.error('Error fetching my peers:', error);
        res.json({ success: false, peers: [] });
    }
});

/**
 * RECEIVE a gossip message (peer-to-peer)
 */
router.post('/gossip/send', requireLogin, async (req, res) => {
    try {
        const { receiverId, pageId, pageName, messageId, content, ttl } = req.body;

        // Check TTL
        if (ttl <= 0) {
            return res.json({ success: false, reason: 'TTL_EXPIRED' });
        }

        // Get receiver
        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.json({ success: false, reason: 'RECEIVER_NOT_FOUND' });
        }

        // Check for duplicate
        const duplicate = receiver.messages.some(msg => msg.messageId === messageId);

        if (duplicate) {
            return res.json({ success: false, reason: 'DUPLICATE' });
        }

        // Store message
        receiver.messages.push({
            messageId,
            page: pageId,
            pageName,
            content,
            ttl, // Store TTL so receiver can continue gossiping
            timestamp: new Date(),
            receivedVia: 'GOSSIP'
        });

        await receiver.save();

        console.log(`[DELIVERED] ${receiver.name} received ${messageId}`);

        res.json({ success: true });

    } catch (error) {
        console.error('Error delivering gossip:', error);
        res.json({ success: false, reason: 'SERVER_ERROR' });
    }
});

/**
 * LEADER: Fetch from pages and store (initiates gossip)
 */
router.post('/gossip/leader-fetch', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        // Verify leader
        if (!user.isLeader) {
            return res.status(403).json({ success: false, error: 'Not leader' });
        }

        // Fetch from all pages
        const pageUpdates = await apiFetcher.fetchAllPages();

        // Store each update in leader's messages with full TTL
        for (const update of pageUpdates) {
            // Check if already have this message
            const exists = user.messages.some(msg => msg.messageId === update.messageId);
            
            if (!exists) {
                user.messages.push({
                    messageId: update.messageId,
                    page: update.pageId,
                    pageName: update.pageName,
                    content: update.content,
                    ttl: 7, // Full TTL for fresh messages
                    timestamp: new Date(),
                    receivedVia: 'LEADER_FETCH'
                });
            }
        }

        await user.save();

        console.log(`[LEADER] Fetched ${pageUpdates.length} page updates`);

        res.json({
            success: true,
            messagesCount: pageUpdates.length
        });

    } catch (error) {
        console.error('Leader fetch error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;