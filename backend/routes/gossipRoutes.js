const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Page = require("../models/page");
const requireLogin = require("../middleware/requireLogin");
const apiFetcher = require("../services/apiFetcher");

// ============================================
// 1. CHECK IF LEADER
// ============================================
router.get('/gossip/am-i-leader', requireLogin, async (req, res) => {
    try {
        if (!req.session?.user?._id) {
            return res.json({ success: false, isLeader: false });
        }

        const user = await User.findById(req.session.user._id);
        
        if (!user) {
            return res.json({ success: false, isLeader: false });
        }

        res.json({
            success: true,
            isLeader: user.isLeader || false,
            userName: user.name
        });

    } catch (error) {
        console.error('[AM I LEADER] Error:', error);
        res.json({ success: false, isLeader: false });
    }
});

// ============================================
// 2. LEADER FETCH FROM PAGES
// ============================================
router.post('/gossip/leader-fetch', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        if (!user || !user.isLeader) {
            return res.status(403).json({ 
                success: false, 
                error: 'Not leader' 
            });
        }

        console.log('[LEADER FETCH] Fetching from external APIs...');
        const pageUpdates = await apiFetcher.fetchAllPages();

        if (pageUpdates.length === 0) {
            return res.json({
                success: true,
                messagesCount: 0
            });
        }

        let newMessagesCount = 0;

        for (const update of pageUpdates) {
            const exists = user.messages.some(msg => 
                msg.messageId === update.messageId
            );
            
            if (!exists) {
                user.messages.push({
                    messageId: update.messageId,
                    page: update.pageId,
                    pageName: update.pageName,
                    content: update.content,
                    ttl: 7,
                    timestamp: update.timestamp,
                    receivedVia: 'LEADER_FETCH'
                });
                newMessagesCount++;
            }
        }

        if (newMessagesCount > 0) {
            await user.save();
            console.log(`[LEADER FETCH] ✅ ${user.name} fetched ${newMessagesCount} new messages`);
        } else {
            console.log(`[LEADER FETCH] ${user.name} - no new messages`);
        }

        res.json({
            success: true,
            messagesCount: newMessagesCount
        });

    } catch (error) {
        console.error('[LEADER FETCH] Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// 3. GET MY MESSAGES
// ============================================
router.get('/gossip/my-messages', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        res.json({
            success: true,
            messages: user.messages || []
        });

    } catch (error) {
        console.error('[MY MESSAGES] Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// 4. GET MY PEERS
// ============================================
router.get('/gossip/my-peers', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId).populate('peers', 'name lastSeen');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const ONLINE_THRESHOLD_MS = 30000;
        const now = Date.now();
        
        const peersWithOnlineStatus = (user.peers || []).map(peer => {
            const timeSinceLastSeen = now - new Date(peer.lastSeen).getTime();
            const isActuallyOnline = timeSinceLastSeen < ONLINE_THRESHOLD_MS;
            
            return {
                _id: peer._id,
                name: peer.name,
                isOnline: isActuallyOnline,
                lastSeen: peer.lastSeen
            };
        });

        res.json({ 
            success: true, 
            peers: peersWithOnlineStatus 
        });

    } catch (error) {
        console.error('[MY PEERS] Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// 5. SEND MESSAGE TO PEER (GOSSIP)
// ============================================
router.post('/gossip/send', requireLogin, async (req, res) => {
    try {
        const { receiverId, messageId, content, ttl, pageName } = req.body;

        if (ttl <= 0) {
            return res.json({ 
                success: false, 
                error: 'TTL expired' 
            });
        }

        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({ 
                success: false, 
                error: 'Receiver not found' 
            });
        }

        const exists = receiver.messages.some(msg => 
            msg.messageId === messageId
        );

        if (exists) {
            return res.json({ 
                success: true, 
                note: 'Duplicate message, skipped' 
            });
        }

        receiver.messages.push({
            messageId,
            content,
            ttl,
            pageName,
            timestamp: new Date(),
            receivedVia: 'GOSSIP'
        });

        await receiver.save();

        console.log(`[DELIVERED] ${receiver.name} received ${messageId.substring(0, 20)}... (TTL=${ttl})`);

        res.json({ success: true });

    } catch (error) {
        console.error('[GOSSIP SEND] Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// 6. UPDATE LAST SEEN (HEARTBEAT) 
// ============================================
router.post('/check-last-seen', requireLogin, async (req, res) => {
    try {
        if (!req.session?.user?._id) {
            console.log('⚠️  No session user ID');
            return res.status(401).json({ 
                success: false, 
                error: 'No valid session' 
            });
        }

        const userId = req.session.user._id;
        
        await User.findByIdAndUpdate(userId, {
            lastSeen: new Date()
        });
        res.status(200).json({ success: true });  

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});
// ============================================
// EXPORT ROUTER - MUST BE LAST LINE
// ============================================
module.exports = router;