const User = require('../models/user');
const Message = require('../models/message');
const gossipConfig = require('../config/gossipConfig');

class GossipService {
    constructor() {
        this.fanout = gossipConfig.fanout;
        this.gossipInterval = gossipConfig.gossipInterval;
        this.ttl = gossipConfig.ttl;
    }

    /**
     * Main gossip function - propagate message to random peers
     */
    async gossip(senderId, messageData) {
        try {
            const sender = await User.findById(senderId).populate('peers');
            
            if (!sender || !sender.peers || sender.peers.length === 0) {
                console.log('No peers to gossip to');
                return;
            }
            
            // Filter online peers
            const onlinePeers = sender.peers.filter(p => p.isOnline);
            
            if (onlinePeers.length === 0) {
                console.log('No online peers available');
                return;
            }
            
            // Select random subset (fanout)
            const selectedPeers = this.selectRandomPeers(onlinePeers, this.fanout);
            
            console.log(`[GOSSIP] ${sender.name} gossiping to ${selectedPeers.length} peers`);
            
            // Send to each selected peer
            for (const peer of selectedPeers) {
                const success = await this.sendToPeer(peer, messageData, senderId);
                
                if (success) {
                    console.log(`✓ Gossiped to ${peer.name}`);
                } else {
                    console.log(`✗ Duplicate for ${peer.name}`);
                }
            }
            
        } catch (error) {
            console.error('Gossip error:', error);
        }
    }

    /**
     * Send message to a specific peer (using Message model for duplicate detection)
     */
    async sendToPeer(peer, messageData, senderId) {
        try {
            // Check if this exact message was already sent to this peer
            const existingMessage = await Message.findOne({
                type: 'GOSSIP',
                senderId: senderId,
                receiverId: peer._id,
                'payload.messageId': messageData.messageId
            });
            
            if (existingMessage) {
                console.log(`[DUPLICATE] ${peer.name} already received ${messageData.messageId}`);
                return false;
            }
            
            // Create gossip message record
            await Message.create({
                type: 'GOSSIP',
                senderId: senderId,
                receiverId: peer._id,
                payload: {
                    messageId: messageData.messageId,
                    page: messageData.page,
                    content: messageData.content,
                    round: messageData.round
                },
                status: 'PENDING',
                timestamp: Date.now()
            });
            
            // Add message to peer's messages array
            const peerUser = await User.findById(peer._id);
            peerUser.messages.push({
                messageId: messageData.messageId,
                page: messageData.page,
                content: messageData.content,
                timestamp: new Date()
            });
            await peerUser.save();
            
            console.log(`[DELIVERED] ${peer.name} received ${messageData.messageId}`);
            
            // Schedule next gossip round for this peer
            setTimeout(() => {
                if (messageData.round < this.ttl) {
                    this.gossip(peer._id, {
                        ...messageData,
                        round: messageData.round + 1
                    });
                }
            }, this.gossipInterval);
            
            return true;
            
        } catch (error) {
            console.error('Error sending to peer:', error);
            return false;
        }
    }

    /**
     * Select random peers from array
     */
    selectRandomPeers(peers, count) {
        const shuffled = [...peers].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, peers.length));
    }

    /**
     * Generate unique message ID
     */
    generateMessageId(userId) {
        return `msg_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = new GossipService();