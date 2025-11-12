const express = require('express');
const router = express.Router();
const requireLogin = require('../middleware/requireLogin');
const gossipService = require('../services/gossipService');
const apiFetcher = require('../services/apiFetcher');
const User = require('../models/user');

/**
 * Leader fetches from pages and starts gossip
 */
router.post("/gossip/fetch-and-start", requireLogin, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        
        // Verify user is leader
        if (!user.isLeader) {
            return res.status(403).json({
                success: false,
                error: 'Only leader can initiate gossip'
            });
        }
        
        console.log(`[LEADER] ${user.name} fetching from pages...`);
        
        // Fetch latest data from all pages
        const pageUpdates = await apiFetcher.fetchAllPages();
        
        if (pageUpdates.length === 0) {
            return res.json({
                success: true,
                messagesCount: 0
            });
        }
        
        // For each page update, start gossip
        for (const update of pageUpdates) {
            const messageData = {
                messageId: update.messageId,
                page: update.pageId,
                content: update.content,
                round: 0,
                timestamp: new Date()
            };
            
            // Leader starts gossip
            await gossipService.gossip(userId, messageData);
        }
        
        console.log(`[LEADER] Initiated gossip for ${pageUpdates.length} updates`);
        
        res.json({
            success: true,
            messagesCount: pageUpdates.length
        });
        
    } catch (error) {
        console.error('Fetch and gossip error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch and gossip'
        });
    }
});

/**
 * View my peers - DEBUG VERSION
 */
router.get("/peers", requireLogin, async (req, res) => {
    console.log('======= PEERS ROUTE CALLED =======');
    console.log('Step 1: Route entered');
    
    try {
        console.log('Step 2: Getting user ID from session');
        const userId = req.session.user._id;
        console.log('User ID:', userId);
        
        console.log('Step 3: Finding user in database');
        const user = await User.findById(userId);
        console.log('User found:', user ? user.name : 'NOT FOUND');
        
        if (!user) {
            console.log('ERROR: User not found, redirecting');
            return res.redirect('/login');
        }
        
        console.log('Step 4: Populating peers');
        console.log('Peers before populate:', user.peers);
        await user.populate('peers', 'name email isOnline');
        console.log('Peers after populate:', user.peers ? user.peers.length : 0);
        
        console.log('Step 5: Rendering page');
        
        // DON'T render template yet - just send simple HTML
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Peers Debug</title>
                <style>
                    body { font-family: Arial; padding: 2rem; background: #f0f9ff; }
                    .card { background: white; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
                    pre { background: #f3f4f6; padding: 1rem; overflow: auto; }
                </style>
            </head>
            <body>
                <h1>Peers Debug Page</h1>
                <div class="card">
                    <h2>User Info</h2>
                    <p><strong>Name:</strong> ${user.name}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Type:</strong> ${user.type}</p>
                    <p><strong>Is Leader:</strong> ${user.isLeader}</p>
                </div>
                
                <div class="card">
                    <h2>Peers (${user.peers ? user.peers.length : 0})</h2>
                    ${user.peers && user.peers.length > 0 ? 
                        user.peers.map(p => `
                            <div style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb;">
                                <strong>${p.name}</strong> - ${p.email} 
                                <span style="color: ${p.isOnline ? 'green' : 'red'}">
                                    ${p.isOnline ? '🟢 Online' : '🔴 Offline'}
                                </span>
                            </div>
                        `).join('') 
                        : '<p>No peers connected yet.</p>'
                    }
                </div>
                
                <div class="card">
                    <h2>Actions</h2>
                    <button onclick="setupPeers()" style="padding: 0.8rem 1.5rem; background: #8b5cf6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Setup Peer Connections
                    </button>
                    <a href="/homepage" style="margin-left: 1rem; padding: 0.8rem 1.5rem; background: #6b7280; color: white; text-decoration: none; border-radius: 8px; display: inline-block;">
                        Back to Home
                    </a>
                </div>
                
                <script>
                async function setupPeers() {
                    try {
                        const btn = event.target;
                        btn.disabled = true;
                        btn.textContent = 'Setting up...';
                        
                        const response = await fetch('/peers/setup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            alert('✓ Peer connections established!');
                            window.location.reload();
                        } else {
                            alert('Failed: ' + (data.error || 'Unknown error'));
                            btn.disabled = false;
                            btn.textContent = 'Setup Peer Connections';
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        alert('Failed: ' + error.message);
                        event.target.disabled = false;
                        event.target.textContent = 'Setup Peer Connections';
                    }
                }
                </script>
            </body>
            </html>
        `);
        
        console.log('Step 6: Response sent successfully');
        
    } catch (error) {
        console.error('ERROR in peers route:', error);
        res.send(`
            <html>
            <body style="font-family: Arial; padding: 2rem;">
                <h1 style="color: red;">Error Loading Peers</h1>
                <pre>${error.message}</pre>
                <pre>${error.stack}</pre>
                <a href="/homepage">Back to Home</a>
            </body>
            </html>
        `);
    }
});

/**
 * Manually setup peer connections (for testing)
 */
router.post("/peers/setup", requireLogin, async (req, res) => {
    try {
        const { setupRandomPeers } = require('../utils/peerSetup');
        const userId = req.session.user._id;
        
        await setupRandomPeers(userId, 2);
        
        res.json({
            success: true,
            message: 'Peer connections established'
        });
    } catch (error) {
        console.error('Error setting up peers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to setup peers'
        });
    }
});

/**
 * Get network topology (for visualization)
 */
router.get("/network/topology", requireLogin, async (req, res) => {
    try {
        const users = await User.find({ type: 'peer' })
            .select('name email peers isLeader isOnline')
            .populate('peers', 'name');
        
        res.json({
            success: true,
            nodes: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get topology'
        });
    }
});

module.exports = router;